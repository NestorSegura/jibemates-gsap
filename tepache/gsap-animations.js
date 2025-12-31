// ============================================================================
// PLUGIN REGISTRATION & DEPENDENCIES
// ============================================================================

// Register ScrollTrigger plugin
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    console.log('ScrollTrigger registered successfully');
} else {
    console.error('GSAP or ScrollTrigger not loaded!');
}

// Lenis smooth scroll
const lenis = new Lenis({
    autoRaf: true,
});


// ============================================================================
// CUSTOM ELEMENTS & COMPONENTS
// ============================================================================

// Predictive Search Component
class PredictiveSearch extends HTMLElement {
    constructor() {
        super();

        this.input = this.querySelector('input[type="search"]');
        this.predictiveSearchResults = this.querySelector('#predictive-search');

        this.input.addEventListener('input', this.debounce((event) => {
            this.onChange(event);
        }, 300).bind(this));
    }

    onChange() {
        const searchTerm = this.input.value.trim();

        if (!searchTerm.length) {
            this.close();
            return;
        }

        this.getSearchResults(searchTerm);
    }

    getSearchResults(searchTerm) {
        fetch(`{% unless request.locale.root_url == '/' %}{{ request.locale.root_url }}{% endunless %}/search/suggest?q=${searchTerm}&section_id=predictive_search`)
            .then((response) => {
                if (!response.ok) {
                    var error = new Error(response.status);
                    this.close();
                    throw error;
                }

                return response.text();
            })
            .then((text) => {
                this.predictiveSearchResults.innerHTML = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive_search').innerHTML;
                this.open();
            })
            .catch((error) => {
                this.close();
                throw error;
            });
    }

    open() {
        this.predictiveSearchResults.style.display = 'block';
    }

    close() {
        this.predictiveSearchResults.style.display = 'none';
    }

    debounce(fn, wait) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }
}

customElements.define('predictive-search', PredictiveSearch);


// ============================================================================
// ANIMATION FUNCTIONS
// ============================================================================

// Button Character Stagger Animation
function initButtonCharacterStagger() {
    const offsetIncrement = 0.01; // Transition offset increment in seconds
    const buttons = document.querySelectorAll('[data-button-animate-chars]');

    buttons.forEach(button => {
        const text = button.textContent; // Get the button's text content
        button.innerHTML = ''; // Clear the original content

        [...text].forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.transitionDelay = `${index * offsetIncrement}s`;

            // Handle spaces explicitly
            if (char === ' ') {
                span.style.whiteSpace = 'pre'; // Preserve space width
            }

            button.appendChild(span);
        });
    });
}

