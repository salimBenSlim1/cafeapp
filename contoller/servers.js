const Server = require("../models/servers")
const Table = require("../models/table")
const ServerService = require("../services/server")
const sequelize = require("../db/db-config")
const serverService=new ServerService({serverModel:Server,tableModel:Table,sequelize})
module.exports={
    addServer:async(req,res,next)=>{
        const cafeId=req.cafe.id
        try {
            const sData=await serverService.addServer(req.validatedData,cafeId) 
            if (sData) res.status(200).json({message:'server created',status:'success',data:sData})

        } catch (e) {
            next(e)
        }
    },
    getServersOfCoffe:async(req,res,next)=>{
        const cafeId=req.cafe.id
        try {
            const data=await serverService.getServerOfCoffe(cafeId)
            if (data.length!==0) res.status(200).json({status:'success',message:'servers retrieved',data})
            
        } catch (e) {
        next(e)            
        }
    },
    getServerTables:async(req,res,next)=>{
        const cafeId=req.cafe.id
        const {id}=req.params
        try {
            const data=await serverService.getServerTables(cafeId,id)
            if (data.length!==0) res.status(200).json({status:'success',message:'servers retrieved',data})
            
        } catch (e) {
        next(e)            
        }
    },
    deleteServerOfCoffe:async(req,res,next)=>{
        const cafeId=req.cafe.id
        const {id}=req.params
        try {
        const data=await serverService.deleteServerFromCoffee(cafeId,id)
        if (data) res.status(200).json({status:'success',message:'server deleted',data})
            
        } catch (e) {
        next(e)            
        }
    },
    updateServerOfCoffe:async(req,res,next)=>{
        const cafeId=req.cafe.id
        const {id}=req.params
        try {
            const data=await serverService.updateServerCoffee(cafeId,id,req.validatedData.begin,req.validatedData.end)
            if (data) res.status(200).json({status:'success',message:'server updated',data})
            
        } catch (e) {
            next(e)
            
        }
    },
    clearTablesServerOfCoffe:async(req,res,next)=>{
        const cafeId=req.cafe.id
        const {id}=req.validatedData
        const {number}=req.body
        console.log(number,id,cafeId)
        if (!Number(number)) return res.status({status:'fail',message:'id must be number'})

       
        if (!id||!number) return res.status(400).json('err')
        try {
            const data=await serverService.clearTableServer(cafeId,id,number)
        if (data) return res.status(200).json({status:'success',message:'table cleared',data})
            
        } catch (e) {
            next(e)
            
        }
    },
   assignTableToServer: async (req, res,next) => {
  const cafeId = req.cafe.id;
  const { id } = req.params;
  const { id: serverId } = req.body
  if (!Number.isInteger(serverId)) return res.status({status:'fail',message:'id must be number'})



  try {

    const updatedCount = await serverService.assignTableToServer(cafeId,id,serverId)
    if (updatedCount !== 0) {
    res.status(200).json({ status: 'success', message: 'table assigned' })
     
    }

  } catch (e) {
   next(e)
}
},



}