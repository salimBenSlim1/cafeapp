const { AppError } = require("../utils/errors");
const jwt=require('jsonwebtoken')
module.exports = async function verifyCafeBasic(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) throw new AppError("Unauthorized", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    if (decoded.role!=='cafe') throw new AppError('unauthorized')
    if (decoded.subscriptionEnd<=new Date()) throw new AppError('subscription ended',403)
    req.cafe = decoded;
    next();

  } catch (err) {
    next(err); 
  }
};