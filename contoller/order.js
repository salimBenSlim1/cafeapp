const Item = require("../models/item")
const OrderItems = require("../models/orderItems")
const Orders = require("../models/orders")
const  sequelize  = require("../db/db-config");
const Table = require("../models/table");
const crypto=require('crypto')


module.exports={
getAllOrders: async (req, res) => {
  try {
    const orders = await Orders.findAll({
      where:{cafeId:req.cafe.id},
      include: [
        {
          model: OrderItems,attributes:['id','quantity','price'],
          include: [{ model: Item,attributes:['name','imageUrl'] }],
        },
        {model:Table,attributes:['number']}
      ],
     
    });
    console.log(req.cafe.id)
    // const grouped = {};

    // for (const order of orders) {
    //   const tId = order.tableId;
    //   const status = order.status;

    //   if (!grouped[tId]) grouped[tId] = { tableId: tId, orders: [] };

    //   // نحاول نلقى order بنفس الـstatus
    //   let existing = grouped[tId].orders.find((o) => o.status === status);
    //   // نجهز الـitems
    //   const items = order.OrderItems.map((oi) => ({
    //     orderItemId: oi.id,
    //     id: oi.Item.id,
    //     name: oi.Item.name,
    //     price: oi.Item.price,
    //     quantity: oi.quantity,
    //   }));
    //   if (existing) {
    //     // ندمج totalPrice وitems
    //     existing.totalPrice += order.totalPrice;

    //     for (const item of items) {
    //       const found = existing.items.find((i) => i.id === item.id);
    //       if (found) {
    //         found.quantity += item.quantity;
    //       } else {
    //         existing.items.push(item);
    //       }
    //     }

    //     // نحافظ على أقدم createdAt
    //     if (new Date(order.createdAt) < new Date(existing.createdAt)) {
    //       existing.createdAt = order.createdAt;
    //     }
    //   } else {
    //     grouped[tId].orders.push({
    //       orderId: order.id, // 👈 حطيناه هنا
    //       status,
    //       totalPrice: order.totalPrice,
    //       createdAt: order.createdAt,
    //       items,
    //     });
    //   }
    // }

    // const groupedArray = Object.values(grouped);
    res.status(200).json(orders);
  } catch (e) {
    res.status(500).json({
      message: "Internal server error",
      error: e.message,
    });
  }
},
updateOrderStatus:async(req,res)=>{
  const {id}=req.params
  const {status,tableId}=req.body
  try {
    const data=await Orders.update({status},{where:{id}})
    const newToken = crypto.randomBytes(16).toString('hex');
    await Table.update(
    { sessionToken: newToken },
    { where: { id:tableId } }
  );
    if (data) return res.status(200).json('status updated')
    return res.status(404).json('something went wrong')
  } catch (e) {
    res.status(500).json({'server err':e})
    
  }
},
getInsights: async (req, res) => {
  const cafeId=req.cafe.id  
  try {
      const [topSelling, dailyRevenue, busyHours, avgOrder, revenueByTable] =
        await Promise.all([
          // 🥇 Top Selling Items
          OrderItems.findAll({
            include: [
              { model: Item, attributes: ["name"],where:{cafeId} },
              { model: Orders, attributes: [], where: { status: "served",cafeId } },
            ],
            attributes: [
              "itemId",
              [sequelize.fn("SUM", sequelize.col("quantity")), "totalSold"],
              [
                sequelize.fn(
                  "SUM",
                  sequelize.literal("quantity * OrderItems.price")
                ),
                "totalRevenue",
              ],
            ],
            group: ["itemId", "Item.name"],
            order: [[sequelize.literal("totalSold"), "DESC"]],
            limit: 5,
          }),

          // 🥈 Daily Revenue
          Orders.findAll({
            where: { status: "served",cafeId },
            attributes: [
              [sequelize.fn("DATE", sequelize.col("createdAt")), "day"],
              [sequelize.fn("SUM", sequelize.col("totalPrice")), "totalRevenue"],
            ],
            group: ["day"],
            order: [[sequelize.literal("day"), "DESC"]],
          }),

          // 🥉 Busy Hours
          Orders.findAll({
            where: { status: "served",cafeId },
            attributes: [
              [sequelize.fn("HOUR", sequelize.col("createdAt")), "hour"],
              [sequelize.fn("COUNT", sequelize.col("id")), "ordersCount"],
            ],
            group: ["hour"],
            order: [[sequelize.literal("ordersCount"), "DESC"]],
            limit: 5,
          }),

          // 🍪 Average Order Value
          Orders.findOne({
            where: { status: "served",cafeId },
            attributes: [
              [sequelize.fn("AVG", sequelize.col("totalPrice")), "averageOrder"],
            ],
          }),

          // ☕ Revenue by Table
          Orders.findAll({
            where: { status: "served",cafeId },
            attributes: [
              "tableId",
              [sequelize.fn("SUM", sequelize.col("totalPrice")), "totalRevenue"],
            ],
            include:{model:Table},
            group: ["tableId"],
            order: [[sequelize.literal("totalRevenue"), "DESC"]],
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

}