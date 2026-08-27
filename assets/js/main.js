/* ===== L'Artisan — home page =====
   Home-specific behaviour only. Shared logic (mobile menu, header scroll
   state, reveal-on-scroll, same-page smooth-scroll) lives in store.js,
   which the home page also loads. The experience video is a plain HTML5
   <video controls> player now, so it needs no JavaScript. */

// ===== generic horizontal carousel =====
// Any [data-carousel] with a [data-carousel-track] (and optional
// [data-carousel-dots] + .carousel-arrow.prev/.next inside it) becomes a
// swipe + arrows + dots carousel. Steps by one slide. Powers the product image
// carousels (Signature Kit + Glass Collection) and the reviews carousel.
function laCarousel(root) {
  if (!root) return;
  var track = root.querySelector("[data-carousel-track]");
  if (!track || !track.children.length) return;
  var slides = track.children;
  var count = slides.length;
  var prev = root.querySelector(".carousel-arrow.prev");
  var next = root.querySelector(".carousel-arrow.next");
  var dotsWrap = root.querySelector("[data-carousel-dots]");

  // distance between consecutive slide starts (card width + gap, or full width)
  var step = function () {
    if (count > 1) {
      var d = slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().left;
      if (d > 1) return d;
    }
    return track.clientWidth || 1;
  };
  var index = function () { return Math.round(track.scrollLeft / step()); };

  var dots = [];
  if (dotsWrap) {
    for (var i = 0; i < count; i++) {
      (function (idx) {
        var d = document.createElement("button");
        d.setAttribute("aria-label", "Go to " + (idx + 1));
        d.addEventListener("click", function () {
          track.scrollTo({ left: idx * step(), behavior: "smooth" });
        });
        dotsWrap.appendChild(d);
        dots.push(d);
      })(i);
    }
  }
  var sync = function () {
    var c = Math.max(0, Math.min(count - 1, index()));
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("active", i === c);
  };
  var go = function (dir) {
    var c = Math.max(0, Math.min(count - 1, index() + dir));
    track.scrollTo({ left: c * step(), behavior: "smooth" });
  };
  if (prev) prev.addEventListener("click", function () { go(-1); });
  if (next) next.addEventListener("click", function () { go(1); });
  track.addEventListener("scroll", function () { window.requestAnimationFrame(sync); });
  sync();
}

// ===== init every carousel on the page =====
(function () {
  var roots = document.querySelectorAll("[data-carousel]");
  for (var i = 0; i < roots.length; i++) laCarousel(roots[i]);
})();
