/**
 * Recibe los formularios del sitio y los reenvía por mail vía Resend.
 *
 * La dirección de destino NO está en el código: sale de CONTACT_TO. Cuando
 * migren al mail corporativo, se cambia esa variable en Vercel y listo, sin
 * tocar el HTML ni volver a deployar.
 *
 * Además, si el usuario marcó el opt-in, da de alta el contacto en la lista
 * de Brevo y le manda un mail de confirmación. Ninguna de esas dos cosas
 * puede tumbar el aviso interno: lo único que no se puede perder es que la
 * consulta le llegue a la agencia, así que van aisladas y solo se loguean.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY  (obligatoria)  API key de Resend.
 *   CONTACT_TO      (opcional)     Destino. Por defecto, el Gmail de la agencia.
 *   CONTACT_FROM    (opcional)     Remitente. Tiene que ser de un dominio
 *                                  verificado en Resend para entregar bien.
 *   BREVO_API_KEY   (opcional)     API key de Brevo. Sin ella no se suscribe
 *                                  a nadie, pero el formulario sigue andando.
 *   BREVO_LIST_ID   (opcional)     ID numérico de la lista de Brevo.
 *
 * Sin dependencias a propósito: usa el fetch global de Node 18+, así el repo
 * se mantiene estático y sin package.json.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const BREVO_CONTACTS_ENDPOINT = 'https://api.brevo.com/v3/contacts';

const DEFAULT_TO = 'atenea.agency.1@gmail.com';
const DEFAULT_FROM = 'Atenea Agency <onboarding@resend.dev>';

const FIELDS = {
  nombre: { label: 'Nombre', max: 120 },
  email: { label: 'Email', max: 160 },
  telefono: { label: 'Teléfono', max: 20 },
  contacto: { label: 'Email o teléfono', max: 160 },
  proyecto: { label: 'Tipo de proyecto', max: 80 },
  servicio: { label: 'Qué está buscando', max: 140 },
  mensaje: { label: 'Mensaje', max: 4000 }
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PHONE_RE = /^\+?[0-9]{8,15}$/;

const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const hits = new Map();

function recentHits(ip) {
  const now = Date.now();
  return (hits.get(ip) || []).filter(t => now - t < RATE_LIMIT.windowMs);
}

function rateLimited(ip) {
  if (!ip) return false;
  return recentHits(ip).length >= RATE_LIMIT.max;
}

function recordHit(ip) {
  if (!ip) return;

  const fresh = recentHits(ip);
  fresh.push(Date.now());
  hits.set(ip, fresh);

  if (hits.size > 500) {
    for (const [key, stamps] of hits) {
      if (!recentHits(key).length) hits.delete(key);
      else hits.set(key, stamps);
    }
  }
}

function text(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function optedIn(value) {
  return ['si', 'sí', 'yes', 'true', 'on', '1'].includes(String(value).toLowerCase());
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function subscribeToBrevo(data, origen) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);

  if (!apiKey || !listId) {
    console.warn('[contact] Opt-in marcado, pero falta BREVO_API_KEY o BREVO_LIST_ID: no se dio de alta.');
    return false;
  }

  const response = await fetch(BREVO_CONTACTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      email: data.email,
      listIds: [listId],
      updateEnabled: true,
      attributes: {
        NOMBRE: data.nombre,
        TELEFONO: data.telefono || '',
        PROYECTO: data.proyecto || '',
        ORIGEN: origen
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Brevo respondió ${response.status}: ${await response.text()}`);
  }

  return true;
}

const MAIL = {
  fondo: '#06060A',
  tarjeta: '#0E0E18',
  panel: '#141222',
  borde: '#241F33',
  oro: '#C9A84C',
  oroClaro: '#E8C97A',
  marfil: '#F0EBE0',
  marfilTenue: '#9E9688'
};

const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',Times,serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const FONT_LINK = `<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap" rel="stylesheet">
<!--<![endif]-->
<!--[if mso]>
<style>
  .serif-brand { font-family: Georgia, 'Times New Roman', Times, serif !important; }
</style>
<![endif]-->`;

function welcomeTemplate(nombre, suscripto) {
  const parrafos = [
    'Recibimos tu consulta y ya la estamos leyendo.',
    'Te respondemos dentro de las 24 horas hábiles para coordinar una llamada y devolverte un primer análisis de tu proyecto.'
  ];

  const textoPlano = [
    `Hola ${nombre}, gracias por escribirnos.`,
    ...parrafos
  ];

  if (suscripto) {
    textoPlano.push(
      'Además te sumamos a nuestra lista de novedades sobre marketing inmobiliario. ' +
      'Si preferís no recibirlas, respondé este mail y te damos de baja.'
    );
  }

  textoPlano.push('Atenea Agency', 'ateneaagency.com.ar');

  const parrafoHtml = txt =>
    `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.75;color:${MAIL.marfilTenue}">${escapeHtml(txt)}</p>`;

  const bloqueLista = suscripto
    ? `<tr>
          <td style="padding:8px 32px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:${MAIL.panel};border-left:3px solid ${MAIL.oro}">
              <tr>
                <td style="padding:16px 20px">
                  <p style="margin:0 0 6px;font-family:${SANS};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${MAIL.oro}">Novedades</p>
                  <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.65;color:${MAIL.marfilTenue}">
                    Te sumamos a nuestra lista de contenido sobre marketing inmobiliario. Si preferís no recibirla, respondé este mail y te damos de baja.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recibimos tu consulta</title>
${FONT_LINK}
</head>
<body style="margin:0;padding:0;background-color:${MAIL.fondo}">

<!-- Texto de vista previa: se ve en la bandeja, no en el cuerpo del mail. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
  Recibimos tu consulta. Te respondemos dentro de las 24 horas hábiles.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${MAIL.fondo}">
  <tr>
    <td align="center" style="padding:32px 12px">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
            style="width:100%;max-width:600px;background-color:${MAIL.tarjeta};border:1px solid ${MAIL.borde}">

        <tr>
          <td align="center" style="padding:38px 32px 0">
            <div class="serif-brand" style="font-family:${SERIF};font-size:23px;letter-spacing:1px;color:${MAIL.marfil}">
              Atenea <span style="color:${MAIL.oro}">Agency</span>
            </div>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:18px 32px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="width:54px;height:2px;background-color:${MAIL.oro};font-size:0;line-height:0">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:30px 32px 0">
            <h1 class="serif-brand" style="margin:0 0 18px;font-family:${SERIF};font-size:27px;line-height:1.3;font-weight:normal;color:${MAIL.marfil}">
              Hola ${escapeHtml(nombre)},<br>gracias por escribirnos.
            </h1>
            ${parrafos.map(parrafoHtml).join('')}
          </td>
        </tr>

        ${bloqueLista}

        <tr>
          <td style="padding:26px 32px 0">
            <div style="height:1px;background-color:${MAIL.borde};font-size:0;line-height:0">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 38px">
            <p class="serif-brand" style="margin:0 0 4px;font-family:${SERIF};font-size:17px;color:${MAIL.marfil}">Atenea Agency</p>
            <p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.6;color:${MAIL.marfilTenue}">
              Marketing inmobiliario para desarrollos e inmobiliarias
            </p>
            <a href="https://ateneaagency.com.ar" style="font-family:${SANS};font-size:13px;color:${MAIL.oro};text-decoration:none">ateneaagency.com.ar</a>
          </td>
        </tr>

      </table>

      <p style="margin:18px 0 0;font-family:${SANS};font-size:11px;line-height:1.6;color:#7A736A">
        Recibís este mail porque completaste el formulario en ateneaagency.com.ar
      </p>

    </td>
  </tr>
</table>

</body>
</html>`;

  return { text: textoPlano.join('\n\n'), html };
}

/**
 * Confirmación para el interesado. Es un solo mail, no dos: si además se
 * suscribió, se le agrega el bloque de la lista en vez de mandarle otro
 * correo simultáneo. El reply-to apunta a la agencia, así una respuesta a
 * esta confirmación llega a la bandeja correcta.
 */
