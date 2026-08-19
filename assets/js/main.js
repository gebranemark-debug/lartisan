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

// ===== UGC strip: infinite loop + gentle auto-advance =====
// Triples the card set ([clones | reals | clones]) and keeps the scroll
// position inside the middle copy, so advancing/swiping past either end
// continues seamlessly — it never snaps all the way back. Auto-advances one
// card every ~2.5s while idle; pauses on hover / drag / swipe and while a card's
// video is playing; resumes after a short idle. Honours prefers-reduced-motion.
//
// Later, once real clips exist: the video play/pause/ended handlers already gate
// the timer, so a "play ~2–3s once the card is centered, then advance" behaviour
// can hook in by calling the centered card's video.play().
function ugcCarousel(root) {
  if (!root) return;
  var track = root.querySelector("[data-carousel-track]");
  if (!track || track.children.length < 2) { laCarousel(root); return; }

  var reals = [].slice.call(track.children);
  var N = reals.length;
  var prev = root.querySelector(".carousel-arrow.prev");
  var next = root.querySelector(".carousel-arrow.next");
  var dotsWrap = root.querySelector("[data-carousel-dots]");
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // triple the set for a seamless loop: [clones-before | reals | clones-after]
  var clone = function (node) {
    var c = node.cloneNode(true);
    c.setAttribute("aria-hidden", "true"); c.setAttribute("tabindex", "-1"); c.dataset.clone = "1";
    return c;
  };
  var before = document.createDocumentFragment(), after = document.createDocumentFragment();
  reals.forEach(function (n) { before.appendChild(clone(n)); after.appendChild(clone(n)); });
  track.insertBefore(before, reals[0]);
  track.appendChild(after);

  var step = function () {
    var a = track.children[0].getBoundingClientRect(), b = track.children[1].getBoundingClientRect();
    var d = b.left - a.left;
    return d > 1 ? d : (track.clientWidth || 1);
  };
  var loopW = function () { return N * step(); };
  var setLeft = function (x) {                     // instant jump (no smooth), used for the seamless wrap
    var pb = track.style.scrollBehavior; track.style.scrollBehavior = "auto";
    track.scrollLeft = x; void track.offsetWidth; track.style.scrollBehavior = pb;
  };

  var dots = [];
  if (dotsWrap) {
    for (var i = 0; i < N; i++) {
      (function (idx) {
        var d = document.createElement("button");
        d.setAttribute("aria-label", "Go to video " + (idx + 1));
        d.addEventListener("click", function () { poke(); toReal(idx); });
        dotsWrap.appendChild(d); dots.push(d);
      })(i);
    }
  }
  var realIndex = function () { return ((Math.round(track.scrollLeft / step()) % N) + N) % N; };
  var syncDots = function () { var r = realIndex(); for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("active", i === r); };

  // keep the scroll position within the middle copy (wrap seamlessly when it drifts)
  var normalize = function () {
    var lw = loopW(); if (lw <= 0) return;
    var x = track.scrollLeft;
    if (x < lw * 0.5) setLeft(x + lw);
    else if (x > lw * 1.5) setLeft(x - lw);
  };

  var settle;
  track.addEventListener("scroll", function () {
    window.requestAnimationFrame(syncDots);
    clearTimeout(settle); settle = setTimeout(normalize, 60);
  }, { passive: true });

  var move = function (dir) { track.scrollBy({ left: dir * step(), behavior: "smooth" }); };
  var toReal = function (i) {                       // shortest path to real card i
    var cur = Math.round(track.scrollLeft / step());
    var r = (((i - (cur % N)) % N) + N) % N;
    if (r > N / 2) r -= N;
    track.scrollTo({ left: (cur + r) * step(), behavior: "smooth" });
  };
  if (prev) prev.addEventListener("click", function () { poke(); move(-1); });
  if (next) next.addEventListener("click", function () { poke(); move(1); });

  // ---- auto-advance ----
  var AUTO = 2500, IDLE = 3500, timer = null, idle = null, hovering = false, playing = false;
  var canAuto = function () { return !reduced && !hovering && !playing && !document.hidden; };
  var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
  var start = function () { if (timer || !canAuto()) return; timer = setInterval(function () { if (canAuto()) move(1); else stop(); }, AUTO); };
  var poke = function () { stop(); clearTimeout(idle); idle = setTimeout(start, IDLE); }; // pause during interaction, resume after idle

  ["pointerdown", "touchstart", "wheel"].forEach(function (ev) { track.addEventListener(ev, poke, { passive: true }); });
  root.addEventListener("mouseenter", function () { hovering = true; stop(); });
  root.addEventListener("mouseleave", function () { hovering = false; clearTimeout(idle); idle = setTimeout(start, 500); });
  track.addEventListener("play", function (e) { if (e.target && e.target.tagName === "VIDEO") { playing = true; stop(); } }, true);
  track.addEventListener("pause", function (e) { if (e.target && e.target.tagName === "VIDEO") { playing = false; start(); } }, true);
  track.addEventListener("ended", function (e) { if (e.target && e.target.tagName === "VIDEO") { playing = false; move(1); start(); } }, true);
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  setLeft(loopW());   // start on the first real card (middle copy)
  syncDots();
  if (!reduced) start();
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

// ===== init carousels (after the UGC cards are rendered) =====
(function () {
  laCarousel(document.querySelector("#product [data-carousel]"));
  laCarousel(document.querySelector("#reviews [data-carousel]"));
  ugcCarousel(document.querySelector("#ugc [data-carousel]")); // infinite loop + auto-advance
})();
