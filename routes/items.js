const itemRoute=require('express').Router()
const itemController=require('../contoller/items')
const validate = require('../middleware/validate')
const validateParams = require('../middleware/validateParams')
const { itemSchema } = require('../validators/item.validator')
const { paramSchema } = require('../validators/param.validator')
itemRoute.get('/getItems',itemController.getAllItems)
itemRoute.get('/getPhotosPro',itemController.getItemsForPro)
itemRoute.post('/addItem',validate(itemSchema),itemController.addItem)
itemRoute.put('/updateItem/:id',validateParams(paramSchema),itemController.updateItem)
itemRoute.delete('/deleteItem/:id',validateParams(paramSchema),itemController.deleteItem)


module.exports=itemRoute
