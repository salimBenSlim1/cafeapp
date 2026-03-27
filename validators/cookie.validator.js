const joi=require('joi')
const cookieSchema=joi.object({
    refreshToken:joi.string().required().messages({
        'string.base':'refresh token must be a string',
        'any.required':'refresh token is required'
    })
})
module.exports={cookieSchema}