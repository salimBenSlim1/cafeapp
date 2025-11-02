const Item = require("../models/item")
const OrderItems = require("../models/orderItems")
const Orders = require("../models/orders")
const  sequelize  = require("../db/db-config");
const Table = require("../models/table");
const crypto=require('crypto');
const { getIo } = require("../socket");


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
updateOrderStatus: async (req, res) => {
  const { id } = req.params;
  const { status, tableId } = req.body;

  try {
    if (!status || !tableId || !id) 
      return res.status(400).json('Missing parameters');

    // Find order
    const order = await Orders.findOne({ where: { id } });
    if (!order) return res.status(404).json('Order not found');

    // Update status
    await Orders.update({ status }, { where: { id } });

    // Emit to the user who joined the room
    // Assuming the user joined the room named `user_<orderId>` when they created the order
    getIo().to(`user_${id}`).emit("statusUpdated", { orderId: id, status });
    
    // Update table session token
   

    return res.status(200).json('Status updated successfully');

  } catch (e) {
    console.error('updateOrderStatus error:', e);
    return res.status(500).json({ 'server error': e.message });
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
            sequelize.literal("SUM(OrderItems.quantity * OrderItems.price)"),
            "totalRevenue",
          ],
        ],
        group: ["OrderItems.itemId", "Item.id", "Item.name"],
        order: [[sequelize.literal("SUM(OrderItems.quantity)"), "DESC"]],
        limit: 5,
      }),

      // 🥈 Daily Revenue
      Orders.findAll({
        where: { status: "served", cafeId },
        attributes: [
          [sequelize.literal("DATE(Orders.createdAt)"), "day"], // ✅ MySQL date cast
          [sequelize.fn("SUM", sequelize.col("totalPrice")), "totalRevenue"],
        ],
        group: [sequelize.literal("DATE(Orders.createdAt)")],
        order: [[sequelize.literal("DATE(Orders.createdAt)"), "DESC"]],
      }),

      // 🥉 Busy Hours
      Orders.findAll({
        where: { status: "served", cafeId },
        attributes: [
          [
            sequelize.literal("HOUR(Orders.createdAt)"),
            "hour",
          ], // ✅ MySQL hour extraction
          [sequelize.fn("COUNT", sequelize.col("id")), "ordersCount"],
        ],
        group: [sequelize.literal("HOUR(Orders.createdAt)")],
        order: [[sequelize.literal("COUNT(Orders.id)"), "DESC"]],
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
        include: {
          model: Table,
          attributes: ["id", "number"], // add what you need
        },
        group: ["Orders.tableId", "Table.id"],
        order: [[sequelize.literal("SUM(Orders.totalPrice)"), "DESC"]],
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
}

}