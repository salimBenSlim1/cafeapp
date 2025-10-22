const cafeRoute=require('express').Router()
const cafeController=require('../contoller/cafe')
cafeRoute.post('/login',cafeController.login)


module.exports=cafeRoute