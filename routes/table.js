const tableRoute = require('express').Router()
const { generateQRForTables, downloadQRCodes } = require('../contoller/elpatronfunction');
const tablesController = require('../contoller/tables')

// Apply stricter rate limit to order creation
tableRoute.get('/getQRCodes',tablesController.getQRCodes)

tableRoute.get('/downloadQRCodesPDF', downloadQRCodes);

module.exports=tableRoute