const itemRoute=require('express').Router()
const itemController=require('../contoller/items')
itemRoute.get('/getItems',itemController.getAllItems)
itemRoute.post('/addItem',itemController.addItem)
itemRoute.put('/updateItem/:id',itemController.updateItem)
itemRoute.delete('/deleteItem/:id',itemController.deleteItem)


module.exports=itemRoute
