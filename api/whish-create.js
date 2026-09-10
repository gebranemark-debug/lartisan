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

// node-redis (v4) needs an explicit connect/quit per serverless invocation.
var createClient = require("redis").createClient;
async function withRedis(fn) {
  var client = createClient({ url: process.env.KV_REST_API_REDIS_URL });
  client.on("error", function (e) { if (console) console.warn("[redis] client error:", String(e)); });
  await client.connect();
  try { return await fn(client); }
  finally { try { await client.quit(); } catch (e) {} }
}

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

  // Full order, persisted below so the verified success callback can record it.
  var firstName = body.firstName;
  var lastName = body.lastName;
  var phone = body.phone;
  var city = body.city;
  var address = body.address;
  var email = body.email;
  var bundle = body.bundle;
  var notes = body.notes;
  var type = body.type;
  var designs = body.designs;

  // Unique per attempt, per the agreed format.
  var externalId =
    Date.now().toString() +
    Math.floor(Math.random() * 10000).toString().padStart(4, "0");

  // Keep the success redirect URL SHORT. Whish rejects an over-long
  // successRedirectUrl with itel.unknown_error, so we pass only whish=1 and the
  // externalId. The order fields are persisted to Redis below (order:<externalId>)
  // and the verified success callback reads them back to record the order
  // server-side. (No order fields ride on the redirect URL or the Whish payload.)
  var successParams = new URLSearchParams({
    whish: "1",
    externalId: externalId
  });

  var payload = {
    amount: String(amount),
    currency: "USD",
    invoice: invoice,
    externalId: externalId,
    successCallbackUrl: SITE + "/api/whish-success?externalId=" + externalId,
    failureCallbackUrl: SITE + "/api/whish-failure?externalId=" + externalId,
    successRedirectUrl: SITE + "/thankyou.html?" + successParams.toString(),
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

      // Persist the order so the verified success callback can record it later.
      // Best-effort: if the Redis write throws, log it but STILL return
      // collectUrl — never block a paying customer.
      try {
        await withRedis(async function (r) {
          await r.set("order:" + externalId, JSON.stringify({
            firstName: firstName, lastName: lastName, phone: phone, city: city,
            address: address, email: email, bundle: bundle, designs: designs || "",
            notes: notes, type: type || "Kit Order", amount: String(amount)
          }), { EX: 172800 });
        });
      } catch (e) {
        console.error("[whish-create] order persist failed", { externalId: externalId, error: String(e) });
      }

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
