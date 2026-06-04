const Item = require("../models/item")
const OrderItems = require("../models/orderItems")
const Orders = require("../models/orders")
const  sequelize  = require("../db/db-config");
const Table = require("../models/table");
const DailyItemStat  = require('../models/items_stats');
const DailyCafeStat  = require('../models/order_stats');
const WaiterDailyStat = require('../models/waiter_stats');

const socketServer = require("../socket");
const OrderService=require('../services/order');
const { Op } = require("sequelize");
const orderService=new OrderService({tableModel:Table,orderModel:Orders,orderItemsModel:OrderItems,itemModel:Item,sequelize})
function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
 
async function upsertIncrement(Model, where, defaults, deltas) {
  const [row, created] = await Model.findOrCreate({ where, defaults: { ...where, ...defaults } });
  if (!created) await row.increment(deltas);
}
 
async function writeServedStats(cafeId, orderId, orderRevenue) {
  const statDate = todayDate();
  const items    = await OrderItems.findAll({ where: { orderId }, raw: true });
 
  await Promise.all(items.map(item => {
    const itemName     = item.itemName     ?? 'Unknown';
    const itemCategory = item.itemCategory ?? '';
    const unitPrice    = parseFloat(item.price ?? 0);
    const quantity     = item.quantity ?? 1;
    const revenue      = parseFloat((unitPrice * quantity).toFixed(2));
 
    const ops = [
      upsertIncrement(
        DailyItemStat,
        { cafeId, itemName, statDate },
        { itemCategory, unitPrice, totalSold: quantity, totalRevenue: revenue },
        { totalSold: quantity, totalRevenue: revenue },
      ),
    ];
 
    if (item.serverId) {
      ops.push(upsertIncrement(
        WaiterDailyStat,
        { cafeId, waiterId: item.serverId, itemName, statDate },
        { waiterName: item.waiterName ?? '', itemCategory, totalSold: quantity, totalRevenue: revenue },
        { totalSold: quantity, totalRevenue: revenue },
      ));
    }
 
    return Promise.all(ops);
  }));
 
  const revenue = parseFloat(orderRevenue.toFixed(2));
  const [cafeRow, created] = await DailyCafeStat.findOrCreate({
    where:    { cafeId, statDate },
    defaults: { cafeId, totalRevenue: revenue, totalOrders: 1, avgOrderValue: revenue, statDate },
  });
  if (!created) {
    await cafeRow.increment({ totalRevenue: revenue, totalOrders: 1 });
    await cafeRow.reload();
    await cafeRow.update({
      avgOrderValue: parseFloat((parseFloat(cafeRow.totalRevenue) / cafeRow.totalOrders).toFixed(2)),
    });
  }
}
module.exports={
getAllOrders: async (req, res,next) => {
  const cafeId=req?.cafe?.id
  try {
    const page   = parseInt(req.query.page) || 1;

    const orders = await orderService.getAllOrders(cafeId,page)
    if (orders){
    res.status(200).json(orders)
    }
  } catch (e) {
   next(e)
  }
},
 updateOrderStatus : async (req, res) => {
  const { id }              = req.params;
  const { status, tableId } = req.body;
  const cafeId              = req.cafe.id;
 
  const VALID = ['served', 'canceled', 'pending', 'prepared'];
  if (!VALID.includes(status))
    return res.status(400).json({ error: 'Invalid status' });
 
  try {
    const order = await Orders.findOne({ where: { id, cafeId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
 
    await order.update({ status });
 
    if (status === 'served') {
      await OrderItems.update({ status: 'served' }, { where: { orderId: id } });
 
      socketServer.emitToCafe(cafeId, 'orderStatusUpdated', { id: Number(id), status: 'served' });
 
      const orderRevenue = parseFloat(order.totalPrice ?? 0);
      writeServedStats(cafeId, id, orderRevenue)
        .catch(err => console.error('writeServedStats failed:', err));
 
    } else if (status === 'canceled') {
      await OrderItems.update({ status: 'canceled' }, { where: { orderId: id } });
 
      const items = await OrderItems.findAll({
        where: { orderId: id }, attributes: ['id'], raw: true,
      });
 
      socketServer.emitToCafe(cafeId, 'order:canceled', {
        orderId: Number(id),
        tableId: tableId ?? order.tableId,
        itemIds: items.map(i => i.id),
      });
 
    } else {
      socketServer.emitToCafe(cafeId, 'orderStatusUpdated', { id: Number(id), status });
    }
 
    return res.status(200).json({ ok: true });
 
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return res.status(500).json({ error: err.message });
  }
},
getInsights: async (req, res) => {
  const cafeId = req.cafe.id;

  try {
    const [
      topSelling,
      dailyRevenue,
      busyHours,
      avgOrder,
      revenueByTable,
    ] = await Promise.all([
      // 🥇 Top Selling Items
      OrderItems.findAll({
        include: [
          {
            model: Item,
            attributes: ["name"],
            where: { cafeId },
          },
          {
            model: Orders,
            attributes: [],
            where: { status: "served", cafeId },
          },
        ],
        attributes: [
          "itemId",
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalSold"],
          [
            sequelize.literal(
              'SUM("OrderItems"."quantity" * "OrderItems"."price")'
            ),
            "totalRevenue",
          ],
        ],
        group: ["OrderItems.itemId", "Item.id", "Item.name"], // Fixed: added OrderItems prefix and Item.id
        order: [[sequelize.literal('SUM("OrderItems"."quantity")'), "DESC"]], // Fixed: use actual expression
        limit: 5,
      }),

      // 🥈 Daily Revenue
      Orders.findAll({
        where: { status: "served", cafeId },
        attributes: [
          [sequelize.literal('"Orders"."createdAt"::date'), "day"], // Fixed: PostgreSQL date cast
          [sequelize.fn("SUM", sequelize.col("totalPrice")), "totalRevenue"],
        ],
        group: [sequelize.literal('"Orders"."createdAt"::date')], // Fixed: PostgreSQL date cast
        order: [[sequelize.literal('"Orders"."createdAt"::date'), "DESC"]], // Fixed: PostgreSQL date cast
      }),

      // 🥉 Busy Hours
      Orders.findAll({
        where: { status: "served", cafeId },
        attributes: [
          [
            sequelize.fn(
              "EXTRACT",
              sequelize.literal('HOUR FROM "Orders"."createdAt"')
            ),
            "hour",
          ], // Fixed: PostgreSQL EXTRACT
          [sequelize.fn("COUNT", sequelize.col("id")), "ordersCount"],
        ],
        group: [
          sequelize.fn(
            "EXTRACT",
            sequelize.literal('HOUR FROM "Orders"."createdAt"')
          ),
        ], // Fixed: use expression in group
        order: [[sequelize.literal('COUNT("Orders"."id")'), "DESC"]], // Fixed: use actual expression
        limit: 5,
      }),

      // 🍪 Average Order Value
      Orders.findOne({
        where: { status: "served", cafeId },
        attributes: [
          [sequelize.fn("AVG", sequelize.col("totalPrice")), "averageOrder"],
        ],
      }),

      // ☕ Revenue by Table
      Orders.findAll({
        where: { status: "served", cafeId },
        attributes: [
          "tableId",
          [sequelize.fn("SUM", sequelize.col("totalPrice")), "totalRevenue"],
        ],
        include: { model: Table }, // Added attributes for clarity
        group: ["Orders.tableId", "Table.id"], // Fixed: added Table.id for GROUP BY
        order: [[sequelize.literal('SUM("Orders"."totalPrice")'), "DESC"]], // Fixed: use actual expression
      }),
    ]);

    res.status(200).json({
      topSelling,
      dailyRevenue,
      busyHours,
      avgOrder,
      revenueByTable,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
},
// GET /api/orders/last?tableId=7&cafeId=abc123
getLastOrder: async (req, res) => {
  const { tableNumber, cafeId } = req.user;
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  try {
    // Adjust model/field names to your ORM/schema
    const order = await Orders.findOne({
      where: { tableNumber, cafeId
        // ,createdAt:{[Op.gte]:twoHoursAgo}
       },
      order: [['createdAt', 'DESC']],
      include: [{ model: OrderItems}],
    });

    if (!order) return res.status(404).json({ error: 'No order found' });

    const items = order.OrderItems.map(item => ({
      id: item.id,
      name: item.itemName,
      qty: item.quantity,
      unitPrice: item.price,
      status:item.status,
      subtotal: item.quantity * item.price,
    }));

    const total = items.reduce((sum, i) => sum + i.subtotal, 0);

    res.json({
      orderId: order.id,
      status: order.status,       
      tableId: order.tableNumber,
      cafeId: order.cafeId,
      createdAt: order.createdAt,
      items,
      total: parseFloat(total.toFixed(2)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

}