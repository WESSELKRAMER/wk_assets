(function () {
  "use strict";

  function initMenuGrow(reduceMotion) {
    document.querySelectorAll("[data-menu-grow]").forEach((el) => {
      const height = el.dataset.menuGrowHeight || "10rem";
      const duration = parseFloat(el.dataset.menuGrowDuration);
      const delay = parseFloat(el.dataset.menuGrowDelay);
      const skipMobile = el.dataset.menuGrowMobile === "off";

      gsap.matchMedia().add(skipMobile ? "(min-width: 480px)" : "all", () => {
        if (reduceMotion) {
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

  function initAlignToMenu() {
    const menu = document.querySelector("[data-align-menu-source]") || document.querySelector(".menu_wrapper");
    const targets = document.querySelectorAll("[data-align-menu-bottom]");
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

    new ResizeObserver(update).observe(menu);
    window.addEventListener("resize", update);
    mq.addEventListener("change", update);
    update();
  }

  function initTabsReveal(reduceMotion) {
    document.querySelectorAll("[data-tabs-reveal]").forEach((wrapper) => {
      const tabs = wrapper.children;
      if (!tabs.length) return;

      gsap.set(tabs, { autoAlpha: 1 });
      if (reduceMotion) return;

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

  function initScrambleOnLoad(reduceMotion) {
    if (reduceMotion || typeof ScrambleTextPlugin === "undefined") return;

    document.querySelectorAll('[data-scramble="load"]').forEach((target) => {
      const split = SplitText.create(target, {
        type: "words, chars",
        wordsClass: "word",
        charsClass: "char"
      });

      gsap.to(split.words, {
        duration: 1.2,
        stagger: 0.01,
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

  function initMaskTextScrollReveal(reduceMotion) {
    document.querySelectorAll('[data-split="heading"]').forEach((heading) => {
      gsap.set(heading, { autoAlpha: 1 });
      if (reduceMotion) return;

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

          if (!inViewOnLoad) {
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

  function initHighlightMarkerTextReveal(reduceMotion) {
    const elements = document.querySelectorAll("[data-highlight-marker-reveal]");
    if (!elements.length) return;

    if (reduceMotion) {
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

    function cleanupElement(el) {
      if (!el._highlightMarkerReveal) return;
      el._highlightMarkerReveal.timeline?.kill();
      el._highlightMarkerReveal.delayedCall?.kill();
      el._highlightMarkerReveal.observer?.disconnect();
      el._highlightMarkerReveal.split?.revert();
      el.querySelectorAll(".highlight-marker-bar").forEach((bar) => bar.remove());
      delete el._highlightMarkerReveal;
    }

    elements.forEach((el) => {
      cleanupElement(el);

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

  function initCascadingSlider() {
    const duration = 0.65;
    const ease = "power3.inOut";

    const breakpoints = [
      { maxWidth: 479, activeWidth: 0.78, siblingWidth: 0.08 },
      { maxWidth: 767, activeWidth: 0.70, siblingWidth: 0.10 },
      { maxWidth: 991, activeWidth: 0.60, siblingWidth: 0.10 },
      { maxWidth: Infinity, activeWidth: 0.60, siblingWidth: 0.13 }
    ];

    document.querySelectorAll("[data-cascading-slider-wrap]").forEach(setupInstance);

    function setupInstance(wrapper) {
      const viewport = wrapper.querySelector("[data-cascading-viewport]");
      if (!viewport) return;

      const prevButton = wrapper.querySelector("[data-cascading-slider-prev]") || document.querySelector("[data-cascading-slider-prev]");
      const nextButton = wrapper.querySelector("[data-cascading-slider-next]") || document.querySelector("[data-cascading-slider-next]");
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

      document.querySelectorAll('[data-slide-count="total"]').forEach((el) => {
        el.textContent = pad(originalTotal);
      });

      const stepGroups = [];
      document.querySelectorAll('[data-slide-count="step"]').forEach((stepElement) => {
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

      if (prevButton) prevButton.addEventListener("click", (event) => {
        event.preventDefault();
        goTo(activeIndex - 1);
      });

      if (nextButton) nextButton.addEventListener("click", (event) => {
        event.preventDefault();
        goTo(activeIndex + 1);
      });

      slides.forEach((slide, index) => {
        slide.addEventListener("click", () => {
          if (index !== activeIndex) goTo(index);
        });
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") goTo(activeIndex - 1);
        if (event.key === "ArrowRight") goTo(activeIndex + 1);
      });

      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          measure();
          layout(false);
        }, 100);
      });

      measure();
      layout(false);
      updateCounter(false);
    }
  }

  function init() {
    if (typeof gsap === "undefined") {
      console.warn("GSAP not found");
      return;
    }

    const plugins = [
      typeof ScrollTrigger !== "undefined" ? ScrollTrigger : null,
      typeof SplitText !== "undefined" ? SplitText : null,
      typeof ScrambleTextPlugin !== "undefined" ? ScrambleTextPlugin : null
    ].filter(Boolean);

    gsap.registerPlugin(...plugins);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    initMenuGrow(reduceMotion);
    initAlignToMenu();
    initTabsReveal(reduceMotion);
    initCascadingSlider();

    document.fonts.ready.then(() => {
      initScrambleOnLoad(reduceMotion);
      initMaskTextScrollReveal(reduceMotion);
      initHighlightMarkerTextReveal(reduceMotion);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
