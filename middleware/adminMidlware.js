const jwt = require('jsonwebtoken');

module.exports = async function verifyAdmin(req, res, next) {
  try {
    const token = req.headers["token-jwt"];
    if (!token) {
      return res.status(401).json({
        redirectTo: "https://coffai.tn/"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({
        redirectTo: "https://coffai.tn/"
      });
    }

    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      redirectTo: "https://coffai.tn/"
    });
  }
};
