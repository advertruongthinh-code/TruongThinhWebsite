// page-home R3, detail-pages R5 (one script for the home, Residential and Commercial heroes): reorder all slides on every load, the preloaded head slide stays first. The DOM changes with it so z-order,
// :first-child (reduced motion) and the first slide of motion.js match the first displayed image; only the first image receives src here.
// A module so it does not block the parser (the hero text paints in the same first paint as before), still runs before motion.js (defer).
// A soft route has no preload: motion.js reruns the classic copy (with currentScript), and the first slide is chosen in place.
(() => {
  const slides = document.currentScript?.previousElementSibling ?? document.querySelector(".hero-slides");
  const first = document.documentElement.dataset.heroFirst;
  delete document.documentElement.dataset.heroFirst;
  [...slides.children].map((slide) => [slide.dataset.slide === first ? -1 : Math.random(), slide])
    .sort(([a], [b]) => a - b)
    .forEach(([, slide], index) => {
      slides.append(slide);
      slide.classList.toggle("is-active", !index);
    });
  let image = slides.querySelector("img");
  // The page-top ResizeObserver tracks this image (while parsing it still has data-srcset) and writes sizes by crop, possibly before
  // this script even runs; a mismatch with the preload sizes="100vw" means loading twice. The copy is not tracked, sizes returns to 100vw
  // like an image with src already present (media-delivery R2).
  image.replaceWith((image = image.cloneNode()));
  image.setAttribute("fetchpriority", "high");
  [...image.parentElement.querySelectorAll(":scope > source"), image].forEach((node) => {
    if (!node?.dataset.srcset) return;
    node.sizes = "100vw";
    node.srcset = node.dataset.srcset;
    node.removeAttribute("data-srcset");
  });
  image.src = image.dataset.src;
  image.removeAttribute("data-src");
})();
