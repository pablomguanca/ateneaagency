/**
 * Gate de captura de la landing de diagnóstico: recibe un email solo, lo guarda
 * en la lista de Brevo, le manda el checklist a quien lo dejó y le avisa a la
 * agencia. Devuelve el contenido desbloqueado en la respuesta.
 *
 * La regla de oro acá es distinguir RECHAZO de AVERÍA:
 *
 *   Rechazo → el envío está mal (email inválido, demasiados intentos seguidos).
 *             Se responde error y el front NO desbloquea. La persona puede
 *             corregir y reintentar.
 *
 *   Avería  → algo nuestro se rompió (Brevo caído, API key mal cargada, Resend
 *             sin responder). Se responde 200 con `saved: false` y el front
 *             desbloquea igual. El visitante no tiene la culpa, y dejarlo afuera
 *             nos hace perder el lead entero además del mail.
 *
 * En toda avería el mail se loguea con el prefijo [lead-perdido], así queda
 * recuperable a mano desde los logs de Vercel aunque no haya llegado a Brevo.
 *
 * Los envíos salen por Resend; Brevo solo guarda contactos. La separación es a
 * propósito: si una campaña junta quejas de spam, no arrastra la reputación de
 * los mails que sí tienen que llegar. Es el mismo criterio que en `contact.js`.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY  (obligatoria)  API key de Resend. Sin ella no sale ningún
 *                                  mail, pero el checklist igual se desbloquea.
 *   CONTACT_FROM    (opcional)     Remitente. Tiene que ser de un dominio
 *                                  verificado en Resend para entregar bien.
 *   CONTACT_TO      (opcional)     Destino del aviso interno. Varios separados
 *                                  por coma.
 *   BREVO_API_KEY   (opcional)     Sin ella no se guarda a nadie, pero el gate
 *                                  sigue andando.
 *   BREVO_LIST_ID   (opcional)     ID numérico de la lista donde caen los mails.
 *
 * Sin dependencias, igual que el resto de `api/`.
 */

const { CHECKLIST } = require('./_lib/checklist.js');
const { checklistEmail, avisoInternoEmail } = require('./_lib/gate-mails.js');

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const BREVO_CONTACTS_ENDPOINT = 'https://api.brevo.com/v3/contacts';

const DEFAULT_TO = 'atenea.agency.1@gmail.com';
const DEFAULT_FROM = 'Atenea Agency <onboarding@resend.dev>';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

const ORIGEN_LABELS = {
  'diagnostico-checklist': 'Checklist de auto-diagnóstico — landing de diagnóstico'
};

// Cortafuegos best-effort contra envíos repetidos. Vercel puede levantar varias
// instancias, así que esto no es un rate limit exacto: frena el spam obvio desde
// una misma IP dentro de una instancia caliente, y nada más. Mismo criterio que
// en contact.js, con el tope más alto porque acá el envío cuesta un solo campo.
const RATE_LIMIT = { max: 8, windowMs: 10 * 60 * 1000 };
const hits = new Map();

function recentHits(ip) {
  const now = Date.now();
  return (hits.get(ip) || []).filter(stamp => now - stamp < RATE_LIMIT.windowMs);
}

function rateLimited(ip) {
  if (!ip) return false;
  return recentHits(ip).length >= RATE_LIMIT.max;
}

function recordHit(ip) {
  if (!ip) return;

  hits.set(ip, [...recentHits(ip), Date.now()]);

  if (hits.size > 500) {
    for (const key of [...hits.keys()]) {
      if (!recentHits(key).length) hits.delete(key);
    }
  }
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '');
  return value.split(',')[0].trim();
}

function text(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires'
  }).format(date);
}

function notifyRecipients() {
  const destinos = String(process.env.CONTACT_TO || '')
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);

  return destinos.length ? destinos : [DEFAULT_TO];
}

/** Deja el lead en los logs para poder rescatarlo a mano cuando el guardado falló. */
function logLostLead(email, origen, motivo) {
  console.error(`[lead-perdido] ${email} — origen: ${origen} — motivo: ${motivo}`);
}

