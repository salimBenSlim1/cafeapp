const { AppError } = require("../utils/errors")

class Items{
    constructor({itemModel,cafeId,cafeModel}){
        this.Item=itemModel
        this.cafeId=cafeId
        this.cafe=cafeModel
    }
    async getAllItems(){
        const data=await this.Item.findAll({where:{cafeId:this.cafeId,isDeleted:false}})
        if (data.length===0){
             throw new AppError('No Items Founds',404)
        }
        return data
    }
    async add(itemDetails){
        const data=await this.Item.create({...itemDetails,cafeId:this.cafeId})
        if (!data){
            throw new AppError('Item not created',400)
        }
        return data
    }
    async upItem(itemDetails,id){
        const [updated]=await this.Item.update(itemDetails,{where:{cafeId:this.cafeId,id}})
        if (updated===0) throw new AppError('Item not found',404)
        return updated
    }
    async del(id,cafeId){
    const [deleted]=await this.Item.update({isDeleted:true},{where:{id,cafeId}})
    if (deleted===0) throw new AppError('item not delted',400)
    return deleted
    }
    async getItemsForUser(cafeId){
        const data=await this.Item.findAll({
            where:{cafeId,isDeleted:false},
            attributes:['id','name','price','category','stock','imageUrl']
        })
        if (data.length===0) throw new AppError('items not found',404)
        return data
    }
}
module.exports=Items