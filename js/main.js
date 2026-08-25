const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursorRing');

let mouseX = 0, mouseY = 0;
let ringX = 0, ringY = 0;

if (cursor && cursorRing) {
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
    scrollTicking = false;
  });
}, { passive: true });

document.addEventListener('mousemove', e => {
  const xPct = (e.clientX / window.innerWidth) - 0.5;
  const yPct = (e.clientY / window.innerHeight) - 0.5;
  applyMouseParallax(xPct, yPct);
}, { passive: true });

function applyMouseParallax(xPct, yPct) {
  const layer1 = document.getElementById('layer1');
  const layer2 = document.getElementById('layer2');
  if (layer1) layer1.style.transform = `translate(${xPct * -18}px, ${yPct * -12 + currentScrollY * -0.08}px)`;
  if (layer2) layer2.style.transform = `translate(${xPct * -28}px, ${yPct * -18 + currentScrollY * -0.14}px)`;
}

function applyScrollParallax() {
  const layer1 = document.getElementById('layer1');
  const layer2 = document.getElementById('layer2');
  if (layer1) layer1.style.transform = `translateY(${currentScrollY * -0.08}px)`;
  if (layer2) layer2.style.transform = `translateY(${currentScrollY * -0.14}px)`;
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('on'), index * 90);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const cards = document.querySelectorAll('.strip__item');
const stickyTop = 250;
const buriedClasses = ['is-buried-1', 'is-buried-2', 'is-buried-3', 'is-buried-4', 'is-buried-5'];
const stackQuery = window.matchMedia('(min-width: 900px)');

function resetCards() {
  cards.forEach(card => {
    card.classList.remove(...buriedClasses, 'active');
    card.style.transform = '';
  });
}

function updateCards() {
  if (!stackQuery.matches) {
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
      card.style.transform = '';
    } else if (depth > 0) {
      card.classList.add(`is-buried-${Math.min(depth, 5)}`);
      const scale = Math.max(0.85, 1 - depth * 0.06);
      const translateY = depth * -40;
      card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    } else {
      card.style.transform = '';
    }
  });
}

stackQuery.addEventListener('change', updateCards);

updateCards();

document.querySelectorAll('.js-contact-form').forEach(form => {
  const status = form.querySelector('.js-form-status');
  const submitLabel = form.querySelector('button[type="submit"] span');
  const idleLabel = submitLabel.textContent;

  form.addEventListener('submit', e => {
    e.preventDefault();
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitLabel.textContent = 'Enviando...';
    status.textContent = '';

    setTimeout(() => {
      submitLabel.textContent = idleLabel;
      status.textContent = 'Gracias, recibimos tu mensaje. Te respondemos dentro de las 24 horas hábiles.';
      form.reset();
      form.classList.remove('was-validated');
    }, 700);
  });
});