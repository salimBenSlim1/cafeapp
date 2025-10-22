// models/Cafe.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const Cafe = sequelize.define("Cafe", {
id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},
  name: { type: DataTypes.TEXT, allowNull: false },
  email: { type: DataTypes.TEXT, allowNull: false, unique: true },
  password: { type: DataTypes.TEXT, allowNull: false },
  plan: { type: DataTypes.TEXT, allowNull: false, defaultValue: "basic" },
  apiKey: { type: DataTypes.TEXT, allowNull: false, unique: true },
  apiKeyExpiresAt: { type: DataTypes.DATE, allowNull: false }, // تاريخ انتهاء الصلاحية
},{tableName:'cafe'})

module.exports = Cafe;