/**
 * Cascarón de marca para los mails que salen por Resend.
 *
 * HTML de mail: tablas y estilos inline a propósito. Gmail y Outlook descartan
 * buena parte del CSS moderno, así que nada de flex, grid ni hojas externas.
 *
 * Por ahora lo usa `save-lead.js`. `contact.js` tiene su propia copia de este
 * cascarón escrita inline; migrarlo acá es un paso pendiente y aislado, que no
 * hace falta para el circuito del gate.
 *
 * Sin dependencias, igual que el resto de `api/`.
 */

const COLOR = {
  fondo: '#06060A',
  tarjeta: '#0E0E18',
  panel: '#141222',
  borde: '#241F33',
  oro: '#C9A84C',
  oroClaro: '#E8C97A',
  marfil: '#F0EBE0',
  marfilTenue: '#9E9688',
  pieDeMail: '#7A736A'
};

const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',Times,serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const SITIO = 'https://ateneaagency.com.ar';

// La fuente web se pide solo a los clientes que la soportan; a Outlook se le
// fija Georgia por adelantado para que no caiga en Times New Roman.
const FUENTES = `<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap" rel="stylesheet">
<!--<![endif]-->
<!--[if mso]>
<style>
  .serif-brand { font-family: Georgia, 'Times New Roman', Times, serif !important; }
</style>
<![endif]-->`;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ESCAPES[char]);
}

function parrafo(texto) {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.75;color:${COLOR.marfilTenue}">` +
    `${escapeHtml(texto)}</p>`;
}

/**
 * Envuelve el contenido en la tarjeta de marca: logotipo, filete dorado,
 * encabezado, cuerpo y pie.
 *
 * @param {string} preheader Se ve en la bandeja de entrada, no en el cuerpo.
 * @param {string} titulo    Encabezado grande, en serif. Ya escapado por quien llama.
 * @param {string} cuerpo    HTML del cuerpo. Ya escapado por quien llama.
 * @param {string} [pie]     Línea final de letra chica. Texto plano.
 */
function layout({ preheader, titulo, cuerpo, pie }) {
  const notaPie = pie || 'Recibís este mail porque dejaste tu dirección en ateneaagency.com.ar';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(preheader)}</title>
${FUENTES}
</head>
<body style="margin:0;padding:0;background-color:${COLOR.fondo}">

<!-- Texto de vista previa: se ve en la bandeja, no en el cuerpo del mail. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
  ${escapeHtml(preheader)}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.fondo}">
  <tr>
    <td align="center" style="padding:32px 12px">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
            style="width:100%;max-width:600px;background-color:${COLOR.tarjeta};border:1px solid ${COLOR.borde}">

        <tr>
          <td align="center" style="padding:38px 32px 0">
            <div class="serif-brand" style="font-family:${SERIF};font-size:23px;letter-spacing:1px;color:${COLOR.marfil}">
              Atenea <span style="color:${COLOR.oro}">Agency</span>
            </div>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:18px 32px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="width:54px;height:2px;background-color:${COLOR.oro};font-size:0;line-height:0">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:30px 32px 0">
            <h1 class="serif-brand" style="margin:0 0 18px;font-family:${SERIF};font-size:27px;line-height:1.3;font-weight:normal;color:${COLOR.marfil}">
              ${titulo}
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px">
            ${cuerpo}
          </td>
        </tr>

        <tr>
          <td style="padding:26px 32px 0">
            <div style="height:1px;background-color:${COLOR.borde};font-size:0;line-height:0">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 38px">
            <p class="serif-brand" style="margin:0 0 4px;font-family:${SERIF};font-size:17px;color:${COLOR.marfil}">Atenea Agency</p>
            <p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.6;color:${COLOR.marfilTenue}">
              Marketing inmobiliario para desarrollos e inmobiliarias
            </p>
            <a href="${SITIO}" style="font-family:${SANS};font-size:13px;color:${COLOR.oro};text-decoration:none">ateneaagency.com.ar</a>
          </td>
        </tr>

      </table>

      <p style="margin:18px 0 0;font-family:${SANS};font-size:11px;line-height:1.6;color:${COLOR.pieDeMail}">
        ${escapeHtml(notaPie)}
      </p>

    </td>
  </tr>
</table>

</body>
</html>`;
}

module.exports = { COLOR, SERIF, SANS, SITIO, escapeHtml, parrafo, layout };
