// ============================================
const jwt = require("jsonwebtoken");

module.exports = function verifyCafeBasic(req, res, next) {
  // ✅ FIX: use lowercase "authorization"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
    return res
      .status(401)
      .json({ redirectTo: "/login" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.warn("❌ Invalid or expired access token:", err.message);
      return res
        .status(401)
        .json({ redirectTo: "/login" });
    }
    if (!decoded){
         return res
        .status(401)
        .json({ redirectTo: "/login" });
    }

    req.cafe = decoded; // attach cafe info
    next();
  });
};