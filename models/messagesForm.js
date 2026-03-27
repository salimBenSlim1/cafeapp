const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const MessagesForm = sequelize.define("messages_form", {
  id:{
    type:DataTypes.INTEGER,
    primaryKey:true,
    autoIncrement:true
  },
  nomCafe:{
      
      type: DataTypes.TEXT,
      allowNull: false,
  },
  nomPerson: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  email: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  phone: {
    type: DataTypes.TEXT, 
    allowNull: true,
  },
  plan: {
    type: DataTypes.TEXT, 
    allowNull: true,
  }
},{tableName:'messages_form'});

module.exports = MessagesForm;