// Content Reveal on Scroll Animation
function initContentRevealScroll() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {

        document.querySelectorAll('[data-reveal-group]').forEach(groupEl => {
            // Config from attributes or defaults (group-level)
            const groupStaggerSec = (parseFloat(groupEl.getAttribute('data-stagger')) || 100) / 1000; // ms → sec
            const groupDistance = groupEl.getAttribute('data-distance') || '2em';
            const triggerStart = groupEl.getAttribute('data-start') || 'top 80%';

            const animDuration = 0.8;
            const animEase = "power4.inOut";

            // Reduced motion: show immediately
            if (prefersReduced) {
                gsap.set(groupEl, { clearProps: 'all', y: 0, autoAlpha: 1 });
                return;
            }

            // If no direct children, animate the group element itself
            const directChildren = Array.from(groupEl.children).filter(el => el.nodeType === 1);
            if (!directChildren.length) {
                gsap.set(groupEl, { y: groupDistance, autoAlpha: 0 });
                ScrollTrigger.create({
                    trigger: groupEl,
                    start: triggerStart,
                    once: true,
                    onEnter: () => gsap.to(groupEl, {
                        y: 0,
                        autoAlpha: 1,
                        duration: animDuration,
                        ease: animEase,
                        onComplete: () => gsap.set(groupEl, { clearProps: 'all' })
                    })
                });
                return;
            }

            // Build animation slots: item or nested (deep layers allowed)
            const slots = [];
            directChildren.forEach(child => {
                const nestedGroup = child.matches('[data-reveal-group-nested]')
                    ? child
                    : child.querySelector(':scope [data-reveal-group-nested]');

                if (nestedGroup) {
                    const includeParent = child.getAttribute('data-ignore') === 'false' || nestedGroup.getAttribute('data-ignore') === 'false';
                    slots.push({ type: 'nested', parentEl: child, nestedEl: nestedGroup, includeParent });
                } else {
                    slots.push({ type: 'item', el: child });
                }
            });

            // Initial hidden state
            slots.forEach(slot => {
                if (slot.type === 'item') {
                    // If the element itself is a nested group, force group distance (prevents it from using its own data-distance)
                    const isNestedSelf = slot.el.matches('[data-reveal-group-nested]');
                    const d = isNestedSelf ? groupDistance : (slot.el.getAttribute('data-distance') || groupDistance);
                    gsap.set(slot.el, { y: d, autoAlpha: 0 });
                } else {
                    // Parent follows the group's distance when included, regardless of nested's data-distance
                    if (slot.includeParent) gsap.set(slot.parentEl, { y: groupDistance, autoAlpha: 0 });
                    // Children use nested group's own distance (fallback to group distance)
                    const nestedD = slot.nestedEl.getAttribute('data-distance') || groupDistance;
                    Array.from(slot.nestedEl.children).forEach(target => gsap.set(target, { y: nestedD, autoAlpha: 0 }));
                }
            });

            // Extra safety: if a nested parent is included, re-assert its distance to the group's value
            slots.forEach(slot => {
                if (slot.type === 'nested' && slot.includeParent) {
                    gsap.set(slot.parentEl, { y: groupDistance });
                }
            });

            // Reveal sequence
            ScrollTrigger.create({
                trigger: groupEl,
                start: triggerStart,
                once: true,
                onEnter: () => {
                    const tl = gsap.timeline();

                    slots.forEach((slot, slotIndex) => {
                        const slotTime = slotIndex * groupStaggerSec;

                        if (slot.type === 'item') {
                            tl.to(slot.el, {
                                y: 0,
                                autoAlpha: 1,
                                duration: animDuration,
                                ease: animEase,
                                onComplete: () => gsap.set(slot.el, { clearProps: 'all' })
                            }, slotTime);
                        } else {
                            // Optionally include the parent at the same slot time (parent uses group distance)
                            if (slot.includeParent) {
                                tl.to(slot.parentEl, {
                                    y: 0,
                                    autoAlpha: 1,
                                    duration: animDuration,
                                    ease: animEase,
                                    onComplete: () => gsap.set(slot.parentEl, { clearProps: 'all' })
                                }, slotTime);
                            }
                            // Nested children use nested stagger (ms → sec); fallback to group stagger
                            const nestedMs = parseFloat(slot.nestedEl.getAttribute('data-stagger'));
                            const nestedStaggerSec = isNaN(nestedMs) ? groupStaggerSec : nestedMs / 1000;
                            Array.from(slot.nestedEl.children).forEach((nestedChild, nestedIndex) => {
                                tl.to(nestedChild, {
                                    y: 0,
                                    autoAlpha: 1,
                                    duration: animDuration,
                                    ease: animEase,
                                    onComplete: () => gsap.set(nestedChild, { clearProps: 'all' })
                                }, slotTime + nestedIndex * nestedStaggerSec);
                            });
                        }
                    });
                }
            });
        });

    });

    return () => ctx.revert();
}

// Highlight Text Animation
function initHighlightText() {

    let splitHeadingTargets = document.querySelectorAll("[data-highlight-text]")
    splitHeadingTargets.forEach((heading) => {

        const scrollStart = heading.getAttribute("data-highlight-scroll-start") || "top 90%"
        const scrollEnd = heading.getAttribute("data-highlight-scroll-end") || "center 40%"
        const fadedValue = heading.getAttribute("data-highlight-fade") || 0.2 // Opacity of letter
        const staggerValue = heading.getAttribute("data-highlight-stagger") || 0.1 // Smoother reveal

        new SplitText(heading, {
            type: "words, chars",
            autoSplit: true,
            onSplit(self) {
                let ctx = gsap.context(() => {
                    let tl = gsap.timeline({
                        scrollTrigger: {
                            scrub: true,
                            trigger: heading,
                            start: scrollStart,
                            end: scrollEnd,
                        }
                    })
                    tl.from(self.chars, {
                        autoAlpha: fadedValue,
                        stagger: staggerValue,
                        ease: "linear"
                    })
                });
                return ctx; // return our animations so GSAP can clean them up when onSplit fires
            }
        });
    });
}

