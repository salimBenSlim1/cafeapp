const joi=require('joi')
const serverSchema=joi.object({
    name:joi.string().required().messages({
        'string.base':'name token must be a string',
        'any.required':'name token is required'
    }),
    password:joi.string().required().messages({
        'string.base':'password token must be a string',
        'any.required':'password token is required'
    }),
    begin:joi.number().required().messages({
        'number.base':'begin must be a number',
        'any.required':'begin is required'
    }),
    end:joi.number().required().messages({
        'number.base':'end must be a number',
        'any.required':'end is required'
    }),
    role:joi.string().required().messages({
        'string.base':'role must be a string',
        'any.required':'role is required'
    })
    
})

module.exports={
    serverSchema
}