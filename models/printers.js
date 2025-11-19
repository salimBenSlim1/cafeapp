const { DataTypes } = require('sequelize');
const sequelize = require('../db/db-config');
const Cafe = require('./cafe');
const Printer = sequelize.define('Printer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
   type: {
      type: DataTypes.ENUM('bar', 'chicha', 'cuisine', 'dessert', 'caisse'),
      allowNull: false
    },
    
     cafeId: {
      type: DataTypes.INTEGER,
      references: {
        model: Cafe,
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  })
module.exports = Printer;
