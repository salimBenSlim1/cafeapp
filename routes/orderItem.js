const orderItemRoute = require('express').Router()
const orderItemsController = require('../contoller/orderItem')

// Apply stricter rate limit to order creation
orderItemRoute.get('/getOrderInfo/:id',orderItemsController.getAllInfoOfOneTable)
orderItemRoute.put('/updateOrder/:id',orderItemsController.adminUpdateOrder)
orderItemRoute.get('/itemsEndSoon',orderItemsController.getItemsEndSoon)
orderItemRoute.delete('/deleteOrder/:id',orderItemsController.adminDeleteOrder)

module.exports=orderItemRoute