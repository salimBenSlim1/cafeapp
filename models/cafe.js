const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const Cafe = sequelize.define(
  "Cafe",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    verifiedPayment: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "0",
    },
    email: { type: DataTypes.TEXT, allowNull: false, unique: true },
    password: { type: DataTypes.TEXT, allowNull: false },
    plan: { type: DataTypes.TEXT, allowNull: false, defaultValue: "basic" },
    apiKey: { type: DataTypes.TEXT, allowNull: false, unique: true },
    apiKeyExpiresAt: { type: DataTypes.DATE, allowNull: false },
    subscriptionStartDate: { type: DataTypes.DATE, allowNull: false },
    subscriptionEndDate: { type: DataTypes.DATE, allowNull: false },
    lastLoginDate: { type: DataTypes.DATE, allowNull: false },
  },

  {
    tableName: "cafe", // ✅ exact table name you want
    freezeTableName: true, // ✅ prevents Sequelize from pluralizing it
    timestamps: true,
  }
);

module.exports = Cafe;
