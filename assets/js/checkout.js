/* ===== L'Artisan — checkout / order form =====
   Reads the chosen bundle from ?bundle=, validates the form, then on submit:
     1) appends the order to the Google Sheet (Apps Script, via sendBeacon),
     2) emails the customer a confirmation (EmailJS),
     3) opens WhatsApp to the shop with the full order,
     4) redirects to the thank-you page.
   No cart, no card, no server of our own. */
(function () {
  "use strict";

  // ================== CONFIG ==================
  var CONFIG = {
    SHEET_URL: "https://script.google.com/macros/s/AKfycbyJ1Ybnf2ul-Vm9Ywhioa1Gs6Uf8NfXffqi59SO1TJsEINfbCzi3EiU0PL5k2u2J86d/exec",
    SHEET_SECRET: "lartisan2026xyz",          // must match the secret in your Apps Script
    EMAILJS_PUBLIC_KEY: "vUwNauDCuMfhcl5a8",
    EMAILJS_SERVICE_ID: "service_hwjznyb",
    EMAILJS_TEMPLATE_ID: "template_8chohmu",
    OWNER_WHATSAPP: "96181363232"
  };

  // Bundles (mirror bundle.html). Keyed by the ?bundle= value.
  var BUNDLES = {
    "1": { label: "Buy 1 — 1 Signature Smoker Kit",  total: "$85" },
    "2": { label: "Buy 2 — 2 Signature Smoker Kits", total: "$160" },
    "3": { label: "Buy 3 — 3 Signature Smoker Kits", total: "$225" }
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

  // ---- EmailJS init ----
  if (window.emailjs) { try { emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY }); } catch (e) {} }

  var form = document.getElementById("orderForm");
  var btn = document.getElementById("placeOrder");
  if (!form) return;

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

  function ownerMessage(o) {
    return "New L'Artisan order\n\n"
      + "Bundle: " + o.bundle + " (" + o.total + ")\n"
      + "Name: " + o.firstName + " " + o.lastName + "\n"
      + "Phone: " + o.phone + "\n"
      + "City / Region: " + o.city + "\n"
      + "Address: " + o.address + "\n"
      + "Email: " + o.email + "\n"
      + "Notes: " + (o.notes || "—") + "\n"
      + "Payment: " + o.payment;
  }

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

    // 1) Google Sheet — sendBeacon so the write survives the redirect
    try {
      var payload = JSON.stringify({
        secret: CONFIG.SHEET_SECRET,
        firstName: o.firstName, lastName: o.lastName, phone: o.phone,
        city: o.city, address: o.address, email: o.email,
        bundle: o.bundle + " (" + o.total + ")", notes: o.notes
      });
      navigator.sendBeacon(CONFIG.SHEET_URL, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
    } catch (err) { /* best-effort */ }

    // 3) WhatsApp to the shop — build now, open within this user gesture
    var waURL = "https://wa.me/" + CONFIG.OWNER_WHATSAPP + "?text=" + encodeURIComponent(ownerMessage(o));
    try { sessionStorage.setItem("laOrderWa", waURL); } catch (err) {}
    window.open(waURL, "_blank");

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

    // 4) redirect once the email settles (or after 4s at most)
    var go = function () { location.href = "thankyou.html?bundle=" + encodeURIComponent(bundleKey); };
    Promise.race([emailP, new Promise(function (r) { setTimeout(r, 4000); })]).then(go);
  });
})();