async function postContact(body) {
  const response = await fetch(BREVO_CONTACTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (response.ok || response.status === 204) return { ok: true };

  const data = await response.json().catch(() => ({}));

  // El contacto ya existía: el mail igual está en la lista, así que lo damos por bueno.
  if (data.code === 'duplicate_parameter') return { ok: true };

  return { ok: false, code: data.code, message: data.message };
}

/**
 * Da de alta o actualiza el contacto en la lista configurada.
 *
 * Si Brevo rechaza los atributos —normalmente porque `ORIGEN` todavía no está
 * creado en la cuenta— reintenta con el email solo. Perder el atributo es
 * molesto; perder el lead, no lo queremos.
 */
async function upsertContact(email, origen) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[save-lead] Falta BREVO_API_KEY: no se guardó el contacto', email);
    return false;
  }

  const listId = Number(process.env.BREVO_LIST_ID);

  if (!listId) {
    console.warn('[save-lead] Falta BREVO_LIST_ID: no se guardó el contacto', email);
    return false;
  }

  const base = { email, listIds: [listId], updateEnabled: true };

  const primero = await postContact({ ...base, attributes: { ORIGEN: origen } });
  if (primero.ok) return true;

  console.warn(
    '[save-lead] Brevo rechazó los atributos, reintento con el email solo:',
    primero.code,
    primero.message
  );

  const reintento = await postContact(base);
  if (reintento.ok) return true;

  console.error('[save-lead] No se pudo guardar el contacto:', reintento.code, reintento.message);
  return false;
}

/**
 * Devuelve false —sin tirar— ante cualquier problema, y lo deja logueado. Acá
 * ningún mail es crítico: el checklist se desbloquea en la página igual, y el
 * email quedó guardado en Brevo (o en los logs).
 */
async function sendEmail({ to, replyTo, subject, html, text: plano }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[save-lead] Falta RESEND_API_KEY: no se envió', JSON.stringify(subject));
    return false;
  }

  const payload = {
    from: process.env.CONTACT_FROM || DEFAULT_FROM,
    to,
    subject,
    html,
    text: plano
  };

  if (replyTo) payload.reply_to = replyTo;

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
      console.error('[save-lead] Resend respondió', response.status, await response.text().catch(() => ''));
      return false;
    }

    return true;
  } catch (error) {
    console.error('[save-lead] Error de red al llamar a Resend:', error);
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};

  // Trampa para bots: si vino completo, se responde bien y no se hace nada.
  if (text(body.website, 200)) {
    return res.status(200).json({ ok: true, saved: false, checklist: CHECKLIST });
  }

  const ip = clientIp(req);

  // Rechazo: demasiados intentos seguidos desde la misma IP.
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Demasiados envíos seguidos. Probá de nuevo en unos minutos.' });
  }

  const email = text(body.email, 160).toLowerCase();

  // Rechazo: el dato está mal y la persona lo puede corregir.
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Email inválido.' });
  }

  const source = text(body.source, 60) || 'diagnostico-checklist';
  const origen = ORIGEN_LABELS[source] || source;

  recordHit(ip);

  try {
    // El alta va primero porque es el paso que captura el dato que de otro modo
    // se pierde: si después falla un envío, al menos el mail quedó en la lista.
    const guardado = await upsertContact(email, origen);

    if (!guardado) logLostLead(email, origen, 'Brevo no dio de alta el contacto');

    const bienvenida = checklistEmail();
    const aviso = avisoInternoEmail({ email, origen, fecha: formatDate(new Date()), guardado });

    // Los dos envíos van en paralelo y ninguno puede tumbar al otro ni a la
    // respuesta: sendEmail ya devuelve false en vez de tirar.
    const [enviado] = await Promise.all([
      sendEmail({
        to: [email],
        replyTo: notifyRecipients()[0],
        subject: bienvenida.subject,
        html: bienvenida.html,
        text: bienvenida.text
      }),
      sendEmail({
        to: notifyRecipients(),
        replyTo: email,
        subject: aviso.subject,
        html: aviso.html,
        text: aviso.text
      })
    ]);

    if (!enviado) console.error('[save-lead] No salió el mail con el checklist a', email);

    return res.status(200).json({ ok: true, saved: guardado, emailSent: enviado, checklist: CHECKLIST });
  } catch (error) {
    // Avería: se rompió algo nuestro. El visitante ve el checklist igual y el
    // mail queda en los logs para recuperarlo.
    logLostLead(email, origen, error && error.message ? error.message : 'error inesperado');
    return res.status(200).json({ ok: true, saved: false, emailSent: false, checklist: CHECKLIST });
  }
};
