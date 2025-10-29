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
    type: DataTypes.STRING, // ex: "boisson chaude", "dessert", "jus"
    allowNull: true,
  },
  stock:{
    type:DataTypes.INTEGER,
    allowNull:true,
  },
  imageUrl: {
    type: DataTypes.STRING, // lien vers l’image (cappuccino, jus d’orange…)
    allowNull: true,
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

});

module.exports = Item;