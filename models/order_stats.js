const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const DailyCafeStat = sequelize.define("DailyCafeStat", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cafeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  totalOrders: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  avgOrderValue: {
    type: DataTypes.DECIMAL(10, 2),
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
  tableName: "daily_cafe_stats",
  timestamps: true,   // Sequelize manages createdAt / updatedAt normally
  indexes: [
    {
      unique: true,
      fields: ["cafeId", "statDate"],
      name: "uq_cafe_day",
    },
  ],
});

module.exports = DailyCafeStat;