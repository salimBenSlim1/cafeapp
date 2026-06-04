const chartRoute=require('express').Router()
const { getId } = require('../contoller/cafe');
const chartController=require('../contoller/charts')
chartRoute.get("/stats", chartController.getStats);
chartRoute.get("/getId", getId);
module.exports=chartRoute
