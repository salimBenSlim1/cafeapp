const { AppError } = require("../utils/errors")

class MessageFormService{
    constructor({messageModel}){
    this.message=messageModel

    }
    async add(formdata){
    const data=await this.message.create(formdata)
    if (!data) throw new AppError('error while creating form',400)
    return data
    }
    async getforms(){
        const data=await this.message.findAll()
        if (data.length===0) throw new AppError('forms not found',404)
        return data
    }
    async delForm(id){
        const data=await this.message.destroy({where:{id}})
        if (!data) throw new AppError('form not deleted',400)
        return data
    }
}
module.exports=MessageFormService