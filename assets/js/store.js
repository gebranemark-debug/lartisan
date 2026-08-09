/* ===== L'Artisan — store pages (catalog + bundle) =====
   Null-safe, page-agnostic. Wires WhatsApp order links, the mobile menu,
   header scroll state, bundle selection, and reveal animations. Does not
   touch the home page (index.html uses main.js). */
(function () {
  "use strict";

  // ---- WhatsApp config (mirrors main.js) ----
  var PHONE = "96181363232";
  var FIELDS = "%0A%0AName:%0AAddress / Area:%0APhone:";
  var waURL = function (msg) { return "https://wa.me/" + PHONE + "?text=" + msg; };
  var ORDER_MSG = "Hi L'Artisan Alcoolique! I'd like to order the Signature Smoker Kit ($55, cash on delivery)." + FIELDS + "%0AQuantity: 1";
  var CLUB_MSG  = "Hi L'Artisan Alcoolique! I'd like to join the Oak Club (monthly wood flavours, cash on delivery)." + FIELDS;
  var BUNDLE_MSG = {
    1: "Hi L'Artisan Alcoolique! I'd like the Buy 1 bundle — 1 Signature Smoker Kit ($55, cash on delivery)." + FIELDS,
    2: "Hi L'Artisan Alcoolique! I'd like the Buy 2 bundle — 2 Signature Smoker Kits ($100, cash on delivery)." + FIELDS,
    3: "Hi L'Artisan Alcoolique! I'd like the Buy 3 bundle — 3 Signature Smoker Kits ($145, cash on delivery)." + FIELDS
  };

  function setWa(el, msg) {
    if (!el) return;
    el.href = waURL(msg);
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  }

  // Direct-WhatsApp links (open in a new tab, pre-filled) — never scroll
  document.querySelectorAll('[data-wa="order"]').forEach(function (a) { setWa(a, ORDER_MSG); });
  document.querySelectorAll('[data-wa="club"]').forEach(function (a) { setWa(a, CLUB_MSG); });

  // ---- mobile menu ----
  var mm = document.getElementById("mobileMenu");
  var burger = document.getElementById("burger");
  var closeBtn = document.getElementById("closeMenu");
  var closeMenu = function () { if (mm) mm.classList.remove("open"); if (burger) burger.setAttribute("aria-expanded", "false"); };
  if (burger) burger.onclick = function () {              // toggle: tap opens, tap again closes
    var isOpen = mm && mm.classList.toggle("open");
    burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };
  if (closeBtn) closeBtn.onclick = closeMenu;

  // ---- header scroll state ----
  var hdr = document.getElementById("hdr");
  if (hdr) addEventListener("scroll", function () { hdr.classList.toggle("scrolled", scrollY > 40); });

  // ---- bundle selection (bundle page only) ----
  var cards = document.querySelectorAll(".bundle-card");
  var bundleBtns = document.querySelectorAll('[data-wa="bundle"]');
  var buynowBtns = document.querySelectorAll('[data-buynow]');
  if (cards.length) {
    var sel = 2; // default: Buy 2 (most popular)
    var apply = function () {
      cards.forEach(function (c) {
        var on = (+c.dataset.qty === sel);
        c.classList.toggle("selected", on);
        c.setAttribute("aria-checked", on ? "true" : "false");
      });
      bundleBtns.forEach(function (b) { setWa(b, BUNDLE_MSG[sel]); });
      // "Buy it now" -> checkout page, carrying the selected bundle
      buynowBtns.forEach(function (b) { b.href = "checkout.html?bundle=" + sel; });
    };
    var pick = function (c) { sel = +c.dataset.qty; apply(); };
    cards.forEach(function (c) {
      c.addEventListener("click", function () { pick(c); });
      c.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(c); }
      });
    });
    apply();
  }

  // ---- reveal on scroll ----
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.16 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  // ---- smooth-scroll for same-page anchors only ----
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href");
      if (href.length > 1) {
        var target = document.querySelector(href);
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); closeMenu(); }
      }
    });
  });
})();