// Overlapping Slider Animation
function initOverlappingSlider() {
    const inits = document.querySelectorAll('[data-overlap-slider-init]');
    if (!inits.length) return;

    inits.forEach(setupOverlappingSlider);

    function setupOverlappingSlider(init) {
        // --- attributes with defaults
        const minScale = +(init.getAttribute('data-scale') ?? 0.45);
        const maxRotation = +(init.getAttribute('data-rotate') ?? -8);
        const inertia = true;

        const wrap = init.querySelector('[data-overlap-slider-collection]');
        const slider = init.querySelector('[data-overlap-slider-list]');
        const slides = Array.from(init.querySelectorAll('[data-overlap-slider-item]'));

        if (!wrap || !slider || !slides.length) {
            console.warn("OverlappingSlider: missing required structure. Check Osmo Vault documentation please.");
            return;
        }

        wrap.style.touchAction = 'none';
        wrap.style.userSelect = 'none';

        let spacing = 0;
        let slideW = 0;
        let maxDrag = 0;
        let dragX = 0;
        let draggable;

        // simple clamp that always uses latest maxDrag
        function clamp(value) {
            if (maxDrag <= 0) return 0;
            return Math.min(Math.max(value, 0), maxDrag);
        }

        function update() {
            // move the whole list
            gsap.set(slider, { x: -dragX });

            // update each slide's overlap transform
            slides.forEach((slide, i) => {
                const threshold = i * spacing;
                const local = Math.max(0, dragX - threshold);
                const t = spacing > 0 ? Math.min(local / spacing, 1) : 0;

                gsap.set(slide, {
                    x: local,
                    scale: 1 - (1 - minScale) * t,
                    rotation: maxRotation * t,
                    transformOrigin: '75% center'
                });
            });
        }

        function recalc() {
            if (!slides.length) return;

            // measure one slide to get width + margin-right as "gap"
            const style = getComputedStyle(slides[0]);
            const gapRight = parseFloat(style.marginRight) || 0;

            slideW = slides[0].offsetWidth;
            spacing = slideW + gapRight;
            maxDrag = spacing * (slides.length - 1);

            // keep dragX within new bounds
            dragX = clamp(dragX);
            update();

            if (draggable) {
                draggable.applyBounds({ minX: -maxDrag, maxX: 0 });
            }
        }

        // create draggable
        draggable = Draggable.create(slider, {
            type: 'x',
            bounds: { minX: -maxDrag, maxX: 0 }, // will be updated after recalc
            inertia,
            maxDuration: 1,
            snap: true
                ? (raw) => {
                    // raw is the x value
                    const d = clamp(-raw);
                    const idx = spacing > 0 ? Math.round(d / spacing) : 0;
                    return -idx * spacing;
                }
                : false,
            onDrag() {
                dragX = clamp(-this.x);
                update();
            },
            onThrowUpdate() {
                dragX = clamp(-this.x);
                update();
            }
        })[0];

        // recalc on resize
        const ro = new ResizeObserver(() => {
            recalc();
        });
        ro.observe(init);

        // keyboard navigation (arrow left/right)
        let active = false;
        let currentIndex = 0;

        // helper function to switch slides
        function goToSlide(idx) {
            idx = Math.max(0, Math.min(idx, slides.length - 1));
            currentIndex = idx;

            const targetX = idx * spacing;

            gsap.to({ value: dragX }, {
                value: targetX,
                duration: 0.35,
                ease: "power4.out",
                onUpdate: function () {
                    dragX = this.targets()[0].value;
                    gsap.set(slider, { x: -dragX });
                    update(); // animate overlap transforms properly
                }
            });

            wrap.setAttribute("aria-label", `Slide ${idx + 1} of ${slides.length}`);
        }

        // Observe visibility
        const io = new IntersectionObserver(entries => {
            active = entries[0].isIntersecting;
        }, {
            threshold: 0.25 // slider must be at least 25% visible
        });

        io.observe(init);

        // Aria labels for accessibility
        wrap.setAttribute("role", "region");
        wrap.setAttribute("aria-roledescription", "carousel");
        wrap.setAttribute("aria-label", "Testimonial slider");

        // key listener
        function onKey(e) {
            if (!active) return; // only respond when slider in view

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                goToSlide(currentIndex - 1);
            }

            if (e.key === "ArrowRight") {
                e.preventDefault();
                goToSlide(currentIndex + 1);
            }
        }
        window.addEventListener("keydown", onKey);

        // initial layout
        recalc();
    }
}

