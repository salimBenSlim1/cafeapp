const { Op } = require("sequelize")
const { AppError } = require("../utils/errors")

class Order{
    constructor({orderModel,orderItemsModel,itemModel,tableModel,sequelize}){
    this.order=orderModel
    this.orderItems=orderItemsModel
    this.item=itemModel
    this.table=tableModel
    this.sequelize=sequelize
    }
async getAllOrders(cafeId,page){
  const limit  = 10;
  const offset = (page - 1) * limit;
  const since  = new Date(Date.now() - 10 * 60 * 60 * 1000)
                   .toISOString().slice(0, 19).replace('T', ' ');

  const [rows, countResult] = await Promise.all([
    this.sequelize.query(`
      SELECT
        o.id,
        o.totalPrice,
        o.status,
        o.createdAt,
        o.updatedAt,
        o.tableNumber,
        oi.id       AS oi_id,
        oi.quantity AS oi_quantity,
        oi.price    AS oi_price,
        oi.comment  AS oi_comment,
        oi.itemName AS oi_itemName,
        oi.status AS oi_status,
        oi.createdAt AS oi_createdAt
      FROM (
        SELECT id, totalPrice, status, createdAt, updatedAt, tableNumber
        FROM Orders
        WHERE cafeId    = :cafeId
        AND updatedAt>=:since
        ORDER BY updatedAt DESC
        LIMIT :limit OFFSET :offset
      ) o
      LEFT JOIN OrderItems oi ON oi.orderId = o.id
    `, {
      replacements: { cafeId, since, limit, offset },
      type: this.sequelize.QueryTypes.SELECT,
    }),
    this.sequelize.query(`
      SELECT COUNT(*) AS total
      FROM Orders
      WHERE cafeId    = :cafeId
      AND updatedAt >= :since
        
    `, {
      replacements: { cafeId, since },
      type: this.sequelize.QueryTypes.SELECT,
    }),
  ]);

  const total = parseInt(countResult[0].total);

  const ordersMap = new Map();
  for (const row of rows) {
    if (!ordersMap.has(row.id)) {
      ordersMap.set(row.id, {
        id:          row.id,
        totalPrice:  row.totalPrice,
        status:      row.status,
        createdAt:   row.createdAt,
        updatedAt:   row.updatedAt,
        tableNumber: row.tableNumber,
        OrderItems:  [],
      });
    }
    if (row.oi_id) {
      ordersMap.get(row.id).OrderItems.push({
        id:       row.oi_id,
        quantity: row.oi_quantity,
        price:    row.oi_price,
        comment:  row.oi_comment,
        itemName: row.oi_itemName,
        status: row.oi_status,
        createdAt: row.oi_createdAt,
      });
    }
  }

  return{
    orders:     [...ordersMap.values()],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}
}
module.exports=Order