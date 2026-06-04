const userRoute=require('express').Router()
const userController=require('../contoller/users')
const barmanMidleware = require('../middleware/barmanMidleware')
const { loginLimiterServer } = require('../middleware/rateLimiter')
const serverMiddlware = require('../middleware/serverMiddlware')

userRoute.post('/server-login/:id',loginLimiterServer,userController.serverLogin)
userRoute.post('/server/addOrderForTable',serverMiddlware,userController.addOrderForTable)
userRoute.get('/server/getOrders',serverMiddlware,userController.getAllOrders)
userRoute.get('/barman/getOrders',barmanMidleware,userController.getAllOrdersBarman)
userRoute.get('/server/getItems',serverMiddlware,userController.getItems)
userRoute.get('/server/getTables',serverMiddlware,userController.getTables)
userRoute.put('/server/updateOrderItemStatus/:orderItemId',barmanMidleware,userController.updateOrderItemStatus)
userRoute.put('/server/updateOrder/:id',serverMiddlware,userController.serverUpdateOrder)


module.exports=userRoute