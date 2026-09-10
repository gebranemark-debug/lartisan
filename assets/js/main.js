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
          if (swapMode) goToSwap(idx);   // reduced motion: reveal that review in place
          else track.scrollTo({ left: idx * step(), behavior: "smooth" });
          restart();   // when auto-playing, a tapped dot resets the timer so
                       //  the carousel doesn't immediately slide/swap away
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

  // ===== optional auto-advance (opt in via data-autoplay="<ms>") =====
  // Only a carousel marked [data-autoplay] cycles on its own — every other
  // carousel keeps the arrows/dots/swipe behaviour above, untouched. It advances
  // one review on a loop, pauses while the visitor is reading (hover / touch /
  // keyboard focus) or the tab is hidden, and resumes a couple of seconds later.
  //
  // prefers-reduced-motion is honoured WITHOUT giving up the rotation: normal
  // visitors get the smooth horizontal slide; reduced-motion visitors still see
  // every review auto-advance, but as an INSTANT in-place swap — the CSS stacks
  // the reviews and we just reveal the active one, so there is no sliding, no
  // animated scroll, no horizontal movement.
  var autoMs = parseInt(root.getAttribute("data-autoplay"), 10);
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canAuto = autoMs > 0 && count > 1;
  var swapMode = canAuto && reduceMotion;   // reduced motion: swap in place, no scroll
  var timer = null, resumeTimer = null, held = false, active = 0;

  // Reduced-motion presentation: reveal only the active review and drive the
  // dots from the tracked index (there is no scrolling to read the index from).
  function applySwap() {
    for (var a = 0; a < count; a++) slides[a].classList.toggle("rm-active", a === active);
    for (var b = 0; b < dots.length; b++) dots[b].classList.toggle("active", b === active);
  }
  function goToSwap(i) { active = ((i % count) + count) % count; applySwap(); }

  function advance() {
    if (swapMode) { goToSwap(active + 1); return; }   // reduced motion: instant next, wraps
    // Wrap on the track's real scroll extent, not the slide count: on wide
    // screens several review cards are visible at once, so scrollLeft tops out
    // before the last index — advancing by index alone would stall at the end.
    var maxLeft = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= maxLeft - 2) {         // at the end → loop to first
      track.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    var target = (index() + 1) * step();
    if (target > maxLeft) target = maxLeft;        // last step settles on the end
    track.scrollTo({ left: target, behavior: "smooth" });
  }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }
  function playAuto() {
    if (!canAuto || held || document.hidden) return;
    stopAuto();
    timer = setInterval(advance, autoMs);
  }
  // Called after a dot jump: restart the interval from now (unless paused),
  // so the visitor gets the full delay before the next auto-advance.
  function restart() { if (canAuto && !held) playAuto(); }

  if (canAuto) {
    if (swapMode) applySwap();               // reveal the first review up front
    var pause = function () {
      held = true; stopAuto();
      if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
    };
    var scheduleResume = function () {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () { held = false; playAuto(); }, 2500);
    };
    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", scheduleResume);
    root.addEventListener("touchstart", pause, { passive: true });
    root.addEventListener("touchend", scheduleResume, { passive: true });
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", scheduleResume);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopAuto(); else if (!held) playAuto();
    });
    playAuto();
  }
}

// ===== init every carousel on the page =====
(function () {
  var roots = document.querySelectorAll("[data-carousel]");
  for (var i = 0; i < roots.length; i++) laCarousel(roots[i]);
})();

// ===== image lightbox =====
// Full-screen dark overlay for the product + story images. Any element marked
// [data-lightbox] contributes an image set: a lone <img> is its own set
// (open/close only); a container contributes all of its <img> children as one
// set (a carousel's slides, or the gallery). Inside the lightbox you browse the
// set without touching the underlying carousel — click the left/right half of
// the image (desktop) or swipe (mobile); the backdrop or Escape closes it. No
// visible arrows. This only READS the carousels' images — it never changes
// their scroll position, dots or any existing behaviour.
(function () {
  var groups = document.querySelectorAll("[data-lightbox]");
  if (!groups.length) return;

  // one shared overlay per page
  var box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-hidden", "true");
  var bimg = document.createElement("img");
  bimg.alt = "";
  box.appendChild(bimg);
  document.body.appendChild(box);

  var set = [];            // current image set (source <img> elements)
  var idx = 0;             // index within the set
  var isOpen = false;
  var startX = 0, startY = 0, swiped = false;

  function show(i) {
    idx = (i + set.length) % set.length;         // wrap around
    var src = set[idx];
    bimg.src = src.currentSrc || src.src;
    bimg.alt = src.alt || "";
  }
  function openBox(imgs, i) {
    set = imgs;
    box.classList.toggle("is-multi", set.length > 1);
    show(i);
    box.classList.add("open");
    box.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    isOpen = true;
  }
  function closeBox() {
    box.classList.remove("open");
    box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    isOpen = false;
  }
  function step(dir) { if (set.length > 1) show(idx + dir); }

  // wire every marked group's images
  for (var g = 0; g < groups.length; g++) {
    (function (group) {
      var imgs = group.tagName === "IMG"
        ? [group]
        : Array.prototype.slice.call(group.querySelectorAll("img"));
      if (!imgs.length) return;
      imgs.forEach(function (im, i) {
        im.addEventListener("click", function () { openBox(imgs, i); });
      });
    })(groups[g]);
  }

  // Click the backdrop to close; on the image, browse (multi) or close (single).
  box.addEventListener("click", function (e) {
    if (e.target !== bimg) { closeBox(); return; }
    if (swiped) { swiped = false; return; }        // a swipe already handled this
    if (set.length > 1) {
      var r = bimg.getBoundingClientRect();
      step(e.clientX < r.left + r.width / 2 ? -1 : 1);
    } else {
      closeBox();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.key === "Escape") closeBox();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  // Touch: swipe to browse; suppress the click the browser fires after a swipe.
  bimg.addEventListener("touchstart", function (e) {
    var t = e.changedTouches[0]; startX = t.clientX; startY = t.clientY; swiped = false;
  }, { passive: true });
  bimg.addEventListener("touchend", function (e) {
    var t = e.changedTouches[0], dx = t.clientX - startX, dy = t.clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
})();
