const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const DailyItemStat = sequelize.define("DailyItemStat", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cafeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
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
  // Plain DATE column — "2026-03-22"
  // This is what the UNIQUE KEY is built on, not createdAt
  statDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
}, {
  tableName: "daily_item_stats",
  timestamps: true,   // Sequelize manages createdAt / updatedAt normally
  indexes: [
    {
      unique: true,
      fields: ["cafeId", "itemName", "statDate"],
      name: "uq_item_day",
    },
  ],
});

module.exports = DailyItemStat;