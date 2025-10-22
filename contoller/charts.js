const Order = require("../models/orders");
const Item  = require("../models/item");
const OrderItems = require("../models/orderItems");
const { fn, col, literal,Op } = require("sequelize");

module.exports = {
  // Ventes par produit
getSalesByItem: async (req, res) => {
  try {
    const cafeId = req.cafe.id;

    // 🗓️ Define the 7 last days (include today)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const data = await OrderItems.findAll({
      attributes: [
        "itemId",
        [fn("SUM", col("OrderItems.quantity")), "totalSold"],
        [fn("SUM", literal("OrderItems.quantity * OrderItems.price")), "totalRevenue"],
      ],
      include: [
        {
          model: Item,
          attributes: ["name"],
        },
        {
          model: Order,
          attributes: [],
          where: {
            cafeId,
            status: "served", // optional if you only want completed orders
            createdAt: {
              [Op.between]: [sevenDaysAgo, today], // ✅ filter last 7 days
            },
          },
        },
      ],
      group: ["OrderItems.itemId", "Item.name"],
      order: [[literal("totalRevenue"), "DESC"]], // optional: sort by revenue
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error", error: e.message });
  }
},



  // Revenus journaliers sur les 7 derniers jours
 getDailyRevenue: async (req, res) => {
  try {
    const cafeId = req.cafe.id;

    // Get today and 7 days ago
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7); // include today (7 total days)

    const data = await Order.findAll({
      where: {
        cafeId,
        status: "served",
        createdAt: {
          [Op.between]: [sevenDaysAgo, today], // ✅ Only last 7 days
        },
      },
      attributes: [
        [
          Order.sequelize.fn("DATE", Order.sequelize.col("createdAt")),
          "date",
        ],
        [
          Order.sequelize.fn("SUM", Order.sequelize.col("totalPrice")),
          "revenue",
        ],
      ],
      group: ["date"],
      order: [["date", "ASC"]],
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Internal server error",
      error: e.message,
    });
  }
},

};
