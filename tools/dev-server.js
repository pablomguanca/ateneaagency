/**
 * Servidor local que imita a Vercel: sirve los archivos estáticos y enruta
 * `/api/*` a los handlers de `api/`.
 *
 *   node tools/dev-server.js          → http://localhost:4322
 *   PORT=5000 node tools/dev-server.js
 *
 * Existe porque `serve` sirve el HTML pero no ejecuta las funciones, así que
 * los formularios no se pueden probar sin deployar. Acá sí: se completa el
 * formulario en el navegador y el handler corre de verdad.
 *
 * Por defecto NO manda mails ni toca Brevo: sin `RESEND_API_KEY` ni
 * `BREVO_API_KEY` los handlers loguean y siguen, que es justo el camino de
 * avería que conviene poder ver. Para probar con envío real, exportá las
 * claves antes de arrancar.
 *
 * Sin dependencias, igual que el resto del proyecto. No usar en producción.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PUERTO = Number(process.env.PORT) || 4322;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let crudo = '';
    req.on('data', chunk => {
      crudo += chunk;
      // Tope defensivo: sin esto un POST enorme llena la memoria del proceso.
      if (crudo.length > 1e6) reject(new Error('cuerpo demasiado grande'));
    });
    req.on('end', () => {
      if (!crudo) return resolve({});
      try {
        resolve(JSON.parse(crudo));
      } catch (error) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/** Respuesta con la forma mínima que esperan los handlers de Vercel. */
function adaptarRes(res) {
  res.status = code => {
    res.statusCode = code;
    return res;
  };

  res.json = payload => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return res;
  };

  return res;
}

async function servirApi(req, res, ruta) {
  // Solo nombres simples: corta cualquier intento de subir de directorio.
  const nombre = ruta.replace(/^\/api\//, '').replace(/\/+$/, '');

  if (!/^[a-z0-9-]+$/i.test(nombre)) {
    return adaptarRes(res).status(404).json({ error: 'No existe esa función.' });
  }

  const archivo = path.join(RAIZ, 'api', `${nombre}.js`);

  if (!fs.existsSync(archivo)) {
    return adaptarRes(res).status(404).json({ error: `No existe api/${nombre}.js` });
  }

  // Se recarga en cada pedido para no tener que reiniciar al editar el handler.
  Object.keys(require.cache)
    .filter(clave => clave.startsWith(path.join(RAIZ, 'api')))
    .forEach(clave => delete require.cache[clave]);

  const handler = require(archivo);

  req.body = req.method === 'POST' ? await leerCuerpo(req) : {};

  console.log(`  → api/${nombre}  ${JSON.stringify(req.body).slice(0, 120)}`);

  try {
    await handler(req, adaptarRes(res));
  } catch (error) {
    console.error(`  ✗ api/${nombre} tiró:`, error);
    if (!res.headersSent) adaptarRes(res).status(500).json({ error: 'El handler falló.' });
  }
}

function servirArchivo(req, res, ruta) {
  const limpia = decodeURIComponent(ruta.split('?')[0]);
  const candidatos = limpia === '/' ? ['index.html'] : [limpia.slice(1), `${limpia.slice(1)}.html`];

  for (const candidato of candidatos) {
    const destino = path.join(RAIZ, candidato);

    // No servir nada de afuera de la raíz del proyecto.
    if (!destino.startsWith(RAIZ)) break;

    if (fs.existsSync(destino) && fs.statSync(destino).isFile()) {
      res.setHeader('Content-Type', TIPOS[path.extname(destino)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      return fs.createReadStream(destino).pipe(res);
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', TIPOS['.html']);
  const noEncontrado = path.join(RAIZ, '404.html');
  if (fs.existsSync(noEncontrado)) return fs.createReadStream(noEncontrado).pipe(res);
  res.end('404');
}

http
  .createServer((req, res) => {
    const ruta = req.url || '/';

    if (ruta.startsWith('/api/')) return servirApi(req, res, ruta.split('?')[0]);
    return servirArchivo(req, res, ruta);
  })
  .listen(PUERTO, () => {
    console.log(`Sitio y API en http://localhost:${PUERTO}`);
    console.log(`Resend: ${process.env.RESEND_API_KEY ? 'CON clave, manda de verdad' : 'sin clave, no manda'}`);
    console.log(`Brevo:  ${process.env.BREVO_API_KEY ? 'CON clave, guarda de verdad' : 'sin clave, no guarda'}`);
  });
