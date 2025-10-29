// middlewares/verifyApiKey.js
const Cafe = require("../models/cafe");

module.exports = async function verifyApiKey(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"];
    console.log("🔑 Received API Key:", apiKey);

    // If API key is missing
    if (!apiKey) {
      console.warn("❌ Missing API Key — redirecting to login");
  return res.status(401).json({ redirectTo: "https://cafeapp-frontend-lij4.vercel.app/login" });

    }

    // Check if API key exists in DB
    const cafe = await Cafe.findOne({ where: { apiKey } });
    if (!cafe ) {
      console.warn("🚫 Invalid API Key — redirecting to login");
      return res.status(401).json({ redirectTo: "https://cafeapp-frontend-lij4.vercel.app/login" });

    }

    // Optionally check expiration
    if (new Date() > new Date(cafe.apiKeyExpiresAt)||cafe.verifiedPayment=='0') {
      console.warn("🔒 Expired API Key — redirecting to login");
      return res.status(401).json({ redirectTo: "https://cafeapp-frontend-lij4.vercel.app/login" });

    }

    // Attach cafe info for later use
    req.cafe = cafe;
    next();

  } catch (err) {
    console.error("❗ API Key check failed:", err);
    return res.status(401).json({ redirectTo: "https://cafeapp-frontend-lij4.vercel.app/login" });

  }
};
