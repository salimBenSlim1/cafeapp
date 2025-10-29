// middlewares/verifyAdmin.js
const jwt = require('jsonwebtoken');

module.exports = async function verifyAdmin(req, res, next) {
  try {
    const token = req.headers["token-jwt"];

    // If token is missing
    if (!token) {
      return res.status(401).json({
        redirectTo: "https://cafeapp-frontend-lij4.vercel.app/login"
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the user is admin (for example, email or role)
    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({
        redirectTo: "https://cafeapp-frontend-lij4.vercel.app/login"
      });
    }

    // Attach user info to request if needed
    req.user = decoded;

    // Continue to next middleware
    next();
  } catch (err) {
    return res.status(401).json({
      redirectTo: "https://cafeapp-frontend-lij4.vercel.app/login"
    });
  }
};
