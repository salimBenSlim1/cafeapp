const { AppError } = require("../utils/errors");
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt');
const { Op } = require("sequelize");
class CafeService {
    constructor({ cafeModel, tokenService,ordersModel,orderItemsModel,serverModel,tableModel }) {
        this.cafe = cafeModel;
        this.server=serverModel
        this.orders=ordersModel;
        this.ordersItems=orderItemsModel;
        this.table=tableModel;
        this.tokenService = tokenService;
    }

    /**
     * Login a cafe with email and password
     * @param {string} email - Cafe email
     * @param {string} password - Cafe password
     * @param {number} latitude - Optional cafe latitude
     * @param {number} longitude - Optional cafe longitude
     * @returns {object} - { accessToken, refreshToken, cafe }
     */
    async login(email, password) {
        // Find cafe by email
        const cafe = await this.cafe.findOne({ where: { email } });

        // Check if cafe exists
        if (!cafe) {
            throw new AppError('Invalid email or password', 401);
        }

        // Check password (direct comparison - consider using bcrypt in production)
        if (cafe.password !== password) {
            throw new AppError('Invalid email or password', 401);
        }

        // Check subscription status
        const now = new Date();
        if (!cafe.subscriptionEndDate || now > new Date(cafe.subscriptionEndDate)) {
            throw new AppError('Your subscription has expired', 403);
        }    
        await cafe.update({ lastLoginDate: now });
        const accessToken = this.tokenService.generateAccessToken(cafe);
        const refreshToken = this.tokenService.generateRefreshToken(cafe);

        return {
            accessToken,
            refreshToken,
            cafe: {
                id: cafe.id,
                name: cafe.name,
                email: cafe.email,
                plan: cafe.plan,
            }
        };
    }
    async getCoffe(){
        try {
            const data=await this.cafe.findAll()
            return data
            
        } catch (e) {
            throw e
        }
    }
   async deleteCafe(cafeId, sequelize) {
    const t = await sequelize.transaction();
    
    try {
        const cafe = await this.cafe.findOne({
            where: { id: cafeId },
            transaction: t
        });

        if (!cafe) throw new AppError('cafe not found', 404);

        const orders = await this.orders.findAll({
            where: { cafeId },
            transaction: t
        });

        const mapedIds = orders.map(o => o.id);
        console.log(mapedIds)
        if (mapedIds.length > 0) {
            await this.ordersItems.destroy({
                where: {
                    orderId: { [Op.in]: mapedIds }
                },
                transaction: t
            });

            await this.orders.destroy({
                where: {
                    id: { [Op.in]: mapedIds }
                },
                transaction: t
            });
        }

        await this.table.destroy({ where: { cafeId }, transaction: t });
        await this.server.destroy({ where: { cafeId }, transaction: t });
        await this.cafe.destroy({ where: { id: cafeId }, transaction: t });

        await t.commit();

        return {
            message: 'coffee deleted successfully',
            status: 'success'
        };

    } catch (error) {
        await t.rollback();
        console.error(error);
        throw error;
    }
}
    async updateCafe(cafeId){
        try {
            
            const [verify]=await this.cafe.update({
                verifiedPayment:"1"
            },{where:{id:cafeId}})
            return verify
        } catch (e) {
            return false
        }
    }
    async updateCreatedAt(cafeId,newDate){
    const updateDate=await this.cafe.update({subscriptionEndDate:new Date(newDate)},{where:{id:cafeId}})
    return updateDate?1:0

    }
    async refresh(tok){
        try {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const decoded=await jwt.verify(tok,process.env.REFRESH_SECRET)
        const cafe = await this.cafe.findByPk(decoded.id);

        if (!cafe || !cafe.subscriptionEndDate || cafe.subscriptionEndDate <= new Date()) {
        throw new AppError('Subscription ended', 403);
        }
        if (!decoded.subscriptionEnd||decoded.subscriptionEnd<=new Date()) throw new AppError('subscription ended',403)
        return {token:this.tokenService.generateAccessToken(cafe),id:decoded.id}
            
        } catch (error) {
           throw error
        }
    }
}

module.exports = CafeService;
