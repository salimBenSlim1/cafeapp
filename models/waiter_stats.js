const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const WaiterDailyStat = sequelize.define("WaiterDailyStat", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cafeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  waiterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  waiterName: {
    type: DataTypes.STRING(120),
    allowNull: false,
    defaultValue: "",
  },
  itemName: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  itemCategory: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: "",
  },
  totalSold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  // One row per (cafeId, waiterId, itemName, day)
  statDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
}, {
  tableName: "waiter_daily_stats",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ["cafeId", "waiterId", "itemName", "statDate"],
      name: "uq_waiter_item_day",
    },
  ],
});

module.exports = WaiterDailyStat;