/* ===== L'Artisan — store pages (catalog + bundle) =====
   Null-safe, page-agnostic. Wires the mobile menu, header scroll state,
   bundle selection, the flavour guide, and reveal animations. Ordering and
   Oak Club sign-up run through their own forms (checkout.js / club.js). */
(function () {
  "use strict";

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

  // ---- bundle selection + design picker (bundle pages: kit, glasses, spinning) ----
  var cards = document.querySelectorAll(".bundle-card");
  var buynowBtns = document.querySelectorAll('[data-buynow]');
  if (cards.length) {
    // Optional per-page overrides on the grid / buy button: data-default sets
    // the initially-selected quantity, data-product adds ?product= to the
    // checkout link. Without them this is the kit's original behaviour
    // (default Buy 2, checkout.html?bundle=N).
    var grid = document.querySelector(".bundle-grid");
    var sel = (grid && +grid.dataset.default) || 2; // default: Buy 2 (most popular)

    // Configurator (spinning glasses): one design dropdown per glass. As many rows
    // show as the chosen quantity, so the selection can never fail to add up — no
    // stepper / running total. Absent on the kit + mountain-glasses pages.
    var picker = document.querySelector("[data-design-picker]");
    var designRows = picker ? picker.querySelectorAll(".design-row") : [];
    var designSelects = picker ? picker.querySelectorAll(".design-select") : [];

    var apply = function () {
      cards.forEach(function (c) {
        var on = (+c.dataset.qty === sel);
        c.classList.toggle("selected", on);
        c.setAttribute("aria-checked", on ? "true" : "false");
      });
      // show exactly `sel` design rows; the first is "Design" when buying one,
      // otherwise the rows are "Glass 1 / Glass 2 / Glass 3"
      for (var i = 0; i < designRows.length; i++) {
        var n = i + 1;
        designRows[i].style.display = (n <= sel) ? "" : "none";
        var lbl = designRows[i].querySelector(".design-label");
        if (lbl) lbl.textContent = (sel === 1) ? "Design" : ("Glass " + n);
      }
      // "Buy it now" -> checkout, carrying the selected bundle (+ product + designs)
      buynowBtns.forEach(function (b) {
        var product = b.getAttribute("data-product"); // "glass"/"spinning"; absent for the kit
        var href = "checkout.html?" + (product ? "product=" + product + "&" : "") + "bundle=" + sel;
        if (picker) {
          var ds = [];
          for (var j = 0; j < sel && j < designSelects.length; j++) ds.push(designSelects[j].value);
          if (ds.length) href += "&d=" + ds.map(encodeURIComponent).join(",");
        }
        b.href = href;
      });
    };
    var pick = function (c) { sel = +c.dataset.qty; apply(); };
    cards.forEach(function (c) {
      c.addEventListener("click", function () { pick(c); });
      c.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(c); }
      });
    });
    // rebuild the checkout link whenever a design changes
    for (var k = 0; k < designSelects.length; k++) designSelects[k].addEventListener("change", apply);
    apply();
  }

  // ---- flavour guide (catalog page): tabs -> single panel ----
  var flavPanel = document.getElementById("flavPanel");
  if (flavPanel) {
    var FLAV = {
      oak:    { name: "Oak",    img: "assets/img/flavour-oak.jpg",    pair: "Pure oak · rich & smooth", note: "Deep, warm and classic — the backbone of barrel aging. Rounds out the spirit with a slow, woody sweetness.", best: "Old Fashioned · Neat bourbon · Rye" },
      cherry: { name: "Cherry", img: "assets/img/flavour-cherry.jpg", pair: "Sweet & mild",             note: "Fruity and fragrant with a soft finish. Lifts stirred and fruit-forward drinks without overpowering them.", best: "Manhattan · Dark rum · Amaro" },
      pecan:  { name: "Pecan",  img: "assets/img/flavour-pecan.jpg",  pair: "Nutty & rich",             note: "Toasty, full and a little sweet. A rich, rounded smoke that flatters darker, aged spirits.", best: "Neat whiskey · Aged rum · Old Fashioned" },
      apple:  { name: "Apple",  img: "assets/img/flavour-apple.jpg",  pair: "Fruity & light",           note: "Mild, mellow and gently sweet. The easy option when you want aroma without weight.", best: "Tequila · Gin · White rum" },
      peach:  { name: "Peach",  img: "assets/img/flavour-peach.jpg",  pair: "Sweet & smooth",           note: "Soft stone-fruit sweetness with a smooth, warm finish. Made for sippable, sweeter cocktails.", best: "Bourbon sour · Whiskey · Peach cocktails" },
      pear:   { name: "Pear",   img: "assets/img/flavour-pear.jpg",   pair: "Mild & refreshing",        note: "Light, clean and delicate. A refreshing smoke that keeps bright drinks bright.", best: "Vodka · Gin · Light cocktails" }
    };
    var renderFlav = function (key) {
      var f = FLAV[key]; if (!f) return;
      flavPanel.innerHTML =
        '<div class="tin"><img src="' + f.img + '" alt="' + f.name + ' wood chips tin"><div><h3>' + f.name + '</h3>' +
        '<div class="pair">' + f.pair + '</div></div></div>' +
        '<p class="note">' + f.note + '</p>' +
        '<div class="best">Best with · <b>' + f.best + '</b></div>';
    };
    var flavTabs = document.querySelectorAll(".flav-tab");
    flavTabs.forEach(function (t) {
      t.addEventListener("click", function () {
        flavTabs.forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); });
        t.classList.add("active"); t.setAttribute("aria-selected", "true");
        renderFlav(t.dataset.f);
      });
    });
    renderFlav("oak");   // default
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
