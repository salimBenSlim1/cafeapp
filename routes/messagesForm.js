const messageFormRoute=require('express').Router()
const messageFormController=require('../contoller/messageForm')
const adminMidlware = require('../middleware/adminMidlware')
const { formLimiter } = require('../middleware/rateLimiter')
const validateParams = require('../middleware/validateParams')
const { paramSchema } = require('../validators/param.validator')
messageFormRoute.get('/getForms',adminMidlware,messageFormController.getForms)
messageFormRoute.post('/add-new-form',formLimiter,messageFormController.addForm)
messageFormRoute.delete('/delete-form/:id',validateParams(paramSchema),adminMidlware,messageFormController.deleteForm)

module.exports=messageFormRoute