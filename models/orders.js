// Table Command
const {DataTypes}=require('sequelize')
const sequelize=require('../db/db-config');
const Cafe = require('./cafe');
const Orders = sequelize.define('Orders', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey:true,
    autoIncrement:true
  },
  totalPrice: {
    type: DataTypes.FLOAT, // garde les articles sous forme d’array
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'canceled', 'served'),
    defaultValue: 'pending'
  },
  cafeId: {
  type: DataTypes.INTEGER,
  references: {
    model: Cafe,
    key: "id",
  },
  onDelete: "CASCADE",
}

}, {
  timestamps: true
});
module.exports=Orders
