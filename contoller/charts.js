const Order = require("../models/orders");
const Item = require("../models/item");
const OrderItems = require("../models/orderItems");
const { fn, col, literal, Op } = require("sequelize");

module.exports = {
  // Ventes par produit
  getSalesByItem: async (req, res) => {
    try {
      const cafeId = req.cafe.id;

      // 🗓️ Define the 7 last days (include today)
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0); // Start of 7 days ago

      const data = await OrderItems.findAll({
        attributes: [
          ["itemId", "itemId"],
          [fn("SUM", col("OrderItems.quantity")), "totalSold"],
          [literal('SUM("OrderItems"."quantity" * "OrderItems"."price")'), "totalRevenue"],
        ],
        include: [
          {
            model: Item,
            attributes: ["name"],
            required: true
          },
          {
            model: Order,
            attributes: [],
            required: true,
            where: {
              cafeId,
              status: "served",
              createdAt: {
                [Op.between]: [sevenDaysAgo, today],
              },
            },
          },
        ],
        group: ["OrderItems.itemId", "Item.id", "Item.name"],
        order: [[literal('SUM("OrderItems"."quantity" * "OrderItems"."price")'), "DESC"]], // Changed: repeat the calculation
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

      // Get today and 7 days ago with proper time boundaries
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0); // Start of 7 days ago

      const data = await Order.findAll({
        where: {
          cafeId,
          status: "served",
          createdAt: {
            [Op.between]: [sevenDaysAgo, today],
          },
        },
        attributes: [
          [
            literal('"createdAt"::date'),
            "date",
          ],
          [
            fn("SUM", col("totalPrice")),
            "revenue",
          ],
        ],
        group: [literal('"createdAt"::date')],
        order: [[literal('"createdAt"::date'), "ASC"]],
        raw: true
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