const cafeRoute = require('express').Router();
const cafeController = require('../contoller/cafe');
const { loginLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { loginSchema, createdAtCoffeeSchema } = require('../validators/cafe.validator');

// Use improved loginSchema for login endpoint
cafeRoute.post('/login',loginLimiter,validate(loginSchema), cafeController.login);

module.exports = cafeRoute;