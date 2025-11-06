const MessagesForm = require("../models/messagesForm")

module.exports={
    addForm:async(req,res)=>{
        try {
        const data=await MessagesForm.create(req.body)
        if (!data) return res.status(404).json('something went wrong')
        res.status(200).json('created')
            
        } catch (e) {
            res.status(500).json({'server err':e})
        }
    },
    getForms:async(req,res)=>{
        try {
        const data=await MessagesForm.findAll()
        if (!data) return res.status(404).json('something went wrong')
        res.status(200).json(data)
        } catch (e) {
            res.status(500).json('server err')
        }
    },
    deleteForm:async(req,res)=>{
        const {id}=req.params
        try {
            const data=await MessagesForm.destroy({where:{id}})
            if (!data) return res.status(400).json('something wrong')
            res.status(200).json('deleted')
            
        } catch (e) {
            res.status(500).json('server err')
            
        }
    }
}