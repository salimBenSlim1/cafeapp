const {DataTypes}=require('sequelize')
const sequelize=require('../db/db-config');
const Cafe = require('./cafe');
const Table = sequelize.define('Table', {
  id:{
    type:DataTypes.INTEGER,
    autoIncrement:true,
    primaryKey:true
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  status:{
    type: DataTypes.ENUM('libre', 'occupé'),
    allowNull:true
  },
  qrCodeURL: {
    type: DataTypes.STRING, // lien vers QR
    allowNull: true
  },
  qrKey: {
    type: DataTypes.STRING, // lien vers QR
    allowNull: true
  },
  sessionActive:{
    type:DataTypes.BOOLEAN,
    allowNull:true
  },
  sessionStart:{
    type:DataTypes.DATE,
    allowNull:true
  },
  lastOrderAt:{
    type:DataTypes.DATE,
    allowNull:true
  },
  assignedTo: {
    type: DataTypes.INTEGER, // lien vers QR
    allowNull: true
  },
  cafeId: {
  type: DataTypes.INTEGER,
  references: {
    model: Cafe,
    key: "id",
  },
  onDelete: "CASCADE",
}

}, { timestamps: false,
  indexes:[{
    fields:['assignedTo'],
    name:'idx_tables_assignedTo'
  }]
 });
module.exports = Table 
