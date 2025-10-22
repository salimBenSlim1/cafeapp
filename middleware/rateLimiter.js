const rateLimit = require('express-rate-limit');

// Global limiter - applies to all routes
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

// Stricter limiter for order creation
const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 orders per hour
    message: {
        error: 'Too many orders created from this IP, please try again later.'
    }
});
const formLimiter=rateLimit({
    windowMs:60 * 60 * 1000,
    max:5,
    message:{
        error:'too many form request please try again after 1 hour'
    }
})

module.exports = {
    globalLimiter,
    orderLimiter,
    formLimiter
};