/* ===== L'Artisan — home page =====
   Home-specific behaviour only. Shared logic (WhatsApp order links, mobile
   menu, header scroll state, reveal-on-scroll, same-page smooth-scroll)
   lives in store.js, which the home page also loads. */

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

// ===== product image carousel (CSS scroll-snap + dots/arrows) =====
(function () {
  var track = document.getElementById("kitTrack");
  var dotsWrap = document.getElementById("kitDots");
  if (!track || !dotsWrap) return;
  var slides = track.children;
  var prev = document.querySelector(".carousel-arrow.prev");
  var next = document.querySelector(".carousel-arrow.next");

  var dots = [];
  for (var i = 0; i < slides.length; i++) {
    (function (idx) {
      var d = document.createElement("button");
      d.setAttribute("aria-label", "Go to image " + (idx + 1));
      d.addEventListener("click", function () {
        track.scrollTo({ left: idx * track.clientWidth, behavior: "smooth" });
      });
      dotsWrap.appendChild(d);
      dots.push(d);
    })(i);
  }

  var current = function () { return Math.round(track.scrollLeft / track.clientWidth); };
  var sync = function () {
    var c = current();
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("active", i === c);
  };
  var go = function (dir) {
    var c = Math.max(0, Math.min(slides.length - 1, current() + dir));
    track.scrollTo({ left: c * track.clientWidth, behavior: "smooth" });
  };
  if (prev) prev.addEventListener("click", function () { go(-1); });
  if (next) next.addEventListener("click", function () { go(1); });
  track.addEventListener("scroll", function () { window.requestAnimationFrame(sync); });
  sync();
})();
