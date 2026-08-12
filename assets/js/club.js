/* ===== L'Artisan — Oak Club sign-up =====
   Powers the "Join the Oak Club" modal on catalog.html. On submit it:
     1) appends the signup to the Google Sheet (Apps Script, via sendBeacon),
        tagged type="Oak Club" so it's distinct from kit orders,
     2) emails the member a confirmation (EmailJS — Oak Club template),
     3) redirects to the thank-you page (club variant).
   Same Sheet + EmailJS service/public key as checkout; only the template differs. */
(function () {
  "use strict";

  // ================== CONFIG ==================
  // Mirrors checkout.js — same Sheet and same EmailJS service/public key.
  // Only EMAILJS_TEMPLATE_ID differs (the Oak Club confirmation template).
  var CONFIG = {
    SHEET_URL: "https://script.google.com/macros/s/AKfycbyJ1Ybnf2ul-Vm9Ywhioa1Gs6Uf8NfXffqi59SO1TJsEINfbCzi3EiU0PL5k2u2J86d/exec",
    SHEET_SECRET: "lartisan2026xyz",          // must match the secret in your Apps Script
    EMAILJS_PUBLIC_KEY: "vUwNauDCuMfhcl5a8",
    EMAILJS_SERVICE_ID: "service_zoho",
    EMAILJS_TEMPLATE_ID: "template_9se9yqv"   // Oak Club confirmation template
  };

  var modal = document.getElementById("clubModal");
  var openBtn = document.getElementById("joinClub");
  var form = document.getElementById("clubForm");
  if (!modal || !form) return;

  // ---- EmailJS init ----
  if (window.emailjs) { try { emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY }); } catch (e) {} }

  // ---- modal open / close ----
  var lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    var first = document.getElementById("clubName");
    if (first) setTimeout(function () { first.focus(); }, 40);
  }
  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocus) { try { lastFocus.focus(); } catch (e) {} }
  }
  if (openBtn) openBtn.addEventListener("click", openModal);
  modal.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

  // ---- submit ----
  var btn = document.getElementById("clubSubmit");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;            // native required/email checks

    var name = val("clubName"), phone = val("clubPhone"), email = val("clubEmail");

    if (btn) { btn.disabled = true; btn.classList.add("is-loading"); btn.textContent = "Joining…"; }

    // 1) Google Sheet — tagged as an Oak Club signup (sendBeacon survives the redirect)
    try {
      var payload = JSON.stringify({
        secret: CONFIG.SHEET_SECRET,
        type: "Oak Club",
        firstName: name, lastName: "",
        phone: phone, city: "", address: "",
        email: email, bundle: "Oak Club membership", notes: ""
      });
      navigator.sendBeacon(CONFIG.SHEET_URL, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
    } catch (err) { /* best-effort */ }

    // 2) EmailJS confirmation to the member — template variables: first_name, phone, email
    var params = { first_name: name, phone: phone, email: email };
    var emailP = (window.emailjs)
      ? emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, params)
          .catch(function (err) { console.warn("EmailJS failed:", err); })
      : Promise.resolve();

    // 3) redirect once the email settles (or after 4s at most)
    var go = function () { location.href = "thankyou.html?club=1"; };
    Promise.race([emailP, new Promise(function (r) { setTimeout(r, 4000); })]).then(go);
  });
})();
