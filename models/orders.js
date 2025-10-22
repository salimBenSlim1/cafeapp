// Table Command
const {DataTypes}=require('sequelize')
const sequelize=require('../db/db-config')
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
    type: DataTypes.ENUM('pending', 'prepared', 'served'),
    defaultValue: 'pending'
  },
  cafeId: {
  type: DataTypes.INTEGER,
  references: {
    model: "Cafes",
    key: "id",
  },
  onDelete: "CASCADE",
}

}, {
  timestamps: true
});
module.exports=Orders
