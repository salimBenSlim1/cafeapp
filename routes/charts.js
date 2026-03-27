const chartRoute=require('express').Router()
const chartController=require('../contoller/charts')
chartRoute.get("/stats", chartController.getStats);
module.exports=chartRoute
