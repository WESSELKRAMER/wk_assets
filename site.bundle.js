(function () {
  "use strict";

  function boot() {
  if (typeof gsap === "undefined") {
    console.warn("[main.js] GSAP not found");
    return;
  }

  const plugins = [];
  if (typeof ScrollTrigger !== "undefined") plugins.push(ScrollTrigger);
  if (typeof SplitText !== "undefined") plugins.push(SplitText);
  if (typeof ScrambleTextPlugin !== "undefined") plugins.push(ScrambleTextPlugin);
  if (typeof CustomEase !== "undefined") plugins.push(CustomEase);
  gsap.registerPlugin(...plugins);

  history.scrollRestoration = "manual";

  let lenis = null;
  let nextPage = document;
  let onceFunctionsInitialized = false;

  const hasLenis = typeof window.Lenis !== "undefined";
  const hasScrollTrigger = typeof ScrollTrigger !== "undefined";
  const hasCustomEase = typeof CustomEase !== "undefined";

  const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = rmMQ.matches;
  rmMQ.addEventListener?.("change", (e) => (reducedMotion = e.matches));
  rmMQ.addListener?.((e) => (reducedMotion = e.matches));

  const has = (s) => !!nextPage.querySelector(s);

  let staggerDefault = 0.05;
  let durationDefault = 0.6;

  if (hasCustomEase) CustomEase.create("osmo", "0.625, 0.05, 0, 1");
  gsap.defaults({ ease: hasCustomEase ? "osmo" : "power3.inOut", duration: durationDefault });

  const pageScopes = new WeakMap();

  function getScope(container) {
    let scope = pageScopes.get(container);
    if (!scope) {
      scope = { ctx: gsap.context(() => {}), cleanups: [] };
      pageScopes.set(container, scope);
    }
    return scope;
  }

  function destroyScope(container) {
    const scope = pageScopes.get(container);
    if (!scope) return;
    scope.cleanups.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.warn(error);
      }
    });
    scope.ctx.revert();
    pageScopes.delete(container);
  }

  function listen(scope, target, type, handler, options) {
    target.addEventListener(type, handler, options);
    scope.cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  function initOnceFunctions() {
    initLenis();
    if (onceFunctionsInitialized) return;
    onceFunctionsInitialized = true;

    initMenuGrow();
    initTabsReveal();
  }

  function initBeforeEnterFunctions(next) {
    nextPage = next || document;
    const scope = getScope(nextPage);

    scope.ctx.add(() => {
      if (has("[data-align-menu-bottom]")) initAlignToMenu(nextPage, scope);
      if (has("[data-cascading-slider-wrap]")) initCascadingSlider(nextPage, scope);
    });
  }

  function initAfterEnterFunctions(next) {
    nextPage = next || document;
    const container = nextPage;
    const scope = getScope(container);

    document.fonts.ready.then(() => {
      if (container !== document && !container.isConnected) return;
      scope.ctx.add(() => {
        initScrambleOnLoad(container);
        initMaskTextScrollReveal(container);
        initHighlightMarkerTextReveal(container, scope);
      });
    });

    if (hasLenis && lenis) {
      lenis.resize();
    }

    if (hasScrollTrigger) {
      ScrollTrigger.refresh();
    }
  }

  const pixelHorizontalAmount = 12;
  const transitionDuration = 1;
  const pixelFadeDuration = 0.2;
  const pixelOverlap = 0.3;

  function runPageOnceAnimation(next) {
    const tl = gsap.timeline();

    tl.call(() => {
      resetPage(next);
    }, null, 0);

    return tl;
  }

  function runPageLeaveAnimation(current, next) {
    const tl = gsap.timeline();

    if (reducedMotion) {
      tl.set(current, { autoAlpha: 0 });
      tl.call(() => current.remove(), null, 0);
      return tl;
    }

    const isPortrait = window.innerHeight > window.innerWidth;
    pixelGrid(isPortrait);

    const transitionWrap = document.querySelector("[data-transition-wrap]");
    const transitionPanel = transitionWrap.querySelector("[data-transition-panel]");
    const lines = Array.from(transitionPanel.querySelectorAll("[data-transition-col]"));
    const allPixels = transitionPanel.querySelectorAll("[data-transition-pixel]");

    const overlap = Math.max(0, Math.min(1, pixelOverlap));
    const clipFrom = isPortrait ? "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)" : "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)";
    const clipTo = isPortrait ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" : "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
    const clipStart = Math.min(pixelFadeDuration, transitionDuration * 0.5);
    const clipDuration = Math.max(0.001, transitionDuration - 2 * clipStart);
    const stepDur = clipDuration / Math.max(1, pixelHorizontalAmount);
    const transitionEndDelay = transitionDuration / Math.max(1, pixelHorizontalAmount);

    gsap.set(allPixels, { opacity: 0, willChange: "opacity" });
    gsap.set(transitionPanel, { opacity: 1, willChange: "opacity" });

    gsap.set(next, {
      autoAlpha: 1,
      clipPath: clipFrom,
      webkitClipPath: clipFrom,
      willChange: "clip-path",
      force3D: true,
      maxHeight: "100dvh"
    });

    lines.forEach((line, i) => {
      const pixels = Array.from(line.querySelectorAll("[data-transition-pixel]"));
      if (!pixels.length) return;

      const revealTime = clipStart + i * stepDur;
      const fillStart = Math.max(0, revealTime - pixelFadeDuration);
      const fadeStart = Math.min(transitionDuration, revealTime + stepDur);
      const perPixelMin = pixelFadeDuration / pixels.length;
      const perPixelDur = perPixelMin * (1 - overlap) + pixelFadeDuration * overlap;
      const spread = Math.max(0, pixelFadeDuration - perPixelDur);

      tl.to(pixels, {
        opacity: 1,
        duration: Math.max(0.001, perPixelDur),
        ease: "none",
        stagger: {
          amount: spread,
          from: "random"
        }
      }, fillStart);

      tl.to(pixels, {
        opacity: 0,
        duration: Math.max(0.001, perPixelDur),
        ease: "none",
        stagger: {
          amount: spread,
          from: "random"
        }
      }, fadeStart);
    });

    tl.to(next, {
      clipPath: clipTo,
      webkitClipPath: clipTo,
      ease: `steps(${pixelHorizontalAmount}, start)`,
      duration: clipDuration
    }, clipStart);

    tl.set(next, { clearProps: "clipPath,webkitClipPath,willChange,force3D,maxHeight" }, clipStart + clipDuration);

    tl.call(() => {
      current.remove();
    }, null, transitionDuration + transitionEndDelay);

    tl.set(allPixels, { clearProps: "willChange" }, transitionDuration + transitionEndDelay);
    tl.set(transitionPanel, { clearProps: "willChange" }, transitionDuration + transitionEndDelay);

    return tl;
  }

  function runPageEnterAnimation(next) {
    const tl = gsap.timeline();
    const transitionEndDelay = transitionDuration / Math.max(1, pixelHorizontalAmount);

    if (reducedMotion) {
      tl.set(next, { autoAlpha: 1 });
      tl.add("pageReady");
      tl.call(resetPage, [next], "pageReady");
      return new Promise((resolve) => tl.call(resolve, null, "pageReady"));
    }

    tl.add("pageReady", transitionDuration + transitionEndDelay);
    tl.call(resetPage, [next], "pageReady");

    return new Promise((resolve) => {
      tl.call(resolve, null, "pageReady");
    });
  }

  function pixelGrid(isPortrait) {
    const panel = document.querySelector("[data-transition-panel]");
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    panel.style.flexDirection = isPortrait ? "column" : "row";

    const lineSizePx = isPortrait ? rect.height / pixelHorizontalAmount : rect.width / pixelHorizontalAmount;
    const crossAmount = Math.ceil((isPortrait ? rect.width : rect.height) / lineSizePx);

    let lines = panel.querySelectorAll("[data-transition-col]");
    const lineTemplate = lines[0];
    const pixelTemplate = lineTemplate.querySelector("[data-transition-pixel]");

    if (lines.length !== pixelHorizontalAmount) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < pixelHorizontalAmount; i++) {
        frag.appendChild(lineTemplate.cloneNode(false));
      }
      panel.replaceChildren(frag);
      lines = panel.querySelectorAll("[data-transition-col]");
    }

    lines.forEach((line) => {
      line.style.flexDirection = isPortrait ? "row" : "column";
      line.style.flex = "1 1 auto";
      line.style.justifyContent = "center";

      const diff = crossAmount - line.childElementCount;

      if (diff > 0) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < diff; i++) {
          frag.appendChild(pixelTemplate.cloneNode(true));
        }
        line.appendChild(frag);
      } else if (diff < 0) {
        for (let i = diff; i < 0; i++) {
          line.lastElementChild.remove();
        }
      }
    });
  }


  const themeConfig = {
    light: {
      nav: "dark",
      transition: "light"
    },
    dark: {
      nav: "light",
      transition: "dark"
    }
  };

  function applyThemeFrom(container) {
    const pageTheme = container?.dataset?.pageTheme || "light";
    const config = themeConfig[pageTheme] || themeConfig.light;

    document.body.dataset.pageTheme = pageTheme;
    const transitionEl = document.querySelector("[data-theme-transition]");
    if (transitionEl) {
      transitionEl.dataset.themeTransition = config.transition;
    }

    const nav = document.querySelector("[data-theme-nav]");
    if (nav) {
      nav.dataset.themeNav = config.nav;
    }
  }

  function initLenis() {
    if (lenis) return;
    if (!hasLenis) return;

    lenis = new Lenis({
      lerp: 0.165,
      wheelMultiplier: 1.25
    });

    if (hasScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
    }

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  function resetPage(container) {
    window.scrollTo(0, 0);
    gsap.set(container, { clearProps: "position,top,left,right" });

    if (hasLenis && lenis) {
      lenis.resize();
      lenis.start();
    }
  }

  function debounceOnWidthChange(fn, ms) {
    let last = innerWidth;
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (innerWidth !== last) {
          last = innerWidth;
          fn.apply(this, args);
        }
      }, ms);
    };
  }

  function isPersistent(el) {
    return !el.closest('[data-barba="container"]');
  }

  function initBarbaNavUpdate(data) {
    const tpl = document.createElement("template");
    tpl.innerHTML = data.next.html.trim();
    const nextNodes = Array.from(tpl.content.querySelectorAll("[data-barba-update]")).filter(isPersistent);
    const currentNodes = Array.from(document.querySelectorAll("[data-barba-update]")).filter(isPersistent);

    currentNodes.forEach((curr, index) => {
      const next = nextNodes[index];
      if (!next) return;

      const newStatus = next.getAttribute("aria-current");
      if (newStatus !== null) {
        curr.setAttribute("aria-current", newStatus);
      } else {
        curr.removeAttribute("aria-current");
      }

      const newClassList = next.getAttribute("class") || "";
      curr.setAttribute("class", newClassList);
    });
  }

  function resetWebflow(data) {
    const dom = new DOMParser().parseFromString(data.next.html, "text/html");
    const pageId = dom.documentElement.getAttribute("data-wf-page");
    if (pageId) document.documentElement.setAttribute("data-wf-page", pageId);

    if (window.Webflow) {
      window.Webflow.destroy?.();
      window.Webflow.ready?.();
      window.Webflow.require?.("ix2")?.init?.();
    }
  }

  function initMenuGrow() {
    document.querySelectorAll("[data-menu-grow]").forEach((el) => {
      const height = el.dataset.menuGrowHeight || "10rem";
      const duration = parseFloat(el.dataset.menuGrowDuration);
      const delay = parseFloat(el.dataset.menuGrowDelay);
      const skipMobile = el.dataset.menuGrowMobile === "off";

      gsap.matchMedia().add(skipMobile ? "(min-width: 480px)" : "all", () => {
        if (reducedMotion) {
          gsap.set(el, { minHeight: height });
          return;
        }

        gsap.to(el, {
          minHeight: height,
          duration: isNaN(duration) ? 1 : duration,
          delay: isNaN(delay) ? 0.2 : delay,
          ease: "expo.inOut"
        });
      });
    });
  }

  function initTabsReveal() {
    document.querySelectorAll("[data-tabs-reveal]").forEach((wrapper) => {
      const tabs = wrapper.children;
      if (!tabs.length) return;

      gsap.set(tabs, { autoAlpha: 1 });
      if (reducedMotion) return;

      const duration = parseFloat(wrapper.dataset.tabsRevealDuration);
      const stagger = parseFloat(wrapper.dataset.tabsRevealStagger);
      const delay = parseFloat(wrapper.dataset.tabsRevealDelay);
      const bounce = parseFloat(wrapper.dataset.tabsRevealBounce);

      gsap.set(wrapper, { clipPath: "inset(-100vh -100vw 0 -100vw)" });

      gsap.from(tabs, {
        yPercent: 100,
        duration: isNaN(duration) ? 0.9 : duration,
        stagger: isNaN(stagger) ? 0.1 : stagger,
        delay: isNaN(delay) ? 0.3 : delay,
        ease: `back.out(${isNaN(bounce) ? 1.6 : bounce})`,
        clearProps: "transform",
        onComplete: () => gsap.set(wrapper, { clearProps: "clipPath" })
      });
    });
  }

  function initAlignToMenu(container, scope) {
    const menu = document.querySelector("[data-align-menu-source]") || document.querySelector(".menu_wrapper");
    const targets = container.querySelectorAll("[data-align-menu-bottom]");
    if (!menu || !targets.length) return;

    const mq = window.matchMedia("(min-width: 480px)");

    const update = () => {
      targets.forEach((el) => {
        if (!mq.matches) {
          el.style.minHeight = "";
          return;
        }
        const height = menu.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
        el.style.minHeight = Math.max(0, height) + "px";
      });
    };

    const observer = new ResizeObserver(update);
    observer.observe(menu);
    targets.forEach((el) => observer.observe(el));
    scope.cleanups.push(() => observer.disconnect());

    listen(scope, window, "resize", update);
    listen(scope, mq, "change", update);
    update();
  }

  function initScrambleOnLoad(container) {
    if (reducedMotion || typeof ScrambleTextPlugin === "undefined") return;

    container.querySelectorAll('[data-scramble="load"]').forEach((target) => {
      const split = SplitText.create(target, {
        type: "words, chars",
        wordsClass: "word",
        charsClass: "char"
      });

      gsap.to(split.words, {
        duration: 1.2,
        stagger: 0.01,
        ease: "power1.out",
        scrambleText: {
          text: "{original}",
          chars: "upperCase",
          speed: 0.85
        },
        onComplete: () => split.revert()
      });
    });
  }

  const splitConfig = {
    lines: { duration: 0.8, stagger: 0.08 },
    words: { duration: 0.6, stagger: 0.06 },
    chars: { duration: 0.4, stagger: 0.01 }
  };

  function initMaskTextScrollReveal(container) {
    container.querySelectorAll('[data-split="heading"]').forEach((heading) => {
      gsap.set(heading, { autoAlpha: 1 });
      if (reducedMotion) return;

      const type = splitConfig[heading.dataset.splitReveal] ? heading.dataset.splitReveal : "lines";
      const typesToSplit =
        type === "lines" ? ["lines"] :
        type === "words" ? ["lines", "words"] :
        ["lines", "words", "chars"];

      const inViewOnLoad = heading.getBoundingClientRect().top < window.innerHeight;

      const duration = parseFloat(heading.dataset.splitDuration);
      const stagger = parseFloat(heading.dataset.splitStagger);
      const delay = parseFloat(heading.dataset.splitDelay);

      SplitText.create(heading, {
        type: typesToSplit.join(", "),
        mask: "lines",
        autoSplit: true,
        linesClass: "line",
        wordsClass: "word",
        charsClass: "letter",
        onSplit(instance) {
          const config = splitConfig[type];
          const vars = {
            yPercent: 110,
            duration: isNaN(duration) ? config.duration : duration,
            stagger: isNaN(stagger) ? config.stagger : stagger,
            delay: isNaN(delay) ? (inViewOnLoad ? 0.1 : 0) : delay,
            ease: "expo.out"
          };

          if (!inViewOnLoad && hasScrollTrigger) {
            vars.scrollTrigger = {
              trigger: heading,
              start: "clamp(top 80%)",
              once: true
            };
          }

          return gsap.from(instance[type], vars);
        }
      });
    });
  }

  function initHighlightMarkerTextReveal(container, scope) {
    const elements = container.querySelectorAll("[data-highlight-marker-reveal]");
    if (!elements.length) return;

    if (reducedMotion) {
      gsap.set(elements, { autoAlpha: 1 });
      return;
    }

    const defaults = {
      direction: "right",
      theme: "orange",
      scrollStart: "top 90%",
      staggerStart: "start",
      stagger: 100,
      barDuration: 0.6,
      barEase: "power3.inOut"
    };

    const colorMap = {
      orange: "#FF6831",
      white: "#FFFFFF"
    };

    const directionMap = {
      right: { prop: "scaleX", origin: "right center" },
      left: { prop: "scaleX", origin: "left center" },
      up: { prop: "scaleY", origin: "center top" },
      down: { prop: "scaleY", origin: "center bottom" }
    };

    function resolveColor(value) {
      if (colorMap[value]) return colorMap[value];
      if (value.startsWith("--")) {
        return getComputedStyle(document.body).getPropertyValue(value).trim() || value;
      }
      return value;
    }

    function getBottomMargin(scrollStart) {
      const match = scrollStart.match(/top\s+(\d+(?:\.\d+)?)%/);
      return match ? Math.max(0, 100 - parseFloat(match[1])) : 10;
    }

    function createBar(color, origin) {
      const bar = document.createElement("div");
      bar.className = "highlight-marker-bar";
      Object.assign(bar.style, { backgroundColor: color, transformOrigin: origin });
      return bar;
    }

    scope.cleanups.push(() => {
      elements.forEach((el) => el._highlightMarkerReveal?.observer?.disconnect());
    });

    elements.forEach((el) => {
      const direction = el.getAttribute("data-marker-direction") || defaults.direction;
      const theme = el.getAttribute("data-marker-theme") || defaults.theme;
      const scrollStart = el.getAttribute("data-marker-scroll-start") || defaults.scrollStart;
      const staggerStart = el.getAttribute("data-marker-stagger-start") || defaults.staggerStart;
      const staggerOffset = (parseFloat(el.getAttribute("data-marker-stagger")) || defaults.stagger) / 1000;
      const delayAttr = parseFloat(el.getAttribute("data-marker-delay"));

      const color = resolveColor(theme);
      const dirConfig = directionMap[direction] || directionMap.right;
      const bottomMargin = getBottomMargin(scrollStart);

      const inViewOnLoad = el.getBoundingClientRect().top < window.innerHeight;
      const delay = isNaN(delayAttr) ? (inViewOnLoad ? 0.1 : 0) : delayAttr;

      el._highlightMarkerReveal = { played: false, started: false };

      el._highlightMarkerReveal.split = SplitText.create(el, {
        type: "lines",
        linesClass: "highlight-marker-line",
        autoSplit: true,
        onSplit(self) {
          const instance = el._highlightMarkerReveal;
          const previousProgress = instance.timeline ? instance.timeline.progress() : 0;

          instance.timeline?.kill();
          instance.observer?.disconnect();
          el.querySelectorAll(".highlight-marker-bar").forEach((bar) => bar.remove());

          const lines = self.lines;
          const tl = gsap.timeline({ paused: true });

          lines.forEach((line, i) => {
            gsap.set(line, { position: "relative", overflow: "hidden" });

            const bar = createBar(color, dirConfig.origin);
            line.appendChild(bar);

            const staggerIndex = staggerStart === "end" ? lines.length - 1 - i : i;

            tl.to(bar, {
              [dirConfig.prop]: 0,
              duration: defaults.barDuration,
              ease: defaults.barEase
            }, staggerIndex * staggerOffset);
          });

          gsap.set(el, { autoAlpha: 1 });

          instance.timeline = tl;

          if (instance.played) {
            tl.progress(previousProgress);
            if (instance.started && previousProgress < 1) tl.play();
            return;
          }

          const play = () => {
            instance.played = true;
            instance.observer?.disconnect();
            instance.delayedCall = gsap.delayedCall(delay, () => {
              instance.started = true;
              instance.timeline.play();
            });
          };

          if (inViewOnLoad) {
            play();
          } else {
            instance.observer = new IntersectionObserver((entries) => {
              if (entries.some((entry) => entry.isIntersecting)) play();
            }, { rootMargin: `0px 0px -${bottomMargin}% 0px` });
            instance.observer.observe(el);
          }
        }
      });
    });
  }

  function initCascadingSlider(container, scope) {
    const duration = 0.65;
    const ease = "power3.inOut";

    const breakpoints = [
      { maxWidth: 479, activeWidth: 0.78, siblingWidth: 0.08 },
      { maxWidth: 767, activeWidth: 0.70, siblingWidth: 0.10 },
      { maxWidth: 991, activeWidth: 0.60, siblingWidth: 0.10 },
      { maxWidth: Infinity, activeWidth: 0.60, siblingWidth: 0.13 }
    ];

    container.querySelectorAll("[data-cascading-slider-wrap]").forEach(setupInstance);

    function setupInstance(wrapper) {
      const viewport = wrapper.querySelector("[data-cascading-viewport]");
      if (!viewport) return;

      const prevButton = wrapper.querySelector("[data-cascading-slider-prev]") || container.querySelector("[data-cascading-slider-prev]");
      const nextButton = wrapper.querySelector("[data-cascading-slider-next]") || container.querySelector("[data-cascading-slider-next]");
      const slides = Array.from(viewport.querySelectorAll("[data-cascading-slide]"));
      const originalTotal = slides.length;
      let totalSlides = slides.length;

      if (totalSlides === 0) return;

      if (totalSlides < 9) {
        const originalSlides = slides.slice();
        while (slides.length < 9) {
          originalSlides.forEach((original) => {
            const clone = original.cloneNode(true);
            clone.setAttribute("data-clone", "");
            viewport.appendChild(clone);
            slides.push(clone);
          });
        }
        totalSlides = slides.length;
      }

      let activeIndex = 0;
      let isAnimating = false;
      let slideWidth = 0;
      const slotCenters = {};
      const slotWidths = {};

      const pad = (num) => (num < 10 ? "0" + num : String(num));

      container.querySelectorAll('[data-slide-count="total"]').forEach((el) => {
        el.textContent = pad(originalTotal);
      });

      const stepGroups = [];
      container.querySelectorAll('[data-slide-count="step"]').forEach((stepElement) => {
        const parent = stepElement.parentElement;
        if (!parent || parent.hasAttribute("data-slide-count-ready")) return;
        parent.setAttribute("data-slide-count-ready", "");
        parent.innerHTML = "";
        for (let i = 0; i < originalTotal; i++) {
          const clone = stepElement.cloneNode(true);
          clone.textContent = pad(i + 1);
          parent.appendChild(clone);
        }
        parent.style.overflow = "hidden";
        parent.style.display = "flex";
        parent.style.flexDirection = "column";
        stepGroups.push({ parent: parent, steps: parent.querySelectorAll('[data-slide-count="step"]') });
      });

      function sizeCounter() {
        stepGroups.forEach((group) => {
          group.parent.style.height = group.steps[0].offsetHeight + "px";
        });
      }

      function updateCounter(animate) {
        const realIndex = activeIndex % originalTotal;
        stepGroups.forEach((group) => {
          if (animate) {
            gsap.to(group.steps, { yPercent: -100 * realIndex, ease: "power3", duration: 0.45, overwrite: true });
          } else {
            gsap.set(group.steps, { yPercent: -100 * realIndex });
          }
        });
      }

      if (stepGroups.length) {
        const counterObserver = new ResizeObserver(sizeCounter);
        stepGroups.forEach((group) => counterObserver.observe(group.steps[0]));
        scope.cleanups.push(() => counterObserver.disconnect());
        sizeCounter();
      }

      function readGap() {
        const raw = getComputedStyle(viewport).getPropertyValue("--gap").trim();
        if (!raw) return 0;
        const temp = document.createElement("div");
        temp.style.width = raw;
        temp.style.position = "absolute";
        temp.style.visibility = "hidden";
        viewport.appendChild(temp);
        const px = temp.offsetWidth;
        viewport.removeChild(temp);
        return px;
      }

      function getSettings() {
        const windowWidth = window.innerWidth;
        for (let i = 0; i < breakpoints.length; i++) {
          if (windowWidth <= breakpoints[i].maxWidth) return breakpoints[i];
        }
        return breakpoints[breakpoints.length - 1];
      }

      function getOffset(slideIndex, fromIndex) {
        if (fromIndex === undefined) fromIndex = activeIndex;
        let distance = slideIndex - fromIndex;
        const half = totalSlides / 2;
        if (distance > half) distance -= totalSlides;
        if (distance < -half) distance += totalSlides;
        return distance;
      }

      function measure() {
        const settings = getSettings();
        const viewportWidth = viewport.offsetWidth;
        const gap = readGap();

        const activeSlideWidth = viewportWidth * settings.activeWidth;
        const siblingSlideWidth = viewportWidth * settings.siblingWidth;
        const farSlideWidth = Math.max(0, (viewportWidth - activeSlideWidth - 2 * siblingSlideWidth - 4 * gap) / 2);

        slideWidth = activeSlideWidth;

        const visibleSlots = [
          { slot: -2, width: farSlideWidth },
          { slot: -1, width: siblingSlideWidth },
          { slot: 0, width: activeSlideWidth },
          { slot: 1, width: siblingSlideWidth },
          { slot: 2, width: farSlideWidth }
        ];

        let x = 0;
        visibleSlots.forEach((def, i) => {
          slotCenters[String(def.slot)] = x + def.width / 2;
          slotWidths[String(def.slot)] = def.width;
          if (i < visibleSlots.length - 1) x += def.width + gap;
        });

        slotCenters["-3"] = slotCenters["-2"] - farSlideWidth / 2 - gap - farSlideWidth / 2;
        slotWidths["-3"] = farSlideWidth;
        slotCenters["3"] = slotCenters["2"] + farSlideWidth / 2 + gap + farSlideWidth / 2;
        slotWidths["3"] = farSlideWidth;

        slides.forEach((slide) => {
          slide.style.width = slideWidth + "px";
        });
      }

      function getSlideProps(offset) {
        const clamped = Math.max(-3, Math.min(3, offset));
        const slotWidth = slotWidths[String(clamped)];
        const clipAmount = Math.max(0, (slideWidth - slotWidth) / 2);
        const translateX = slotCenters[String(clamped)] - slideWidth / 2;

        return {
          x: translateX,
          "--clip": clipAmount,
          zIndex: 10 - Math.abs(clamped)
        };
      }

      function layout(animate, previousIndex) {
        slides.forEach((slide, index) => {
          const offset = getOffset(index);

          if (offset < -3 || offset > 3) {
            if (animate && previousIndex !== undefined) {
              const previousOffset = getOffset(index, previousIndex);
              if (previousOffset >= -2 && previousOffset <= 2) {
                const exitSlot = previousOffset < 0 ? -3 : 3;
                gsap.to(slide, Object.assign({}, getSlideProps(exitSlot), {
                  duration: duration,
                  ease: ease,
                  overwrite: true
                }));
                return;
              }
            }

            const parkSlot = offset < 0 ? -3 : 3;
            gsap.set(slide, getSlideProps(parkSlot));
            return;
          }

          const props = getSlideProps(offset);
          slide.setAttribute("data-status", offset === 0 ? "active" : "inactive");

          if (animate) {
            gsap.to(slide, Object.assign({}, props, {
              duration: duration,
              ease: ease,
              overwrite: true
            }));
          } else {
            gsap.set(slide, props);
          }
        });
      }

      function goTo(targetIndex) {
        const normalizedTarget = ((targetIndex % totalSlides) + totalSlides) % totalSlides;
        if (isAnimating || normalizedTarget === activeIndex) return;
        isAnimating = true;

        const previousIndex = activeIndex;
        const travelDirection = getOffset(normalizedTarget, previousIndex) > 0 ? 1 : -1;

        slides.forEach((slide, index) => {
          const currentOffset = getOffset(index, previousIndex);
          const nextOffset = getOffset(index, normalizedTarget);
          const wasInRange = currentOffset >= -3 && currentOffset <= 3;
          const willBeVisible = nextOffset >= -2 && nextOffset <= 2;

          if (!wasInRange && willBeVisible) {
            const entrySlot = travelDirection > 0 ? 3 : -3;
            gsap.set(slide, getSlideProps(entrySlot));
          }

          const wasInvisible = Math.abs(currentOffset) >= 3;
          const willBeStaging = Math.abs(nextOffset) === 3;
          const crossesSides = currentOffset * nextOffset < 0;
          if (wasInvisible && willBeStaging && crossesSides) {
            gsap.set(slide, getSlideProps(nextOffset > 0 ? 3 : -3));
          }
        });

        activeIndex = normalizedTarget;
        layout(true, previousIndex);
        updateCounter(true);
        gsap.delayedCall(duration + 0.05, () => {
          isAnimating = false;
        });
      }

      if (prevButton) {
        listen(scope, prevButton, "click", (event) => {
          event.preventDefault();
          goTo(activeIndex - 1);
        });
      }

      if (nextButton) {
        listen(scope, nextButton, "click", (event) => {
          event.preventDefault();
          goTo(activeIndex + 1);
        });
      }

      slides.forEach((slide, index) => {
        slide.addEventListener("click", () => {
          if (index !== activeIndex) goTo(index);
        });
      });

      listen(scope, document, "keydown", (event) => {
        if (event.key === "ArrowLeft") goTo(activeIndex - 1);
        if (event.key === "ArrowRight") goTo(activeIndex + 1);
      });

      let resizeTimer;
      listen(scope, window, "resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          measure();
          layout(false);
        }, 100);
      });
      scope.cleanups.push(() => clearTimeout(resizeTimer));

      measure();
      layout(false);
      updateCounter(false);
    }
  }
  const THEME_VAR_PREFIX = document.body.dataset.themePrefix || "--_themes---";
  const THEME_DURATION = 1;
  let themeWarningShown = false;

  function getThemeVarNames() {
    const names = [];
    const computed = getComputedStyle(document.body);
    for (let i = 0; i < computed.length; i++) {
      const name = computed[i];
      if (name.startsWith(THEME_VAR_PREFIX)) names.push(name);
    }
    return names;
  }

  function syncBodyTheme(data) {
    const body = document.body;
    const dom = new DOMParser().parseFromString(data.next.html, "text/html");
    const nextClass = dom.body.getAttribute("class") || "";
    const currentClass = body.getAttribute("class") || "";
    if (nextClass === currentClass) return;

    const names = getThemeVarNames();

    if (!names.length && !themeWarningShown) {
      themeWarningShown = true;
      console.warn(`[main.js] No CSS variables starting with "${THEME_VAR_PREFIX}" found on body, theme switches without animation`);
    }

    const fromStyle = getComputedStyle(body);
    const from = {};
    names.forEach((name) => (from[name] = fromStyle.getPropertyValue(name).trim()));

    gsap.killTweensOf(body);
    names.forEach((name) => body.style.removeProperty(name));
    body.setAttribute("class", nextClass);

    if (reducedMotion || !names.length) return;

    const toStyle = getComputedStyle(body);
    const to = {};
    names.forEach((name) => {
      to[name] = toStyle.getPropertyValue(name).trim();
      body.style.setProperty(name, from[name]);
    });

    gsap.to(body, {
      ...to,
      duration: THEME_DURATION,
      ease: "power2.inOut",
      onComplete: () => names.forEach((name) => body.style.removeProperty(name))
    });
  }

  function startWithoutBarba(reason) {
    console.warn("[main.js] Barba disabled: " + reason);
    const container = document.querySelector('[data-barba="container"]') || document;
    initOnceFunctions();
    initBeforeEnterFunctions(container);
    applyThemeFrom(container === document ? null : container);
    initAfterEnterFunctions(container);
  }

  function startWithBarba() {
  barba.hooks.beforeEnter((data) => {
    gsap.set(data.next.container, {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0
    });

    if (lenis && typeof lenis.stop === "function") {
      lenis.stop();
    }

    syncBodyTheme(data);
    initBeforeEnterFunctions(data.next.container);
    applyThemeFrom(data.next.container);
  });

  barba.hooks.afterLeave((data) => {
    if (hasScrollTrigger) {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    }
    destroyScope(data.current.container);
  });

  barba.hooks.enter((data) => {
    initBarbaNavUpdate(data);
  });

  barba.hooks.afterEnter((data) => {
    resetWebflow(data);
    initAfterEnterFunctions(data.next.container);

    if (hasLenis && lenis) {
      lenis.resize();
      lenis.start();
    }

    if (hasScrollTrigger) {
      ScrollTrigger.refresh();
    }
  });

  barba.init({
    debug: true,
    timeout: 7000,
    preventRunning: true,
    transitions: [
      {
        name: "default",
        sync: true,

        async once(data) {
          initOnceFunctions();
          initBeforeEnterFunctions(data.next.container);
          applyThemeFrom(data.next.container);
          const tl = runPageOnceAnimation(data.next.container);
          initAfterEnterFunctions(data.next.container);
          return tl;
        },

        async leave(data) {
          return runPageLeaveAnimation(data.current.container, data.next.container);
        },

        async enter(data) {
          return runPageEnterAnimation(data.next.container);
        }
      }
    ]
  });
  }

  if (typeof barba === "undefined") {
    startWithoutBarba("barba.js not loaded");
  } else if (!document.querySelector('[data-barba="wrapper"]') || !document.querySelector('[data-barba="container"]')) {
    startWithoutBarba('no [data-barba="wrapper"] or [data-barba="container"] found');
  } else {
    try {
      startWithBarba();
    } catch (error) {
      console.error(error);
      startWithoutBarba("barba.init failed");
    }
  }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
