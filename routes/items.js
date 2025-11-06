const itemRoute=require('express').Router()
const itemController=require('../contoller/items')
const verifyCafePro=require('../middleware/cafeMiddlware')
itemRoute.get('/getItems',itemController.getAllItems)
itemRoute.get('/getPhotosPro',verifyCafePro,itemController.getItemsForPro)
itemRoute.post('/addItem',itemController.addItem)
itemRoute.put('/updateItem/:id',itemController.updateItem)
itemRoute.delete('/deleteItem/:id',itemController.deleteItem)


module.exports=itemRoute
