const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursorRing');

if (cursor && cursorRing && !reducedMotion.matches) {
  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
  }, { passive: true });

  const animateCursorRing = () => {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top = ringY + 'px';
    requestAnimationFrame(animateCursorRing);
  };
  animateCursorRing();
}

const nav = document.getElementById('nav');

if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('stuck', window.scrollY > 60);
  }, { passive: true });
}

const ham = document.getElementById('ham');
const mob = document.getElementById('mob');

if (ham && mob) {
  const closeMenu = () => {
    ham.classList.remove('open');
    mob.classList.remove('open');
    ham.setAttribute('aria-expanded', 'false');
    mob.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  ham.addEventListener('click', () => {
    const isOpen = ham.classList.toggle('open');
    mob.classList.toggle('open', isOpen);
    ham.setAttribute('aria-expanded', String(isOpen));
    mob.setAttribute('aria-hidden', String(!isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  mob.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

let currentScrollY = 0;
let scrollTicking = false;

window.addEventListener('scroll', () => {
  currentScrollY = window.scrollY;
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    applyScrollParallax();
    updateCards();
    updateTimeline();
    scrollTicking = false;
  });
}, { passive: true });

if (!reducedMotion.matches) {
  document.addEventListener('mousemove', e => {
    const xPct = (e.clientX / window.innerWidth) - 0.5;
    const yPct = (e.clientY / window.innerHeight) - 0.5;
    applyMouseParallax(xPct, yPct);
  }, { passive: true });
}

function applyMouseParallax(xPct, yPct) {
  const layer1 = document.getElementById('layer1');
  const layer2 = document.getElementById('layer2');
  if (layer1) layer1.style.transform = `translate(${xPct * -18}px, ${yPct * -12 + currentScrollY * -0.08}px)`;
  if (layer2) layer2.style.transform = `translate(${xPct * -28}px, ${yPct * -18 + currentScrollY * -0.14}px)`;
}

function applyScrollParallax() {
  if (reducedMotion.matches) return;
  const layer1 = document.getElementById('layer1');
  const layer2 = document.getElementById('layer2');
  if (layer1) layer1.style.transform = `translateY(${currentScrollY * -0.08}px)`;
  if (layer2) layer2.style.transform = `translateY(${currentScrollY * -0.14}px)`;
}

const revealTargets = document.querySelectorAll('.reveal');

if (reducedMotion.matches) {
  revealTargets.forEach(el => el.classList.add('on'));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('on');
      revealObserver.unobserve(entry.target);
      setTimeout(() => entry.target.classList.remove('is-pending'), 1000);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });

  revealTargets.forEach(el => {
    el.classList.add('is-pending');
    revealObserver.observe(el);
  });
}

const cards = document.querySelectorAll('.strip__item');
const stickyTop = 250;
const buriedClasses = ['is-buried-1', 'is-buried-2', 'is-buried-3', 'is-buried-4', 'is-buried-5'];
const stackQuery = window.matchMedia('(min-width: 900px)');

function clearCardVars(card) {
  card.style.removeProperty('--card-scale');
  card.style.removeProperty('--card-y');
}

function resetCards() {
  cards.forEach(card => {
    card.classList.remove(...buriedClasses, 'active');
    clearCardVars(card);
  });
}

function updateCards() {
  if (!stackQuery.matches || reducedMotion.matches) {
    resetCards();
    return;
  }

  let activeIndex = 0;

  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    if (rect.top <= stickyTop) activeIndex = i;
  });

  cards.forEach((card, i) => {
    card.classList.remove(...buriedClasses, 'active');
    const depth = activeIndex - i;

    if (depth === 0) {
      card.classList.add('active');
      clearCardVars(card);
    } else if (depth > 0) {
      card.classList.add(`is-buried-${Math.min(depth, 5)}`);
      card.style.setProperty('--card-scale', String(Math.max(0.85, 1 - depth * 0.06)));
      card.style.setProperty('--card-y', `${depth * -40}px`);
    } else {
      clearCardVars(card);
    }
  });
}

const processGrids = Array.from(document.querySelectorAll('.process__grid'));
const verticalTimelineQuery = window.matchMedia('(max-width: 899px)');
let timelines = [];

function measureTimelines() {
  const vertical = verticalTimelineQuery.matches;

  timelines = processGrids.map(grid => {
    const items = Array.from(grid.querySelectorAll('.process__item'));
    const span = vertical ? grid.offsetHeight : grid.offsetWidth;

    return {
      grid,
      items,
      thresholds: items.map(item => {
        if (!span) return 0;
        const offset = vertical ? item.offsetTop : item.offsetLeft;
        return Math.max(0.02, offset / span);
      })
    };
  });
}

