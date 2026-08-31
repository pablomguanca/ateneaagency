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

// Se acepta solo lo que conocemos; cualquier otro campo del body se descarta.
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

// Freno básico por IP. Es best-effort: cada instancia serverless tiene su
// propia memoria, así que no reemplaza a un rate limit real, pero corta
// los envíos repetidos que caen en la misma instancia tibia.
//
// Solo cuenta los envíos que salieron: si contara también los rechazos por
// validación, alguien que se equivoca tres veces al tipear su mail quedaría
// bloqueado. Y si no se puede identificar la IP no se aplica el freno, para
// no meter a todo el tráfico en un mismo balde compartido.
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

// El checkbox desmarcado ni siquiera viaja en el FormData, así que basta con
// reconocer las formas afirmativas que puede tomar cuando sí viene.
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

/**
 * Alta en la lista de Brevo. `updateEnabled` evita el 409 cuando alguien que
 * ya está en la lista vuelve a consultar: en vez de fallar, actualiza.
 *
 * Los atributos tienen que existir antes en Brevo (Contactos → Configuración
 * → Atributos). Si falta alguno, la API devuelve 400 y el detalle queda en
 * el log de la función.
 */
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

/**
 * Confirmación para el interesado. Es un solo mail, no dos: si además se
 * suscribió, se le agrega el párrafo de la lista en vez de mandarle otro
 * correo simultáneo. El reply-to apunta a la agencia, así una respuesta a
 * esta confirmación llega a la bandeja correcta.
 */
async function sendWelcomeEmail(apiKey, data, suscripto) {
  const nombre = data.nombre.split(' ')[0];

  const parrafos = [
    `Hola ${nombre}, gracias por escribirnos.`,
    'Recibimos tu consulta y te respondemos dentro de las 24 horas hábiles para coordinar la llamada.'
  ];

  if (suscripto) {
    parrafos.push(
      'Además te sumamos a nuestra lista de novedades sobre marketing inmobiliario. ' +
      'Si preferís no recibirlas, respondé este mail y te damos de baja.'
    );
  }

  parrafos.push('Pablo y Carolina — Atenea Agency');

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
      text: parrafos.join('\n\n'),
      html: parrafos
        .map(p => `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#111">${escapeHtml(p)}</p>`)
        .join('')
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

  // Honeypot: los bots completan todos los campos, incluido este que está
  // oculto. Se responde 200 para no darles señal de que fueron detectados.
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

  // El campo `contacto` de la landing de diagnóstico admite mail o teléfono,
  // así que se resuelve cuál de los dos es antes de validar.
  if (data.contacto) {
    const comoTelefono = data.contacto.replace(/[\s-]/g, '');

    if (EMAIL_RE.test(data.contacto)) {
      if (!data.email) data.email = data.contacto;
      delete data.contacto;
    } else if (PHONE_RE.test(comoTelefono)) {
      if (!data.telefono) data.telefono = comoTelefono;
      delete data.contacto;
    }
    // Si no es ni una cosa ni la otra se deja crudo: puede ser un Instagram
    // o un interno, y es preferible que llegue a descartarlo.
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

  // Permite responderle directo al interesado desde la bandeja de entrada.
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
      // Se loguea el detalle del proveedor, pero nunca se devuelve al cliente.
      console.error('[contact] Resend respondió', response.status, await response.text());
      return res.status(502).json({ error: 'No pudimos enviar el mensaje.' });
    }

    recordHit(ip);

    // A partir de acá el lead ya está a salvo en la bandeja de la agencia.
    // Todo lo que sigue es secundario y se aísla: si falla, se loguea y el
    // usuario igual ve la confirmación.
    const quiereSuscribirse = optedIn(body.suscripcion);

    // Refleja el alta que realmente ocurrió, no la intención: si Brevo falla,
    // el mail de bienvenida no puede decirle que quedó suscripto.
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
