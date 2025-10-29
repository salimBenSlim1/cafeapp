// Table Command
const {DataTypes}=require('sequelize')
const sequelize=require('../db/db-config')
const Payement = sequelize.define('payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey:true,
    autoIncrement:true
  },
  amount: {
    type: DataTypes.FLOAT, // garde les articles sous forme d’array
    allowNull: true
  },
  token: {
    type: DataTypes.STRING, // garde les articles sous forme d’array
    allowNull: true
  },
  method: {
    type: DataTypes.STRING, // garde les articles sous forme d’array
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  senderName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  senderEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  details: {
    type: DataTypes.STRING,
    allowNull: true
  },
  DateOfPayment: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cafeId: {
  type: DataTypes.INTEGER,
  references: {
    model: "Cafe",
    key: "id",
  },
  onDelete: "CASCADE",
}

}, {
  timestamps: true,
  
});
module.exports=Payement
