/**
 * Verificación anti-bot con Cloudflare Turnstile.
 *
 * Se eligió Turnstile por sobre reCAPTCHA por dos razones concretas: pesa ~30 KB
 * contra ~350 KB, y en las landings se paga por cada visita, así que el JS de
 * más cuesta conversiones; y no manda datos del visitante a Google, lo que
 * simplifica el consentimiento.
 *
 * Devuelve cuatro veredictos, y la diferencia entre ellos define si al visitante
 * se le cierra la puerta o no:
 *
 *   'human'       → pasó.
 *   'rejected'    → Cloudflare dice que no, o el envío no trajo token. La causa
 *                   está del lado de quien envía, así que corresponde cortarle
 *                   el paso.
 *   'unavailable' → no pudimos verificar: Cloudflare no respondió o falló la
 *                   red. La culpa es NUESTRA, y castigar al visitante por una
 *                   avería propia es peor que dejar pasar algún bot.
 *   'disabled'    → no hay TURNSTILE_SECRET_KEY cargada. La verificación está
 *                   apagada a propósito y el formulario funciona como antes.
 *
 * El token es de un solo uso y vive 5 minutos: si el envío se rechaza por
 * cualquier otro motivo, el front tiene que pedir uno nuevo antes de reintentar.
 *
 * Variables de entorno:
 *   TURNSTILE_SECRET_KEY  (opcional) Secret del widget. Sin ella no se verifica
 *                                    nada y el formulario sigue andando.
 *
 * Sin dependencias, igual que el resto de `api/`.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verifyHuman(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Apagado: mientras no esté cargada la secret, el circuito queda como estaba.
  if (!secret) return 'disabled';

  // Sin token asumimos bot: es la firma típica de un POST directo al endpoint,
  // sin pasar por el formulario.
  if (!token || typeof token !== 'string') return 'rejected';

  const body = new URLSearchParams({ secret, response: token });

  // La IP es opcional y ayuda a Cloudflare a puntuar mejor.
  if (ip) body.append('remoteip', ip);

  try {
    const respuesta = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!respuesta.ok) {
      console.error('[turnstile] Cloudflare respondió', respuesta.status);
      return 'unavailable';
    }

    const data = await respuesta.json();

    if (!data.success) {
      // Los códigos vienen bien: 'invalid-input-response' es token falso o ya
      // usado, 'timeout-or-duplicate' es token vencido o reenviado.
      console.warn('[turnstile] Rechazado:', (data['error-codes'] || []).join(', '));
      return 'rejected';
    }

    return 'human';
  } catch (error) {
    console.error('[turnstile] No se pudo consultar a Cloudflare:', error);
    return 'unavailable';
  }
}

module.exports = { verifyHuman };
