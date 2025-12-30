// Register ScrollTrigger plugin
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    console.log('ScrollTrigger registered successfully');
} else {
    console.error('GSAP or ScrollTrigger not loaded!');
}

function heroInitialLoadingEffect() {
    const tl = gsap.timeline();

    gsap.set('[remove-fliker]', {opacity: 1})

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

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 gsap-animations.js loaded and DOMContentLoaded fired');
    heroInitialLoadingEffect()
    animateSVGPath()
});