async function sendWelcomeEmail(apiKey, data, suscripto) {
  const nombre = data.nombre.split(' ')[0];
  const { text, html } = welcomeTemplate(nombre, suscripto);

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || DEFAULT_FROM,
      to: [data.email],
      reply_to: process.env.CONTACT_TO || DEFAULT_TO,
      subject: 'Recibimos tu consulta — Atenea Agency',
      text,
      html
    })
  });

  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] Falta la variable de entorno RESEND_API_KEY.');
    return res.status(500).json({ error: 'El formulario no está configurado.' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};

  if (text(body.website, 200)) {
    return res.status(200).json({ ok: true });
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '')).split(',')[0].trim();

  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Demasiados envíos seguidos. Probá de nuevo en unos minutos.' });
  }

  const data = {};
  for (const [key, config] of Object.entries(FIELDS)) {
    const value = text(body[key], config.max);
    if (value) data[key] = value;
  }

  if (data.contacto) {
    const comoTelefono = data.contacto.replace(/[\s-]/g, '');

    if (EMAIL_RE.test(data.contacto)) {
      if (!data.email) data.email = data.contacto;
      delete data.contacto;
    } else if (PHONE_RE.test(comoTelefono)) {
      if (!data.telefono) data.telefono = comoTelefono;
      delete data.contacto;
    }
  }

  const invalid = [];
  if (!data.nombre) invalid.push('nombre');
  if (data.email && !EMAIL_RE.test(data.email)) invalid.push('email');
  if (data.telefono && !PHONE_RE.test(data.telefono)) invalid.push('telefono');
  if (!data.email && !data.telefono && !data.contacto) invalid.push('contacto');

  if (invalid.length) {
    return res.status(400).json({ error: 'Faltan datos o son inválidos.', campos: invalid });
  }

  const origen = text(body.origen, 60) || 'sitio';
  const filas = Object.entries(FIELDS)
    .filter(([key]) => data[key])
    .map(([key, config]) => ({ label: config.label, value: data[key] }));

  const plano = [
    `Consulta nueva desde: ${origen}`,
    '',
    ...filas.map(f => `${f.label}: ${f.value}`)
  ].join('\n');

  const html = [
    `<h2 style="font-family:Georgia,serif;color:#06060A;margin:0 0 16px">Consulta nueva desde ${escapeHtml(origen)}</h2>`,
    '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">',
    ...filas.map(f => `<tr>` +
      `<td style="padding:6px 16px 6px 0;color:#6b6b6b;vertical-align:top;white-space:nowrap">${escapeHtml(f.label)}</td>` +
      `<td style="padding:6px 0;color:#111">${escapeHtml(f.value).replace(/\n/g, '<br>')}</td>` +
      `</tr>`),
    '</table>'
  ].join('');

  const payload = {
    from: process.env.CONTACT_FROM || DEFAULT_FROM,
    to: [process.env.CONTACT_TO || DEFAULT_TO],
    subject: `Consulta de ${data.nombre} — ${origen}`,
    text: plano,
    html
  };

  if (data.email) payload.reply_to = data.email;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('[contact] Resend respondió', response.status, await response.text());
      return res.status(502).json({ error: 'No pudimos enviar el mensaje.' });
    }

    recordHit(ip);

    const quiereSuscribirse = optedIn(body.suscripcion);

    let suscripto = false;

    if (quiereSuscribirse && !data.email) {
      console.warn('[contact] Opt-in marcado sin dirección de mail: no hay a qué suscribir.');
    }

    if (quiereSuscribirse && data.email) {
      try {
        suscripto = await subscribeToBrevo(data, origen);
      } catch (error) {
        console.error('[contact] No se pudo dar de alta en Brevo:', error);
      }
    }

    if (data.email) {
      try {
        await sendWelcomeEmail(apiKey, data, suscripto);
      } catch (error) {
        console.error('[contact] No se pudo enviar el mail de bienvenida:', error);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[contact] Error de red al llamar a Resend:', error);
    return res.status(502).json({ error: 'No pudimos enviar el mensaje.' });
  }
};