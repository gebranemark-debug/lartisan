// GET /api/whish-failure?externalId=...
// Whish's server-to-server failure callback. A failed attempt does NOT mean the
// order failed — the Whish payment link stays payable, so the customer can try
// again. We simply acknowledge receipt with HTTP 200 (and log it).
//
// No credentials or Whish API calls are needed here.

module.exports = function handler(req, res) {
  var externalId = (req.query && req.query.externalId) || "";
  console.log("[whish-failure] payment attempt failed; link stays payable", {
    externalId: externalId
  });
  res.status(200).json({ ok: true });
};
