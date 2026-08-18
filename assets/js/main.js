/* ===== L'Artisan — home page =====
   Home-specific behaviour only. Shared logic (mobile menu, header scroll
   state, reveal-on-scroll, same-page smooth-scroll) lives in store.js,
   which the home page also loads. */

// ===== experience video: loads only on tap (preload=none); poster until then =====
(function () {
  var stage = document.getElementById("videoStage");
  var v = document.getElementById("expVideo");
  var btn = document.getElementById("playBtn");
  if (!stage || !v || !btn) return;
  btn.addEventListener("click", function () {
    stage.classList.add("playing");            // reveal the video, hide the poster overlay
    v.play().catch(function () {                // user tapped, so sound is allowed;
      v.muted = true; v.play();                 // fall back to muted only if a browser blocks it
    });
  });
})();

// ===== generic horizontal carousel =====
// Any [data-carousel] with a [data-carousel-track] (and optional
// [data-carousel-dots] + .carousel-arrow.prev/.next inside it) becomes a
// swipe + arrows + dots carousel. Steps by one slide. Powers the product
// image carousel, the reviews carousel, and the UGC video strip.
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

// ===== customer video strip (UGC) — data-driven placeholders =====
// Publish real clips later by filling these objects — src (mp4), poster (image),
// name, rating (1–5). No markup changes needed: empty entries render as
// "Video coming soon" placeholder cards, filled entries render a <video>.
var UGC_VIDEOS = [
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 },
  { src: "", poster: "", name: "", rating: 0 }
];
(function () {
  var track = document.getElementById("ugcTrack");
  if (!track) return;
  var stars = function (n) {
    n = Math.max(0, Math.min(5, n | 0));
    var glyphs = "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
    return '<div class="ugc-stars' + (n ? '' : ' is-empty') + '" '
      + (n ? 'aria-label="Rated ' + n + ' out of 5"' : 'aria-hidden="true"') + '>' + glyphs + '</div>';
  };
  var html = "";
  UGC_VIDEOS.forEach(function (v) {
    var media = v.src
      ? '<div class="ugc-media"><video class="ugc-video" playsinline preload="none" controls'
          + (v.poster ? ' poster="' + v.poster + '"' : '') + '><source src="' + v.src + '" type="video/mp4"></video></div>'
      : '<div class="ugc-media"><span class="ugc-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>'
          + '<span class="ugc-ph-label">Video coming soon</span></div>';
    html += '<article class="ugc-card">' + media
      + '<div class="ugc-meta">' + stars(v.rating)
      + '<div class="ugc-name">' + (v.name || "") + '</div></div></article>';
  });
  track.innerHTML = html;
})();

// ===== init every carousel on the page (after the UGC cards are rendered) =====
(function () {
  var roots = document.querySelectorAll("[data-carousel]");
  for (var i = 0; i < roots.length; i++) laCarousel(roots[i]);
})();
