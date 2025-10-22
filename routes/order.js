const orderRoute=require('express').Router()
const orderController=require('../contoller/order')
orderRoute.get('/getOrders',orderController.getAllOrders)
orderRoute.get('/getInsights',orderController.getInsights)
orderRoute.put('/updateOrderStatus/:id',orderController.updateOrderStatus)
module.exports=orderRoute