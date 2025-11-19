const userRoute=require('express').Router()
const userController=require('../contoller/users')
const serverMiddlware = require('../middleware/serverMiddlware')

userRoute.post('/server-login/:id',userController.serverLogin)
userRoute.post('/server/addOrderForTable',serverMiddlware,userController.addOrderForTable)
userRoute.get('/server/getOrders',serverMiddlware,userController.getAllOrders)
userRoute.get('/server/getItems',serverMiddlware,userController.getItems)
userRoute.get('/server/getTables',serverMiddlware,userController.getTables)
userRoute.put('/server/updateOrderStatus/:id',serverMiddlware,userController.updateOrderStatus)
userRoute.put('/server/updateOrder/:id',serverMiddlware,userController.serverUpdateOrder)


module.exports=userRoute