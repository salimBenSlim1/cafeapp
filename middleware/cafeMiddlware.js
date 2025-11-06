// ============================================
const jwt = require("jsonwebtoken");

module.exports = function verifyCafePro(req, res, next) {
  // ✅ FIX: use lowercase "authorization"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json( 'unauuthorized' );
  }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json( 'unauuthorized' );
    }
    if (!decoded|| decoded.plan==="basic"){
      return res
        .status(401)
        .json( 'unauuthorized' );
    
    }

    req.cafe = decoded; // attach cafe info
    next();
  });
};