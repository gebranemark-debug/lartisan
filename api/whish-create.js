// POST /api/whish-create
// Initiates a Whish (sandbox) payment and returns the hosted "collect" URL the
// browser should redirect to. Called by checkout.html when the customer chooses
// "Pay with Whish" and submits the order form.
//
// Credentials live ONLY in Vercel environment variables and never reach the
// client:
//   WHISH_CHANNEL, WHISH_SECRET, WHISH_WEBSITE_URL
//
// Sandbox only for now — do NOT point this at the production Whish host.

var WHISH_BASE = "https://partner.api.sbx.whish.money/itel-service/api";
var SITE = "https://lartisanalcoolique.com";
var USER_AGENT =
  "LArtisanAlcoolique/1.0 (https://lartisanalcoolique.com; orders@lartisanalcoolique.com)";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, code: "method_not_allowed" });
    return;
  }

  // Body arrives parsed when Content-Type is application/json; fall back to
  // parsing a raw string just in case.
  var body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  var amount = body.amount;   // string, order total in USD (e.g. "55")
  var invoice = body.invoice; // human-readable order description

  // Unique per attempt, per the agreed format.
  var externalId =
    Date.now().toString() +
    Math.floor(Math.random() * 10000).toString().padStart(4, "0");

  var payload = {
    amount: String(amount),
    currency: "USD",
    invoice: invoice,
    externalId: externalId,
    successCallbackUrl: SITE + "/api/whish-success?externalId=" + externalId,
    failureCallbackUrl: SITE + "/api/whish-failure?externalId=" + externalId,
    successRedirectUrl: SITE + "/thankyou.html?whish=1",
    failureRedirectUrl: SITE + "/checkout.html?whish=failed"
  };

  try {
    var resp = await fetch(WHISH_BASE + "/payment/whish", {
      method: "POST",
      headers: {
        channel: process.env.WHISH_CHANNEL,
        secret: process.env.WHISH_SECRET,
        websiteUrl: process.env.WHISH_WEBSITE_URL,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify(payload)
    });

    var data = await resp.json();

    if (data && data.status === true) {
      var collectUrl = (data.data && data.data.collectUrl) || data.collectUrl;
      res.status(200).json({ ok: true, collectUrl: collectUrl, externalId: externalId });
    } else {
      res.status(200).json({
        ok: false,
        code: data && data.code,
        dialog: data && data.dialog
      });
    }
  } catch (err) {
    console.error("[whish-create] request failed", { externalId: externalId, error: String(err) });
    res.status(200).json({ ok: false, code: "network_error" });
  }
};
