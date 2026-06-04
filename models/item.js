const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");
const Cafe = require("./cafe");

const Item = sequelize.define("Item", {
  id:{
    type:DataTypes.INTEGER,
    primaryKey:true,
    autoIncrement:true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING, 
    allowNull: true,
  },
  stock:{
    type:DataTypes.INTEGER,
    allowNull:true,
  },
  imageUrl: {
    type: DataTypes.STRING, 
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT, 
    allowNull: true,
  },
  isDeleted:{
    type:DataTypes.BOOLEAN,
    defaultValue:false
  },
  cafeId: {
  type: DataTypes.INTEGER,
  references: {
    model: Cafe,
    key: "id",
  },
  onDelete: "CASCADE",
  allowNull: false,
}

},{
  indexes: [
    {
      
      fields: ["cafeId"],
      name: "idx_item_cafeId",
    },
  ],
});

module.exports = Item;