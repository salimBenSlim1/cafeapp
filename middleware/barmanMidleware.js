const jwt = require('jsonwebtoken');

module.exports = async function verifyBarman(req, res, next) {
const token = req.headers["server-token"];
const payload = jwt.decode(token); // decode without verification
  try {

    if (!token) {
      return res.status(401).json({
        redirectTo:  "/login"
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.role !== "barman") {
      return res.status(403).json({
        redirectTo:  "/server-login?id="+payload.cafeId
      });
    }

    req.server = decoded;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {

      return res.status(403).json({
        redirectTo: "/server-login?id="+payload.cafeId
      });
    }

    return res.status(403).json({
      redirectTo:"/server-login?id="+payload.cafeId
    });
  }
};
