const joi = require('joi');

// Login schema with optional location
const loginSchema = joi.object({
    email: joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    password: joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters',
            'any.required': 'Password is required'
        }),
   
});

// Old schema name for backward compatibility
const createdAtCoffeeSchema=joi.object({
    createdAt:joi.string().required().messages({
        'string.base':'createdAt must be string',
        'any.required':'createdAt is required'
    })
})


module.exports = {
    loginSchema,
    createdAtCoffeeSchema,
};