function updateTimeline() {
  if (!timelines.length) return;

  if (reducedMotion.matches) {
    timelines.forEach(({ grid, items }) => {
      grid.style.setProperty('--process-progress', '1');
      items.forEach(item => item.classList.add('is-reached'));
    });
    return;
  }

  const viewportHeight = window.innerHeight;
  const enter = viewportHeight * 0.85;
  const exit = viewportHeight * 0.3;

  timelines.forEach(({ grid, items, thresholds }) => {
    const rect = grid.getBoundingClientRect();
    const travel = rect.height + (enter - exit);
    const progress = travel > 0
      ? Math.min(1, Math.max(0, (enter - rect.top) / travel))
      : 0;

    grid.style.setProperty('--process-progress', progress.toFixed(4));
    items.forEach((item, i) => {
      item.classList.toggle('is-reached', progress >= thresholds[i]);
    });
  });
}

let resizeTimer;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    measureTimelines();
    updateTimeline();
    updateCards();
  }, 150);
}, { passive: true });

stackQuery.addEventListener('change', updateCards);
verticalTimelineQuery.addEventListener('change', () => {
  measureTimelines();
  updateTimeline();
});

measureTimelines();
updateTimeline();
updateCards();

document.querySelectorAll('input[type="tel"]').forEach(input => {
  input.addEventListener('input', () => {
    const raw = input.value;
    const keepsPlus = raw.startsWith('+');
    const cleaned = (keepsPlus ? '+' : '') + raw.replace(/\D/g, '');
    if (cleaned === raw) return;

    const caret = input.selectionStart === null ? raw.length : input.selectionStart;
    const head = raw.slice(0, caret);
    const next = (keepsPlus && head.startsWith('+') ? 1 : 0) + head.replace(/\D/g, '').length;

    input.value = cleaned;
    input.setSelectionRange(next, next);
  });
});

const ERROR_MESSAGE = 'No pudimos enviar tu mensaje. Probá de nuevo en unos minutos o escribinos por WhatsApp.';

document.querySelectorAll('.js-contact-form').forEach(form => {
  const status = form.querySelector('.js-form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = submitButton && submitButton.querySelector('span');

  if (!status || !submitLabel) return;

  const idleLabel = submitLabel.textContent;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitButton.disabled = true;
    submitLabel.textContent = 'Enviando...';
    status.textContent = '';
    status.classList.remove('is-error');

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.origen = form.dataset.origen || 'sitio';

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      status.textContent = 'Gracias, recibimos tu mensaje. Te respondemos dentro de las 24 horas hábiles.';
      form.reset();
      form.classList.remove('was-validated');
    } catch (error) {
      console.error('[contact] No se pudo enviar el formulario:', error);
      status.classList.add('is-error');
      status.textContent = ERROR_MESSAGE;
    } finally {
      submitButton.disabled = false;
      submitLabel.textContent = idleLabel;
    }
  });
});

// Gate de captura de la landing de diagnóstico: pide un email y a cambio
// despliega el checklist que devuelve /api/save-lead.
//
// Veredictos del envío. Solo RECHAZO le cierra la puerta al visitante: es el
// único caso en que el problema está de su lado y lo puede corregir. Si la
// falla es nuestra (Brevo caído, Resend sin responder) entra igual, porque
// dejarlo afuera por una avería propia nos hace perder el lead entero.
const gateForm = document.getElementById('gate-form');

