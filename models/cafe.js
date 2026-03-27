const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const Cafe = sequelize.define(
  "Cafe",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false },
   
    email: { type: DataTypes.TEXT, allowNull: false, unique: true },
    password: { type: DataTypes.TEXT, allowNull: false },
    plan: { type: DataTypes.TEXT, allowNull: false, defaultValue: "basic" },
    subscriptionStartDate: { type: DataTypes.DATE, allowNull: false },
    subscriptionEndDate: { type: DataTypes.DATE, allowNull: false },
    lastLoginDate: { type: DataTypes.DATE, allowNull: false },
  
  },

  {
    tableName: "cafe", 
    freezeTableName: true, 
    timestamps: true,
  }
);

module.exports = Cafe;
