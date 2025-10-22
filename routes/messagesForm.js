const messageFormRoute=require('express').Router()
const messageFormController=require('../contoller/messageForm')
const { formLimiter } = require('../middleware/rateLimiter')
messageFormRoute.get('/getForms',messageFormController.getForms)
messageFormRoute.post('/add-new-form',formLimiter,messageFormController.addForm)

module.exports=messageFormRoute