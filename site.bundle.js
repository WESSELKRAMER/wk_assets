gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

function initNavMenu() {
  const navToggle = document.querySelector('[data-nav-status]');
  const toggleBtn = navToggle.querySelector('[data-nav-toggle="toggle"]');
  const links = Array.from(navToggle.querySelectorAll('[data-menu-link]'));

  function isOpen() {
    return navToggle.getAttribute('data-nav-status') === 'active';
  }

  function openMenu() {
    navToggle.setAttribute('data-nav-status', 'active');
    lenis.stop();
  }

  function closeMenu() {
    navToggle.setAttribute('data-nav-status', 'not-active');
    lenis.start();
  }

  toggleBtn.addEventListener('click', () => {
    isOpen() ? closeMenu() : openMenu();
  });

  toggleBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      isOpen() ? closeMenu() : openMenu();
    }
  });

  links.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  const closeTargets = Array.from(navToggle.querySelectorAll('[data-nav-toggle="close"]'));
  closeTargets.forEach((closeEl) => {
    closeEl.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (isOpen() && !navToggle.contains(e.target)) closeMenu();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavMenu();
});
