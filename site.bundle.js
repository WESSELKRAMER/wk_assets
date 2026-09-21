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
  const menuWrap = document.querySelector('[data-menu-wrap]');
  const menuBase = menuWrap.querySelector('[data-menu-base]');
  const links = Array.from(menuWrap.querySelectorAll('[data-menu-link]'));

  gsap.set(menuWrap, { display: 'none' });
  gsap.set(menuBase, { opacity: 0 });
  gsap.set(links, { yPercent: 50, opacity: 0 });

  let isOpen = false;

  const tl = gsap.timeline({
    paused: true,
    onStart: () => gsap.set(menuWrap, { display: 'flex' }),
    onReverseComplete: () => gsap.set(menuWrap, { display: 'none' }),
  });

  tl.to(menuBase, { opacity: 1, duration: 0.4, ease: 'power2.out' })
    .to(links, {
      yPercent: 0,
      opacity: 1,
      duration: 0.5,
      stagger: 0.05,
      ease: 'power3.out',
    }, '-=0.2')
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
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();
    tl.play();
  }

  function closeMenu() {
    isOpen = false;
    hamburger.setAttribute('data-nav-open', 'false');
    document.body.style.overflow = '';
    if (window.lenis) window.lenis.start();
    tl.reverse();
  }

  hamburger.addEventListener('click', () => {
    isOpen ? closeMenu() : openMenu();
  });

  links.forEach((link) => {
    if (link.tagName === 'A') {
      link.addEventListener('click', closeMenu);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavMenu();
});
