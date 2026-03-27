const jwt = require('jsonwebtoken');

module.exports = async function verifyUser(req, res, next) {
  try {
    const token = req.headers["authorization"].split(' ')[1];
    if (!token) {
      return res.status(401).json({
        redirectTo: "https://coffai.tn/"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.role !== "user") {
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
