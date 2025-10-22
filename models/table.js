const {DataTypes}=require('sequelize')
const sequelize=require('../db/db-config')
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
  sessionToken: {
    type: DataTypes.STRING, // lien vers QR
    allowNull: true
  },
  cafeId: {
  type: DataTypes.INTEGER,
  references: {
    model: "Cafes",
    key: "id",
  },
  onDelete: "CASCADE",
}

}, { timestamps: false });
module.exports = Table 
