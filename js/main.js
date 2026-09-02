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
