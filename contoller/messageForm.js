const MessagesForm = require("../models/messagesForm")
const MessageFormService = require("../services/messageForm")
const { AppError } = require("../utils/errors")

module.exports={
    addForm:async(req,res,next)=>{
        try {
        const messageFormService=new MessageFormService({messageModel:MessagesForm})
        const created=await messageFormService.add(req.body)
        return res.status(200).json({status:'success',message:'form created successfully'})
        } catch (e) {
           next(e)
        }
    },
    getForms:async(req,res,next)=>{
        try {
        const messageFormService=new MessageFormService({messageModel:MessagesForm})
        const data=await messageFormService.getforms()
        if (data) res.status(200).json({
            status:'success',
            message:'forms retrived successfully',
            data
        })
        } catch (e) {
            next(e)
        }
    },
    deleteForm:async(req,res,next)=>{
        const {id}=req.params
        try {
           const messageFormService=new MessageFormService({messageModel:MessagesForm})
            const data=await messageFormService.delForm(id)
            if (data) return res.status(200).json({
                status:'success',
                message:'form deleted'
            })
            
        } catch (e) {
            next(e)
            
        }
    }
}