const { AppError } = require("../utils/errors")

class ServerService{
    constructor({serverModel,tableModel,sequelize}){
    this.server=serverModel
    this.table=tableModel
    this.sequelize=sequelize
    }
    async addServer(serverData,cafeId){
      
        const data=await this.server.create({...serverData,cafeId})
        if (!data) throw new AppError('server not created',400)
        return data
        
    }
    async getServerOfCoffe(cafeId){
        const data=await this.server.findAll({where:{cafeId}})
        if (data.length===0) throw new AppError('no server found',404)
        return data
    }
    async getServerTables(cafeId,id){
        const data=await this.table.findAll({where:{cafeId,assignedTo:id}})
        if (data.length===0) throw new AppError('no server found',404)
        return data    
    }
    async deleteServerFromCoffee(cafeId,id){
        const transaction=await this.sequelize.transaction()
        try {
            
            const data=await this.table.update({assignedTo:null},{where:{cafeId,assignedTo:id},transaction})
            const del=await this.server.destroy({where:{id},transaction}) 
            await transaction.commit()
            if (!del) throw new AppError('server not deleted', 404)
            return del
        } catch (e) {
            await transaction.rollback()
            throw e
        }
    }
    async updateServerCoffee(cafeId,id,begin,end){
        const [data]=await this.server.update(
                {begin,end},
                {where:{cafeId,id}})
        if (!data) throw new AppError('server not updated',400)
        return data
    }
    async clearTableServer(cafeId,id,number){
    const [data]=await this.table.update(
                { assignedTo: null },               
      { where: { cafeId, assignedTo:id,number } } 
    )
    if (data===0) throw new AppError('table not cleared',400)
    return data
    }
    async assignTableToServer(cafeId,id,serverId){
    const [updatedCount] = await this.table.update(
      { assignedTo: serverId },      
      { where: { cafeId, number: id } }      
    )
    if (updatedCount===0) throw new AppError('table not assigned',400)
    return updatedCount
    }
}
module.exports=ServerService