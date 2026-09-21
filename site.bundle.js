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
  const hamburger = document.querySelector('[data-nav-toggle]');
  const menuCard = document.querySelector('[data-menu-wrap]');
  const links = Array.from(menuCard.querySelectorAll('[data-menu-link]'));

  gsap.set(menuCard, { display: 'none' });
  gsap.set(menuCard, { scale: 0.85, opacity: 0, transformOrigin: 'top right' });
  gsap.set(links, { y: 12, opacity: 0 });

  let isOpen = false;

  const tl = gsap.timeline({
    paused: true,
    onStart: () => gsap.set(menuCard, { display: 'flex' }),
    onReverseComplete: () => gsap.set(menuCard, { display: 'none' }),
  });

  tl.to(menuCard, {
    scale: 1,
    opacity: 1,
    duration: 0.45,
    ease: 'power3.out',
  })
    .to(links, {
      y: 0,
      opacity: 1,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power3.out',
    }, '-=0.25')
    .to(hamburger.querySelector('[data-nav-line="top"]'), {
      rotate: 45,
      y: 4,
      duration: 0.3,
      ease: 'power2.inOut',
    }, 0)
    .to(hamburger.querySelector('[data-nav-line="bottom"]'), {
      rotate: -45,
      y: -4,
      duration: 0.3,
      ease: 'power2.inOut',
    }, 0);

  function openMenu() {
    isOpen = true;
    hamburger.setAttribute('data-nav-open', 'true');
    lenis.stop();
    tl.play();
  }

  function closeMenu() {
    isOpen = false;
    hamburger.setAttribute('data-nav-open', 'false');
    lenis.start();
    tl.reverse();
  }

  hamburger.addEventListener('click', () => {
    isOpen ? closeMenu() : openMenu();
  });

  links.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (isOpen && !menuCard.contains(e.target) && !hamburger.contains(e.target)) {
      closeMenu();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavMenu();
});
