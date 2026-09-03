// GET /api/whish-success?externalId=...
// Whish's server-to-server success callback. Whish requires an HTTP 200 to
// acknowledge receipt, so this ALWAYS responds 200 — even if the follow-up
// status check is inconclusive — to avoid Whish retrying/flagging the callback.
//
// This is a signal only: the shopper's order confirmation is shown client-side
// via the successRedirectUrl (thankyou.html?whish=1). Here we simply verify and
// log the collect status for our own records.
//
// Sandbox only for now.

var WHISH_BASE = "https://partner.api.sbx.whish.money/itel-service/api";
var USER_AGENT =
  "LArtisanAlcoolique/1.0 (https://lartisanalcoolique.com; orders@lartisanalcoolique.com)";

module.exports = async function handler(req, res) {
  var externalId = (req.query && req.query.externalId) || "";

  try {
    var resp = await fetch(WHISH_BASE + "/payment/collect/status", {
      method: "POST",
      headers: {
        channel: process.env.WHISH_CHANNEL,
        secret: process.env.WHISH_SECRET,
        websiteUrl: process.env.WHISH_WEBSITE_URL,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify({ currency: "USD", externalId: externalId })
    });

    var data = await resp.json();
    var collectStatus = data && data.data && data.data.collectStatus;

    if (collectStatus === "success") {
      console.log("[whish-success] payment confirmed", { externalId: externalId });
    } else {
      // Not "success" — still acknowledge, but log for follow-up.
      console.log("[whish-success] non-success collectStatus", {
        externalId: externalId,
        collectStatus: collectStatus
      });
    }
  } catch (err) {
    console.error("[whish-success] status check failed", {
      externalId: externalId,
      error: String(err)
    });
  }

  // Always acknowledge, regardless of the status check outcome.
  res.status(200).json({ ok: true });
};
