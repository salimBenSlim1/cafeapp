const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const OrderItems = sequelize.define("OrderItems", {
  id:{
    type:DataTypes.INTEGER,
    primaryKey:true,
    autoIncrement:true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  
});

module.exports = OrderItems;