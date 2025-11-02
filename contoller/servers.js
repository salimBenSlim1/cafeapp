const Server = require("../models/servers")
const Table = require("../models/table")
const jwt=require('jsonwebtoken')
module.exports={
    addServer:async(req,res)=>{
        const cafeId=req.cafe.id
        try {
            const data=await Server.create({...req.body,cafeId})
            if (!data) return res.status(400).json('something wrong')
            res.status(200).json('server created')
            
        } catch (e) {
            res.status(500).json('server error')
        }
    },
    getServersOfCoffe:async(req,res)=>{
        const cafeId=req.cafe.id
        try {
            const data=await Server.findAll({
                where:{cafeId},
            })
            if (!data) return res.status(400).json('something wrong')
            res.status(200).json(data)
            
        } catch (e) {
            res.status(500).json('server error')
            
        }
    },
    getServerTables:async(req,res)=>{
        const cafeId=req.cafe.id
        const {id}=req.params
        if (!id) return res.status(400).json('err')
        try {
            const data=await Table.findAll({
                where:{cafeId,assignedTo:id},
            })
            if (!data) return res.status(400).json('something wrong')
            res.status(200).json(data)
            
        } catch (e) {
            res.status(500).json('server error')
            
        }
    },
    deleteServerOfCoffe:async(req,res)=>{
        const cafeId=req.cafe.id
        const {id}=req.params
        try {
            const data=await Server.destroy({where:{cafeId,id}})
            if (!data) return res.status(400).json('something wrong')
            res.status(200).json('server deleted')
            
        } catch (e) {
            res.status(500).json('server error')
            
        }
    },
    updateServerOfCoffe:async(req,res)=>{
        const cafeId=req.cafe.id
        const {id}=req.params
        if (!req.body.begin||req.body.end) return res.status(400).json('err')
        try {
            const data=await Server.update(
                {begin:req.body.begin,end:req.body.end},
                {where:{cafeId,id}})
            if (!data) return res.status(400).json('something wrong')
            res.status(200).json('server deleted')
            
        } catch (e) {
            res.status(500).json('server error')
            
        }
    },
    clearTablesServerOfCoffe:async(req,res)=>{
        const cafeId=req.cafe.id
        const {id}=req.params
        const {number}=req.body
       
        if (!id||!number) return res.status(400).json('err')
        try {
            const data=await Table.update(
                { assignedTo: '' },               // ✅ values
      { where: { cafeId, assignedTo:id,number } } 
    )
            if (!data) return res.status(400).json('something wrong')
            res.status(200).json('tables deleted')
            
        } catch (e) {
            res.status(500).json('server error')
            
        }
    },
   assignTableToServer: async (req, res) => {
  const cafeId = req.cafe.id;
  const { id } = req.params;
  const { id: serverId } = req.body; // rename for clarity

  if (!serverId || !id) {
    return res.status(400).json("Missing table or server ID");
  }

  try {
    const [updatedCount] = await Table.update(
      { assignedTo: parseInt(serverId) },               // ✅ values
      { where: { cafeId, number: id } }       // ✅ condition
    );

    if (updatedCount === 0) {
      return res.status(404).json("No table found or nothing updated");
    }

    res.status(200).json("Table assigned successfully");
  } catch (e) {
    console.error("assignTableToServer error:", e);
    res.status(500).json("Server error");
}
},



}