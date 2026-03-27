const functionRoute=require('express').Router()
const functionController=require('../contoller/elpatronfunction')
const adminMidlware = require('../middleware/adminMidlware')
const validate = require('../middleware/validate')
const validateParams = require('../middleware/validateParams')
const cafeController=require('../contoller/cafe')
const { paramSchema } = require('../validators/param.validator')
const { createdAtCoffeeSchema } = require('../validators/cafe.validator')
functionRoute.post('/loginAdmin',functionController.authAdmin)
functionRoute.get('/getCoffee',adminMidlware,cafeController.getCoffee)
functionRoute.post('/create',adminMidlware,functionController.provisionTenant)
functionRoute.delete('/deleteCafe/:id', adminMidlware,validateParams(paramSchema), cafeController.deleteCafe);
functionRoute.put('/updatePayment/:id', adminMidlware, validateParams(paramSchema),cafeController.updateCafe);
functionRoute.put('/updateCreatedAt/:id', adminMidlware,validateParams(paramSchema), cafeController.updateCreatedAt);


module.exports=functionRoute