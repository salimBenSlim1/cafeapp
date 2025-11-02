const serverRoute=require('express').Router()
const serverController=require('../contoller/servers')
const { generateServerReport } = require('../contoller/users')
serverRoute.post('/add-server',serverController.addServer)
serverRoute.put('/assign-tables/:id',serverController.assignTableToServer)
serverRoute.put('/update-server/:id',serverController.updateServerOfCoffe)
serverRoute.put('/clear-tables/:id',serverController.clearTablesServerOfCoffe)
serverRoute.get('/get-servers',serverController.getServersOfCoffe)
serverRoute.get('/get-daily-of-server/:serverId',generateServerReport)
serverRoute.get('/get-server-table/:id',serverController.getServerTables)
serverRoute.delete('/delete-servers/:id',serverController.deleteServerOfCoffe)

module.exports=serverRoute