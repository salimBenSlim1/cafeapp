const joi=require('joi')
const itemSchema = joi.object({
    name:joi.string().required()
    .messages({
        'string.base':'name must be sting',
        'any.required':'name is required '
    }),
    price:joi.number().required().messages({
        'number.base':'price must be a number',
        'any.required':'price is required'
    }),
    category:joi.string().required().messages({
        'string.base':'category must be string',
        'any.required':'category is required'
    }),
    stock:joi.number().required().messages({
        'number.base':'stock must be a number',
        'any.required':'stock is required'
    })
    
})
module.exports={
    itemSchema
}