'use strict';
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navLinks = [...document.querySelectorAll('#navigation a')];
function closeMenu() {
  header.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}
menuButton.addEventListener('click', () => {
  const open = header.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
navLinks.forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', event => {
  if (!header.contains(event.target)) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && header.classList.contains('open')) {
    closeMenu();
    menuButton.focus();
  }
});
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab, focus = false) {
  tabs.forEach(item => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      activateTab(tabs[next], true);
    }
  });
});
const progress = document.querySelector('.reading-progress');
let pending = false;
function updateReadingState() {
  const available = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${available > 0 ? Math.min(100, Math.max(0, window.scrollY / available * 100)) : 0}%`;
  let active = null;
  navLinks.forEach(link => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section && section.getBoundingClientRect().top <= 140) active = link;
  });
  navLinks.forEach(link => {
    if (link === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  pending = false;
}
window.addEventListener('scroll', () => {
  if (!pending) {
    pending = true;
    requestAnimationFrame(updateReadingState);
  }
}, { passive: true });
window.addEventListener('resize', () => {
  if (window.innerWidth > 850) closeMenu();
  updateReadingState();
});
document.getElementById('year').textContent = new Date().getFullYear();
updateReadingState();

// Finite, progressive animation: all content is visible without JavaScript.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const runningAnimations = new Set();
let revealObserver;
function animateElement(element, frames, options = {}) {
  if (motionPreference.matches || !element.animate) return;
  const animation = element.animate(frames, {
    duration: 650,
    easing: 'cubic-bezier(.22,1,.36,1)',
    ...options
  });
  runningAnimations.add(animation);
  animation.finished.then(() => runningAnimations.delete(animation), () => runningAnimations.delete(animation));
}
function reveal(element, delay = 0) {
  animateElement(element, [
    { opacity: .15, transform: 'translateY(18px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { delay, fill: 'backwards' });
}
function startEntranceAnimations() {
  if (motionPreference.matches) return;
  document.documentElement.classList.add('motion-ready');
  document.querySelectorAll('.hero-copy > *, .hero-visual').forEach((element, index) => {
    reveal(element, Math.min(index * 80, 320));
  });
  if (!('IntersectionObserver' in window)) return;
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const index = [...element.parentElement.children].indexOf(element);
      const stagger = element.matches('.service-card, .process-steps > li, .earlier-grid > article') ? index % 3 * 70 : 0;
      reveal(element, stagger);
      revealObserver.unobserve(element);
    });
  }, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.section-heading, .section-intro, .about-content, .service-card, .industry-explorer, .process-intro, .process-steps > li, .document-visual, .quality-copy, .featured-employer, .earlier-grid > article, .credentials, .context-layout, .faq-layout, .contact-top').forEach(element => revealObserver.observe(element));
}
function stopAnimations() {
  revealObserver?.disconnect();
  runningAnimations.forEach(animation => animation.cancel());
  runningAnimations.clear();
  document.documentElement.classList.remove('motion-ready');
  document.querySelector('.portrait-frame').style.removeProperty('--tilt-x');
  document.querySelector('.portrait-frame').style.removeProperty('--tilt-y');
}
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) stopAnimations();
});
startEntranceAnimations();

// Animate newly selected content once, without delaying keyboard interaction.
tabs.forEach(tab => tab.addEventListener('click', () => {
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  animateElement(panel, [{ opacity: .35, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 280 });
}));
document.querySelectorAll('details').forEach(details => {
  details.addEventListener('toggle', () => {
    if (details.open) [...details.children].filter(child => child.tagName !== 'SUMMARY').forEach(child => {
      animateElement(child, [{ opacity: .2 }, { opacity: 1 }], { duration: 250 });
    });
  });
});

// Small pointer-responsive highlights, only on devices that support hover.
const portrait = document.querySelector('.portrait-frame');
let pointerFrame = null;
let pointerEvent = null;
portrait.addEventListener('pointermove', event => {
  if (!finePointer.matches || motionPreference.matches) return;
  pointerEvent = { x: event.clientX, y: event.clientY };
  if (pointerFrame !== null) return;
  pointerFrame = requestAnimationFrame(() => {
    const box = portrait.getBoundingClientRect();
    const x = Math.max(-.5, Math.min(.5, (pointerEvent.x - box.left) / box.width - .5));
    const y = Math.max(-.5, Math.min(.5, (pointerEvent.y - box.top) / box.height - .5));
    portrait.style.setProperty('--tilt-x', `${-y * 4}deg`);
    portrait.style.setProperty('--tilt-y', `${x * 4}deg`);
    pointerFrame = null;
  });
});
function resetPortrait() {
  if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
  pointerFrame = null;
  portrait.style.setProperty('--tilt-x', '0deg');
  portrait.style.setProperty('--tilt-y', '0deg');
}
portrait.addEventListener('pointerleave', resetPortrait);
finePointer.addEventListener('change', resetPortrait);
document.querySelectorAll('.service-card').forEach(card => {
  card.addEventListener('pointermove', event => {
    if (!finePointer.matches || motionPreference.matches) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--pointer-x', `${event.clientX - box.left}px`);
    card.style.setProperty('--pointer-y', `${event.clientY - box.top}px`);
  });
});
window.addEventListener('scroll', () => header.classList.toggle('has-scrolled', window.scrollY > 20), { passive: true });
