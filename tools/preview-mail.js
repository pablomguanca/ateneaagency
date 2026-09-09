/**
 * Previsualiza los mails que mandan api/contact.js y api/save-lead.js, sin
 * enviar nada.
 *
 *   node tools/preview-mail.js
 *   node tools/preview-mail.js "María Fernández"
 *
 * Genera los HTML en tools/preview/ y los abre en el navegador. No usa la
 * API key ni toca Resend: reemplaza fetch por un stub que captura el cuerpo
 * de cada llamada, así se puede iterar sobre la plantilla sin gastar envíos
 * ni ensuciar la bandeja.
 *
 * Sin dependencias, igual que el resto del proyecto.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const handler = require('../api/contact.js');
const gateHandler = require('../api/save-lead.js');

// Valores de mentira: el stub intercepta antes de que salgan a la red.
process.env.RESEND_API_KEY = 'preview';
process.env.BREVO_API_KEY = 'preview';
process.env.BREVO_LIST_ID = '1';
process.env.CONTACT_TO = process.env.CONTACT_TO || 'atenea.agency.1@gmail.com';
process.env.CONTACT_FROM = process.env.CONTACT_FROM || 'Atenea Agency <web@ateneaagency.com.ar>';

const DESTINO = 'interesado@ejemplo.com';
const SALIDA = path.join(__dirname, 'preview');

// Cada formulario del sitio y el archivo donde cae su vista previa. Las claves
// son los `data-origen` del HTML, los mismos que usa COPY_BIENVENIDA.
const ORIGENES = {
  'Home': 'mail-origen-home.html',
  'Contacto': 'mail-origen-contacto.html',
  'Landing Diagnostico Inmobiliarias': 'mail-origen-inmobiliarias.html',
  'Landing Diagnostico Desarrollos': 'mail-origen-desarrollos.html'
};

// Se descartan las banderas para que `--no-open` no termine usado como nombre.
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const nombre = args[0] || 'Pablo Guanca';

let capturado = [];

global.fetch = async (url, opts) => {
  capturado.push({ url, body: JSON.parse(opts.body) });
  return { ok: true, status: 200, text: async () => '{}' };
};

// Respuesta mínima con la forma que espera el handler de Vercel.
function fakeRes() {
  const r = { statusCode: null, payload: null };
  r.status = code => { r.statusCode = code; return r; };
  r.json = payload => { r.payload = payload; return r; };
  r.setHeader = () => {};
  return r;
}

async function generar(etiqueta, suscripcion, archivo, origen = 'Home') {
  capturado = [];

  const res = fakeRes();
  await handler(
    {
      method: 'POST',
      // IP distinta en cada corrida para no chocar con el rate limit.
      headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 250) + 1}` },
      body: {
        nombre,
        email: DESTINO,
        telefono: '1169152671',
        proyecto: 'desarrollo-pozo',
        mensaje: 'Tengo un desarrollo en pozo y necesito ordenar la captación de consultas.',
        suscripcion,
        origen
      }
    },
    res
  );

  if (res.statusCode !== 200) {
    console.error(`  ERROR: el handler respondió ${res.statusCode}`, res.payload);
    return null;
  }

  const mail = capturado.find(c => c.url.includes('resend') && c.body.to[0] === DESTINO);

  if (!mail) {
    console.error('  ERROR: no se generó el mail al interesado.');
    return null;
  }

  const destino = path.join(SALIDA, archivo);
  fs.writeFileSync(destino, mail.body.html, 'utf8');

  console.log(`\n${etiqueta}`);
  console.log(`  asunto: ${mail.body.subject}`);
  console.log(`  archivo: ${path.relative(process.cwd(), destino)}`);
  console.log('  --- texto plano ---');
  console.log(mail.body.text.split('\n').map(l => (l ? `  ${l}` : '')).join('\n'));

  return destino;
}

/**
 * Los dos mails del gate de captura: el checklist para quien dejó su email y
 * el aviso interno. Salen del mismo handler que corre en producción, así que
 * lo que se ve acá es exactamente lo que se manda.
 */
async function generarGate() {
  capturado = [];

  const res = fakeRes();
  await gateHandler(
    {
      method: 'POST',
      headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 250) + 1}` },
      body: { email: DESTINO, source: 'diagnostico-checklist' }
    },
    res
  );

  if (res.statusCode !== 200) {
    console.error(`  ERROR: save-lead respondió ${res.statusCode}`, res.payload);
    return [];
  }

  const mails = [
    { etiqueta: 'CHECKLIST (el que recibe quien deja su email)', archivo: 'mail-checklist.html', destino: DESTINO },
    { etiqueta: 'AVISO DEL GATE (el que te llega a vos)', archivo: 'mail-gate-interno.html', destino: process.env.CONTACT_TO }
  ];

  const generados = [];

  for (const { etiqueta, archivo, destino } of mails) {
    const mail = capturado.find(c => c.url.includes('resend') && c.body.to[0] === destino);
    if (!mail) continue;

    const ruta = path.join(SALIDA, archivo);
    fs.writeFileSync(ruta, mail.body.html, 'utf8');

    console.log(`
${etiqueta}`);
    console.log(`  asunto: ${mail.body.subject}`);
    console.log(`  archivo: ${path.relative(process.cwd(), ruta)}`);

    generados.push(ruta);
  }

  return generados;
}

function abrir(archivo) {
  const url = 'file://' + archivo.replace(/\\/g, '/');

  if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', url]);
  else if (process.platform === 'darwin') execFile('open', [url]);
  else execFile('xdg-open', [url]);
}

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });

  const conLista = await generar('CON suscripción a la lista', 'si', 'mail-con-lista.html');
  const sinLista = await generar('SIN suscripción', undefined, 'mail-sin-lista.html');

  // Una vista por origen: así se revisa el copy de COPY_BIENVENIDA de cada
  // formulario sin tener que editar este archivo a mano.
  const porOrigen = [];

  for (const [origen, archivo] of Object.entries(ORIGENES)) {
    const salida = await generar(`ORIGEN: ${origen}`, 'si', archivo, origen);
    if (salida) porOrigen.push(salida);
  }

  // También el aviso interno, para revisarlo cuando se toque su plantilla.
  const interno = capturado.find(
    c => c.url.includes('resend') && c.body.to[0] === process.env.CONTACT_TO
  );

  if (interno) {
    const destino = path.join(SALIDA, 'mail-interno.html');
    fs.writeFileSync(destino, interno.body.html, 'utf8');
    console.log(`\nAVISO INTERNO (el que te llega a vos)`);
    console.log(`  asunto: ${interno.body.subject}`);
    console.log(`  archivo: ${path.relative(process.cwd(), destino)}`);
  }

  const delGate = await generarGate();

  console.log(
    '\nOJO: el navegador sí carga Cormorant Garamond, así que esta vista es el\n' +
    'mejor caso (Apple Mail, iOS Mail). Gmail, Outlook y Yahoo no soportan\n' +
    'fuentes web y van a mostrar Georgia. Para ver ese escenario, cortá la\n' +
    'conexión antes de abrir el archivo o bloqueá fonts.googleapis.com.'
  );

  if (process.argv.includes('--no-open')) {
    console.log('\nListo. Abrilos a mano desde tools/preview/');
    return;
  }

  console.log('\nAbriendo en el navegador...');
  [conLista, sinLista, ...porOrigen, ...delGate].filter(Boolean).forEach(abrir);
})();
