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
    type: DataTypes.FLOAT, 
    allowNull: true
  },
  tableNumber: {
    type: DataTypes.INTEGER, 
    allowNull: false
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
  timestamps: true,
  indexes:[{
    fields:['createdAt'],
    name:'idx_orders_createdAt'
  }
  ]
});
module.exports=Orders
