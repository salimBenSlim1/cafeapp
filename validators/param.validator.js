const joi=require('joi')
const paramSchema=joi.object({
    id:joi.number().required().messages({
        'number.base':'id must be a number',
        'any.required':'id is required'
    })
})
module.exports={paramSchema}