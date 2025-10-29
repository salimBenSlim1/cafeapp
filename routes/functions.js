const functionRoute=require('express').Router()
const functionController=require('../contoller/elpatronfunction')
const adminMidlware = require('../middleware/adminMidlware')
functionRoute.post('/loginAdmin',functionController.authAdmin)
functionRoute.post('/create',adminMidlware,functionController.provisionTenant)


module.exports=functionRoute