const cafeRoute=require('express').Router()
const cafeController=require('../contoller/cafe')
const adminMidlware = require('../middleware/adminMidlware')
cafeRoute.post('/login',cafeController.login)
cafeRoute.delete('/deleteCafe/:id',adminMidlware,cafeController.deleteCafe)
cafeRoute.put('/updatePayment/:id',adminMidlware,cafeController.updateCofe)
cafeRoute.put('/updateCreatedAt/:id',adminMidlware,cafeController.updateCreatedAt)


module.exports=cafeRoute