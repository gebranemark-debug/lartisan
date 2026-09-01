/* ===== L'Artisan — checkout / order form =====
   Reads the chosen product + variant from ?product= / ?bundle=, validates the
   form, then on submit:
     1) appends the order to the Google Sheet (Apps Script, via sendBeacon),
     2) emails the customer a confirmation (EmailJS — kit only for now),
     3) redirects to the thank-you page.
   Three products share this flow: the Signature Kit (default), the Japanese
   Mountain Glasses (?product=glass) and the Spinning Glasses (?product=spinning,
   which also carries a per-glass design breakdown via ?d=). No cart, no card,
   no server of our own. */
(function () {
  "use strict";

  // ================== CONFIG ==================
  var CONFIG = {
    SHEET_URL: "https://script.google.com/macros/s/AKfycbyJ1Ybnf2ul-Vm9Ywhioa1Gs6Uf8NfXffqi59SO1TJsEINfbCzi3EiU0PL5k2u2J86d/exec",
    SHEET_SECRET: "lartisan2026xyz",          // must match the secret in your Apps Script
    EMAILJS_PUBLIC_KEY: "vUwNauDCuMfhcl5a8",
    EMAILJS_SERVICE_ID: "service_zoho",
    EMAILJS_TEMPLATE_ID: "template_8chohmu"
  };

  // Products & variants. The kit uses ?bundle=1|2|3 (no ?product=, so it defaults
  // to the kit — its existing URLs are unchanged). Glasses use
  // ?product=glass&bundle=1|2|3. Each variant's Sheet "bundle" string is
  // label + " (" + total + ")", matching the existing kit format exactly.
  var PRODUCTS = {
    kit: {
      type: "Kit Order",          // Sheet "type" column (col J)
      change: "bundle.html",      // where the summary "Change" link goes
      variants: {
        "1": { label: "Buy 1 — 1 Signature Smoker Kit",  total: "$55" },
        "2": { label: "Buy 2 — 2 Signature Smoker Kits", total: "$100" },
        "3": { label: "Buy 3 — 3 Signature Smoker Kits", total: "$145" }
      }
    },
    glass: {
      type: "Glass Order",
      change: "index.html#glass",
      variants: {
        "1": { label: "Single — 1 Japanese Mountain Glass",    total: "$12" },
        "2": { label: "Set of 2 — 2 Japanese Mountain Glasses", total: "$20" },
        "3": { label: "Set of 3 — 3 Japanese Mountain Glasses", total: "$26" }
      }
    },
    spinning: {
      type: "Glass Order",        // same Sheet "type" as the mountain glasses
      change: "spinning-bundle.html",
      variants: {
        "1": { label: "Spinning Glasses — Single",  total: "$15" },
        "2": { label: "Spinning Glasses — Set of 2", total: "$27" },
        "3": { label: "Spinning Glasses — Set of 3", total: "$39" }
      }
    }
  };

  function qp(name) { return new URLSearchParams(location.search).get(name); }
  var productKey = PRODUCTS.hasOwnProperty(qp("product")) ? qp("product") : "kit"; // default: kit
  var product = PRODUCTS[productKey];
  var bundleKey = product.variants.hasOwnProperty(qp("bundle")) ? qp("bundle") : "1"; // default variant 1
  var bundle = product.variants[bundleKey];

  // Spinning glasses carry a per-glass design breakdown via ?d= (comma-separated,
  // URL-encoded, one entry per glass). Clamp to the quantity; default any missing
  // pick to Fluté so a valid, complete selection always exists.
  var DESIGN_ORDER = ["Fluté", "Majesté", "Sculpté"];
  var designs = [];
  if (productKey === "spinning") {
    var qty = +bundleKey || 1;
    var raw = (qp("d") || "").split(",").map(function (s) { return s.trim(); });
    var validDesign = { "Fluté": 1, "Majesté": 1, "Sculpté": 1 };
    designs = raw.filter(function (d) { return validDesign[d]; }).slice(0, qty);
    while (designs.length < qty) designs.push("Fluté");
  }
  function designBreakdown() {
    // counts per design, ordered Fluté, Majesté, Sculpté -> "2x Fluté, 1x Majesté"
    var counts = {};
    designs.forEach(function (d) { counts[d] = (counts[d] || 0) + 1; });
    return DESIGN_ORDER.filter(function (d) { return counts[d]; })
      .map(function (d) { return counts[d] + "x " + d; }).join(", ");
  }

  // ---- order summary ----
  var sB = document.getElementById("summaryBundle");
  var sT = document.getElementById("summaryTotal");
  var sC = document.getElementById("summaryChange");
  var sD = document.getElementById("summaryDesigns");
  if (sB) sB.textContent = bundle.label;
  if (sT) sT.textContent = bundle.total;
  if (sC) sC.setAttribute("href", product.change);
  if (sD) {                                    // chosen designs (spinning only)
    if (productKey === "spinning") { sD.textContent = designBreakdown(); sD.style.display = ""; }
    else { sD.style.display = "none"; }
  }

  // ---- payment selection (ready for future options, e.g. Whish Money) ----
  document.querySelectorAll('input[name="payment"]').forEach(function (r) {
    r.addEventListener("change", function () {
      document.querySelectorAll(".pay-opt").forEach(function (o) {
        o.classList.toggle("selected", o.contains(r) && r.checked);
      });
      // PAYMENT: to support a second method later (e.g. "whish"), branch here
      // and in submit() on the selected value before sending the order.
    });
  });
  function paymentLabel() {
    var v = (document.querySelector('input[name="payment"]:checked') || {}).value;
    return v === "whish" ? "Whish Money" : "Cash on Delivery";
  }
  function paymentMethod() {
    // Short code stored with the order. COD is the only active method for now
    // (Whish is shown disabled in checkout.html), so this is "COD" until Whish is live.
    var v = (document.querySelector('input[name="payment"]:checked') || {}).value;
    return v === "whish" ? "Whish" : "COD";
  }

  // ---- EmailJS init ----
  if (window.emailjs) { try { emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY }); } catch (e) {} }

  var form = document.getElementById("orderForm");
  var btn = document.getElementById("placeOrder");
  if (!form) return;

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;            // native required/email/pattern checks

    var o = {
      firstName: val("firstName"), lastName: val("lastName"),
      phone: val("phone"), city: val("city"), address: val("address"),
      email: val("email"), notes: val("notes"),
      bundle: bundle.label, total: bundle.total, payment: paymentLabel()
    };

    if (btn) { btn.disabled = true; btn.classList.add("is-loading"); btn.textContent = "Placing your order…"; }

    // ---- payment routing ----
    // COD is the only active method today, so the order is recorded immediately
    // below. Whish is shown disabled in checkout.html and cannot be selected yet.
    //
    // TODO (Whish): once the Whish credentials + API are ready, branch here on the
    // chosen method (paymentMethod()). For "Whish", instead of the immediate Sheet
    // write below:
    //   1) POST the order to a (future) serverless endpoint that initiates the Whish
    //      payment and returns its status / redirect URL;
    //   2) only once the payment is confirmed, record the order (Sheet write) and
    //      send the confirmation email (EmailJS), then redirect to thankyou.html.
    // No payment logic here yet — this is just the hook.

    // 1) Google Sheet — sendBeacon so the write survives the redirect
    try {
      var payload = JSON.stringify({
        secret: CONFIG.SHEET_SECRET,
        type: product.type,
        firstName: o.firstName, lastName: o.lastName, phone: o.phone,
        city: o.city, address: o.address, email: o.email,
        bundle: o.bundle + " (" + o.total + ")" + (productKey === "spinning" ? ": " + designBreakdown() : ""),
        notes: o.notes,
        paymentMethod: paymentMethod()
      });
      navigator.sendBeacon(CONFIG.SHEET_URL, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
    } catch (err) { /* best-effort */ }

    // 2) Confirmation email — every order uses the same kit EmailJS template
    // (service_zoho / template_8chohmu). The {{bundle}} variable carries the
    // product + bundle string, so one template covers the Signature Kit, the
    // Japanese Mountain Glasses and the Spinning Glasses. For spinning orders we
    // append the per-glass design breakdown so {{bundle}} shows exactly what was
    // ordered (e.g. "Spinning Glasses — Set of 2: 1x Fluté, 1x Sculpté"); the
    // price stays in {{total}}. (The Oak Club sign-up has its own separate
    // template and runs through club.js — not this flow.)
    var params = {
      first_name: o.firstName, last_name: o.lastName,
      bundle: o.bundle + (productKey === "spinning" ? ": " + designBreakdown() : ""),
      total: o.total,
      address: o.address, city: o.city, phone: o.phone,
      notes: o.notes || "—", email: o.email
    };
    var emailP = (window.emailjs)
      ? emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, params)
          .catch(function (err) { console.warn("EmailJS failed:", err); })
      : Promise.resolve();

    // 3) redirect once the email settles (or after 4s at most).
    // Kit keeps its existing URL (?bundle=N); the glass products add &product=…
    // so the thank-you page shows the right label and skips the email note.
    var go = function () {
      location.href = "thankyou.html?bundle=" + encodeURIComponent(bundleKey)
        + (productKey !== "kit" ? "&product=" + productKey : "");
    };
    Promise.race([emailP, new Promise(function (r) { setTimeout(r, 4000); })]).then(go);
  });
})();
