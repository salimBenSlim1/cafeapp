const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// ✅ Pass req.ip (string), not req (object)
const keyByUser = (req) => {
  const userId = req.user?.id || req.cafe?.id;
  return userId ? `user:${userId}` : ipKeyGenerator(req.ip);
};

const keyByEmail = (req) => {
  const email = req.body?.email?.toLowerCase().trim();
  return email ? `email:${email}` : ipKeyGenerator(req.ip);
};
const keyByName = (req) => {
  const name = req.body?.name?.toLowerCase().trim();
  return name ? `name:${name}` : ipKeyGenerator(req.ip);
};

// Global limiter - applies to all routes
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 min per email
  keyGenerator: keyByEmail,
  message: { error: 'Too many login attempts for this account. Try again in 15 minutes.' },
});
const loginLimiterServer = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 min per email
  keyGenerator: keyByName,
  message: { error: 'Too many login attempts for this account. Try again in 15 minutes.' },
});
// Stricter limiter for order creation

const formLimiter=rateLimit({
    windowMs:60 * 60 * 1000,
    max:5,
    keyGenerator: keyByEmail,
    message:{
        error:'too many form request please try again after 1 hour'
    }
})

module.exports = {
    globalLimiter,
    formLimiter,
    loginLimiter,
    loginLimiterServer
};