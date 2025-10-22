const chartRoute=require('express').Router()
const chartController=require('../contoller/charts')
chartRoute.get("/stats/sales-by-item", chartController.getSalesByItem);
chartRoute.get("/stats/daily-revenue", chartController.getDailyRevenue);
module.exports=chartRoute
