const orderRoute=require('express').Router()
const { printOrder } = require('../contoller/cafe')
const orderController=require('../contoller/order')
const verifyCafePro=require('../middleware/cafeMiddlware')
orderRoute.get('/getOrders',orderController.getAllOrders)
orderRoute.get('/getInsights',verifyCafePro,orderController.getInsights)
orderRoute.put('/updateOrderStatus/:id',orderController.updateOrderStatus)
orderRoute.post('/print-order',printOrder)
module.exports=orderRoute