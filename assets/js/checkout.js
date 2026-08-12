/* ===== L'Artisan — checkout / order form =====
   Reads the chosen bundle from ?bundle=, validates the form, then on submit:
     1) appends the order to the Google Sheet (Apps Script, via sendBeacon),
     2) emails the customer a confirmation (EmailJS),
     3) redirects to the thank-you page.
   No cart, no card, no server of our own. */
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

  // Bundles (mirror bundle.html). Keyed by the ?bundle= value.
  var BUNDLES = {
    "1": { label: "Buy 1 — 1 Signature Smoker Kit",  total: "$55" },
    "2": { label: "Buy 2 — 2 Signature Smoker Kits", total: "$100" },
    "3": { label: "Buy 3 — 3 Signature Smoker Kits", total: "$145" }
  };

  function qp(name) { return new URLSearchParams(location.search).get(name); }
  var bundleKey = (BUNDLES.hasOwnProperty(qp("bundle"))) ? qp("bundle") : "1"; // default Buy 1
  var bundle = BUNDLES[bundleKey];

  // ---- order summary ----
  var sB = document.getElementById("summaryBundle");
  var sT = document.getElementById("summaryTotal");
  if (sB) sB.textContent = bundle.label;
  if (sT) sT.textContent = bundle.total;

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
        type: "Kit Order",
        firstName: o.firstName, lastName: o.lastName, phone: o.phone,
        city: o.city, address: o.address, email: o.email,
        bundle: o.bundle + " (" + o.total + ")", notes: o.notes,
        paymentMethod: paymentMethod()
      });
      navigator.sendBeacon(CONFIG.SHEET_URL, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
    } catch (err) { /* best-effort */ }

    // 2) EmailJS confirmation to the customer — exact template variable names
    var params = {
      first_name: o.firstName, last_name: o.lastName,
      bundle: o.bundle, total: o.total,
      address: o.address, city: o.city, phone: o.phone,
      notes: o.notes || "—", email: o.email
    };
    var emailP = (window.emailjs)
      ? emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, params)
          .catch(function (err) { console.warn("EmailJS failed:", err); })
      : Promise.resolve();

    // 3) redirect once the email settles (or after 4s at most)
    var go = function () { location.href = "thankyou.html?bundle=" + encodeURIComponent(bundleKey); };
    Promise.race([emailP, new Promise(function (r) { setTimeout(r, 4000); })]).then(go);
  });
})();