// Hero Initial Loading Effect
function heroInitialLoadingEffect() {
    const tl = gsap.timeline();

    gsap.set('[remove-fliker]', { opacity: 1 })

    tl
        .from('.parallax__header img[data-parallax-layer="4"]', {
            y: 100, opacity: 0, duration: 0.8, ease: 'power3.out'
        })
        .from('.parallax__header img[data-parallax-layer="2"]', {
            y: 100, opacity: 0, duration: 0.8, ease: 'power3.out'
        }, "-=0.4")
        .from('.hero-img-right', {
            x: '150%', duration: 2.5, ease: 'elastic.inOut(1, 0.5)'
        }, '-=2.5')
        .from('.hero-can-fruits', {
            y: 300, opacity: 0, duration: 0.8, ease: 'power3.out'
        }, '-=0.8')
        .from('.parallax__header .heading_h1', {
            y: 50, opacity: 0, duration: 0.6, ease: 'power3.out'
        }, '-=0.4')
        .from('.parallax__header .w-button', {
            y: 50, opacity: 0, duration: 0.6, ease: 'power3.out'
        }, '-=0.4')
        .from('.hero-subtitle', {
            y: 30, opacity: 0, duration: 0.5, ease: 'power3.out'
        }, '-=0.3')
        .from('[slide-from-bottom]', {
            y: 350, duration: 0.5, ease: 'power3.out'
        }, '-=0.8');

    const heroImgRightElements = document.querySelectorAll('.hero-img-right');
    if (heroImgRightElements.length > 0) {
        heroImgRightElements.forEach(element => {
            gsap.fromTo(element, {
                x: '0'
            }, {
                x: '100%', duration: 0.5, ease: 'power3.out',
                scrollTrigger: {
                    trigger: element,
                    start: 'bottom 80%',
                    end: 'bottom 0%',
                    scrub: 1,
                    toggleActions: 'play none none reverse',
                }
            })
        })
    }

    const heroCanFruits = document.querySelector('.hero-can-fruits');
    if (heroCanFruits) {

        gsap.fromTo(heroCanFruits, {
            y: '0'
        }, {
            y: '100%', duration: 0.5, ease: 'power3.out',
            scrollTrigger: {
                trigger: heroCanFruits,
                start: 'bottom 80%',
                end: 'bottom 0%',
                scrub: 1,
                toggleActions: 'play none none reverse',
            }
        })
    }
}

// Animate SVG Path
function animateSVGPath() {
    // Wait a bit to ensure DOM is ready and Lottie has rendered
    setTimeout(() => {
        // Select the SVG container
        const svgContainer = document.querySelector('.arrow-svg');

        if (!svgContainer) {
            return;
        }

        // Get all paths inside (deep search through nested g elements)
        const paths = svgContainer.querySelectorAll('path');

        if (paths.length === 0) {
            return;
        }

        // Create a single timeline for all paths
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: svgContainer,
                start: 'top bottom',    // Start when top of SVG enters bottom of viewport
                end: 'center center',   // End when center of SVG hits center of viewport
                scrub: 1.5,             // Smooth scrubbing with slight lag
                invalidateOnRefresh: true,
            }
        });

        paths.forEach((path) => {
            // Get the total length of the path
            const pathLength = path.getTotalLength();

            // Treat short paths (arrowhead) differently from long paths (spiral)
            const isArrowhead = pathLength < 10; // Arrowhead is ~4.7px

            if (isArrowhead) {
                // For arrowhead: hide initially, then pop in at 90% progress
                path.style.opacity = '0';
                path.setAttribute('stroke-linecap', 'round');

                tl.to(path, {
                    opacity: 1,
                    duration: 0.1,
                    ease: 'power2.out'
                }, 0.65); // Appears at 90% of timeline

            } else {
                // For spiral: draw from start to finish
                path.style.strokeDasharray = pathLength;
                path.style.strokeDashoffset = pathLength;
                path.setAttribute('stroke-linecap', 'butt');

                tl.to(path, {
                    strokeDashoffset: 0,
                    ease: 'none',
                    onComplete: () => {
                        // Restore round linecap when complete
                        path.setAttribute('stroke-linecap', 'round');
                    }
                }, 0); // Starts at beginning
            }
        });

    }, 100); // Small delay to ensure Lottie/DOM is ready
}


// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 gsap-animations.js loaded and DOMContentLoaded fired');

    // Initialize button animations
    initButtonCharacterStagger();

    // Initialize scroll-based animations
    initContentRevealScroll();
    initHighlightText();
    initOverlappingSlider();

    // Initialize hero animations
    heroInitialLoadingEffect();
    animateSVGPath();
});
