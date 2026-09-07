/**
 * Los dos mails que dispara el gate de la landing de diagnóstico:
 * la bienvenida con el checklist para quien dejó su dirección, y el aviso
 * interno para la agencia.
 *
 * El checklist viaja en el mail además de desplegarse en la página porque el
 * mail es lo que queda: la pestaña se cierra, la bandeja de entrada no. Y de
 * paso confirma que la dirección que dejaron existe de verdad.
 */

const { CHECKLIST, TOTAL_CHEQUEOS } = require('./checklist.js');
const { COLOR, SERIF, SANS, escapeHtml, parrafo, layout } = require('./mail-layout.js');

/** Un bloque del checklist como tarjeta con filete dorado al costado. */
function bloqueHtml({ titulo, items }) {
  const filas = items
    .map(
      texto =>
        '<tr>' +
        `<td style="padding:0 8px 0 0;font-family:${SANS};font-size:14px;line-height:1.7;` +
        `color:${COLOR.oro};vertical-align:top">&#9633;</td>` +
        `<td style="padding:0 0 10px;font-family:${SANS};font-size:14px;line-height:1.7;` +
        `color:${COLOR.marfilTenue}">${escapeHtml(texto)}</td>` +
        '</tr>'
    )
    .join('');

  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    `style="background-color:${COLOR.panel};border-left:3px solid ${COLOR.oro};margin:0 0 14px">` +
    '<tr><td style="padding:18px 20px">' +
    `<p class="serif-brand" style="margin:0 0 12px;font-family:${SERIF};font-size:18px;color:${COLOR.marfil}">` +
    `${escapeHtml(titulo)}</p>` +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">' +
    filas +
    '</table>' +
    '</td></tr></table>'
  );
}

/** Bienvenida con el checklist completo, para quien dejó su email en el gate. */
function checklistEmail() {
  const intro = [
    `Acá tenés los ${TOTAL_CHEQUEOS} chequeos que hacemos al revisar un proyecto, para que puedas pasarlos por el tuyo antes de hablar con nosotros.`,
    'No hace falta que estén todos en verde. Lo que importa es ver cuáles están en rojo y cuál conviene mover primero.'
  ];

  const cuerpo =
    intro.map(parrafo).join('') +
    '<div style="height:8px;font-size:0;line-height:0">&nbsp;</div>' +
    CHECKLIST.map(bloqueHtml).join('') +
    `<p style="margin:18px 0 0;font-family:${SANS};font-size:15px;line-height:1.75;color:${COLOR.marfilTenue}">` +
    'Si querés que lo revisemos con vos y te devolvamos una lectura concreta de tu proyecto, ' +
    `<a href="https://ateneaagency.com.ar/diagnostico#form" style="color:${COLOR.oro};text-decoration:none">` +
    'pedí el diagnóstico sin cargo</a>.</p>';

  const texto = [
    `Tu checklist de auto-diagnóstico`,
    ...intro,
    ...CHECKLIST.flatMap(({ titulo, items }) => ['', `${titulo.toUpperCase()}`, ...items.map(i => `[ ] ${i}`)]),
    '',
    'Pedí tu diagnóstico sin cargo: https://ateneaagency.com.ar/diagnostico#form',
    '',
    'Atenea Agency',
    'ateneaagency.com.ar'
  ].join('\n');

  return {
    subject: `Tu checklist: los ${TOTAL_CHEQUEOS} chequeos del diagnóstico — Atenea Agency`,
    html: layout({
      preheader: `Los ${TOTAL_CHEQUEOS} chequeos que hacemos al revisar un proyecto.`,
      titulo: 'Acá tenés<br>tu <span style="font-style:italic;color:' + COLOR.oro + '">checklist</span>.',
      cuerpo,
      pie:
        'Recibís este mail porque pediste el checklist en ateneaagency.com.ar. ' +
        'Si preferís no recibir novedades, respondé este mail y te damos de baja.'
    }),
    text: texto
  };
}

/** Aviso interno: alguien desbloqueó el checklist. */
function avisoInternoEmail({ email, origen, fecha, guardado }) {
  const safeEmail = escapeHtml(email);

  const filas = [
    ['Email', `<a href="mailto:${safeEmail}" style="color:${COLOR.oro};text-decoration:none">${safeEmail}</a>`],
    ['Origen', escapeHtml(origen)],
    ['Fecha', escapeHtml(fecha)],
    ['Lista de Brevo', guardado ? 'Dado de alta' : 'NO se pudo dar de alta — ver logs']
  ];

  const cuerpo =
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%">' +
    filas
      .map(
        ([label, value]) =>
          '<tr>' +
          `<td style="padding:8px 16px 8px 0;border-bottom:1px solid ${COLOR.borde};font-family:${SANS};` +
          `font-size:14px;color:${COLOR.marfilTenue};white-space:nowrap;vertical-align:top">${label}</td>` +
          `<td style="padding:8px 0;border-bottom:1px solid ${COLOR.borde};font-family:${SANS};` +
          `font-size:14px;color:${COLOR.marfil}">${value}</td>` +
          '</tr>'
      )
      .join('') +
    '</table>' +
    `<p style="margin:22px 0 0;font-family:${SANS};font-size:13px;line-height:1.7;color:${COLOR.marfilTenue}">` +
    'Respondiendo este mail le escribís directamente a la persona. ' +
    'Todavía no pidió el diagnóstico: solo dejó su dirección para ver el checklist.</p>';

  return {
    subject: `Nuevo email captado — ${email}`,
    html: layout({
      preheader: `${email} desbloqueó el checklist.`,
      titulo: 'Alguien desbloqueó<br>el <span style="font-style:italic;color:' + COLOR.oro + '">checklist</span>.',
      cuerpo,
      pie: 'Aviso automático del gate de captura en ateneaagency.com.ar/diagnostico'
    }),
    text: [
      'Alguien desbloqueó el checklist',
      '',
      `Email: ${email}`,
      `Origen: ${origen}`,
      `Fecha: ${fecha}`,
      `Lista de Brevo: ${guardado ? 'dado de alta' : 'NO se pudo dar de alta, ver logs'}`
    ].join('\n')
  };
}

module.exports = { checklistEmail, avisoInternoEmail };
