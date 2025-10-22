const functionRoute=require('express').Router()
const functionController=require('../contoller/elpatronfunction')
functionRoute.post('/create',functionController.provisionTenant)

module.exports=functionRoute