if (gateForm) {
  const GATE_OK = 'ok';
  const GATE_RECHAZO = 'rechazo';
  const GATE_AVERIA = 'averia';

  const GATE_CACHE = 'atenea_checklist';
  const GATE_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

  const gateEmail = gateForm.querySelector('#gateEmail');
  const gateStatus = gateForm.querySelector('.js-gate-status');
  const gateSubmit = gateForm.querySelector('button[type="submit"]');
  const gateSubmitLabel = gateSubmit.querySelector('span');
  const gateVeil = document.getElementById('gate-veil');
  const gateContent = document.getElementById('gate-content');

  const gateIdleLabel = gateSubmitLabel.textContent;

  // localStorage tira en modo privado y con las cookies bloqueadas. Que no se
  // pueda recordar el desbloqueo es molesto; que reviente el resto de la página
  // por eso, no.
  const leerCache = () => {
    try {
      const guardado = localStorage.getItem(GATE_CACHE);
      const bloques = guardado ? JSON.parse(guardado) : null;
      return Array.isArray(bloques) && bloques.length ? bloques : null;
    } catch (error) {
      return null;
    }
  };

  const guardarCache = bloques => {
    try {
      localStorage.setItem(GATE_CACHE, JSON.stringify(bloques));
    } catch (error) {
      // Sin persistencia: la próxima visita vuelve a pedir el mail. Es otra
      // oportunidad de capturarlo, y esta vez la persona ya lo vio igual.
    }
  };

  // Se arma con el DOM y no con innerHTML: el texto viene de nuestro backend,
  // pero construirlo así deja la inyección imposible por definición.
  const renderChecklist = (bloques, avisoMail) => {
    const grid = document.createElement('div');
    grid.className = 'lp-gate__grid';

    bloques.forEach(bloque => {
      const grupo = document.createElement('article');
      grupo.className = 'lp-gate__group';

      const titulo = document.createElement('h3');
      titulo.className = 'lp-gate__group-title';
      titulo.textContent = bloque.titulo;
      grupo.appendChild(titulo);

      const lista = document.createElement('ul');
      lista.className = 'lp-gate__list';

      (bloque.items || []).forEach(texto => {
        const item = document.createElement('li');
        item.className = 'lp-gate__item';
        item.textContent = texto;
        lista.appendChild(item);
      });

      grupo.appendChild(lista);
      grid.appendChild(grupo);
    });

    const outro = document.createElement('p');
    outro.className = 'lp-gate__outro';

    // El aviso del mail solo se muestra si el envío salió de verdad: prometerle
    // un mail que no llegó es peor que no mencionarlo.
    if (avisoMail) {
      const enviado = document.createElement('strong');
      enviado.textContent = avisoMail;
      outro.appendChild(enviado);
      outro.appendChild(document.createElement('br'));
    }

    outro.insertAdjacentHTML(
      'beforeend',
      'Si querés que lo revisemos con vos y te devolvamos una lectura concreta de tu proyecto, ' +
        '<a href="#form">pedí el diagnóstico sin cargo</a>.'
    );

    gateContent.replaceChildren(grid, outro);
    gateContent.hidden = false;

    if (gateVeil) gateVeil.hidden = true;
    gateForm.hidden = true;
  };

  const cacheado = leerCache();

  if (cacheado) {
    renderChecklist(cacheado);
  } else {
    const enviarLead = async email => {
      const response = await fetch('/api/save-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          website: gateForm.querySelector('#gateWeb').value,
          source: 'diagnostico-checklist'
        })
      });

      // Rechazo: el dato está mal o hubo demasiados intentos. Corregible.
      if (response.status === 400 || response.status === 403 || response.status === 429) {
        const data = await response.json().catch(() => ({}));
        return { veredicto: GATE_RECHAZO, error: data.error };
      }

      if (!response.ok) return { veredicto: GATE_AVERIA };

      const data = await response.json().catch(() => ({}));

      if (!data.ok || !Array.isArray(data.checklist) || !data.checklist.length) {
        return { veredicto: GATE_AVERIA };
      }

      // El backend responde 200 con saved:false cuando no pudo guardar el mail
      // pero igual corresponde dejar entrar.
      return {
        veredicto: data.saved === false ? GATE_AVERIA : GATE_OK,
        checklist: data.checklist,
        emailSent: data.emailSent !== false
      };
    };

    gateForm.addEventListener('submit', async e => {
      e.preventDefault();

      const email = gateEmail.value.trim();

      if (!GATE_EMAIL_RE.test(email)) {
        gateEmail.setAttribute('aria-invalid', 'true');
        gateStatus.classList.add('is-error');
        gateStatus.textContent = 'Ingresá un email válido.';
        return;
      }

      gateEmail.setAttribute('aria-invalid', 'false');
      gateSubmit.disabled = true;
      gateSubmitLabel.textContent = 'Un segundo...';
      gateStatus.classList.remove('is-error');
      gateStatus.textContent = '';

      let resultado;

      try {
        resultado = await enviarLead(email);
      } catch (error) {
        // El endpoint no respondió. Un reintento por si fue algo pasajero.
        try {
          resultado = await enviarLead(email);
        } catch (segundoError) {
          console.error('[gate] No se pudo enviar el email:', segundoError);
          resultado = { veredicto: GATE_AVERIA };
        }
      }

      gateSubmit.disabled = false;
      gateSubmitLabel.textContent = gateIdleLabel;

      if (resultado.veredicto === GATE_RECHAZO) {
        gateEmail.setAttribute('aria-invalid', 'true');
        gateStatus.classList.add('is-error');
        gateStatus.textContent = resultado.error || 'Revisá tu email y probá de nuevo.';
        return;
      }

      // Avería sin contenido: no hay checklist que mostrar, así que lo único
      // honesto es pedir que reintente.
      if (!resultado.checklist) {
        gateStatus.classList.add('is-error');
        gateStatus.textContent =
          'No pudimos traer el checklist. Probá de nuevo en un momento o escribinos por WhatsApp.';
        return;
      }

      // Solo se recuerda el desbloqueo cuando el mail quedó realmente guardado.
      // Si hubo avería, la próxima visita vuelve a pedirlo.
      if (resultado.veredicto === GATE_OK) guardarCache(resultado.checklist);

      renderChecklist(
        resultado.checklist,
        resultado.emailSent ? `También te lo mandamos a ${email}.` : ''
      );

      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { content_name: 'Checklist de diagnóstico', status: 'success' });
      }

      gateContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

// Año del copyright. El HTML trae el año escrito como fallback (para quien
// entra sin JS y para los crawlers); acá se pisa con el año en curso para que
// el footer no envejezca solo.
document.querySelectorAll('.js-year').forEach(el => {
  el.textContent = new Date().getFullYear();
});
