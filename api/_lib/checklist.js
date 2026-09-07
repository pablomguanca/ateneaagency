/**
 * El contenido que se desbloquea dejando el email en la landing de diagnóstico.
 *
 * Vive acá y no en el HTML a propósito: es lo único que el visitante recibe a
 * cambio del mail, así que si estuviera escrito en `diagnostico.html` se leería
 * desde el código fuente sin dejar nada y el gate sería decorativo.
 *
 * De esta misma fuente salen las dos copias que ve la persona —la que se
 * despliega en la página y la que le llega por mail—, para que no puedan
 * divergir con el tiempo.
 *
 * Sin dependencias, igual que el resto de `api/`.
 */

const CHECKLIST = [
  {
    titulo: 'Tus redes sociales',
    items: [
      'Alguien que entra hoy a tu perfil entiende en menos de diez segundos qué vendés, dónde y en qué etapa está la obra.',
      'Hay contenido publicado en las últimas dos semanas, y no una ráfaga de posteos seguida de tres meses en silencio.',
      'El perfil tiene un camino claro hacia la consulta: link a la web o a WhatsApp visible sin tener que buscarlo.',
      'Se muestra avance real de obra, no solo renders. La confianza en un pozo se construye mostrando que se está construyendo.'
    ]
  },
  {
    titulo: 'Tu web o landing',
    items: [
      'Carga en menos de tres segundos en un celular con datos móviles, no en tu escritorio con fibra.',
      'El título que se ve sin scrollear dice qué es, dónde queda y a quién le sirve.',
      'El formulario pide lo mínimo indispensable. Cada campo extra que agregás te cuesta consultas.',
      'Después de enviar el formulario la persona recibe una confirmación, y no queda sin saber si llegó.'
    ]
  },
  {
    titulo: 'Tus campañas activas',
    items: [
      'Sabés cuánto te cuesta cada consulta, no solo cuánto gastaste en total.',
      'Los anuncios filtran: hablan de precio, ubicación o etapa, en vez de buscar el clic más barato posible.',
      'La campaña manda a una landing del proyecto, no a la home ni al perfil de Instagram.',
      'Podés distinguir qué anuncio trajo cada consulta, porque si no, no hay nada que optimizar.'
    ]
  },
  {
    titulo: 'Comunicación con tus leads',
    items: [
      'La primera respuesta sale dentro de la hora en horario comercial. Después de eso, el interés se enfría rápido.',
      'Hay una segunda y una tercera respuesta previstas para quien no contesta la primera vez.',
      'Las consultas quedan registradas en algún lugar que no sea la bandeja de entrada de una sola persona.',
      'Quien no compra hoy sigue recibiendo algo tuyo. La mayoría de las decisiones de compra no se toman en la primera semana.'
    ]
  }
];

const TOTAL_CHEQUEOS = CHECKLIST.reduce((suma, bloque) => suma + bloque.items.length, 0);

module.exports = { CHECKLIST, TOTAL_CHEQUEOS };
