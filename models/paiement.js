const { DataTypes } = require('sequelize');
const sequelize = require('../db/db-config');
const Cafe = require('./cafe'); // 👈 import the actual model

const Payement = sequelize.define(
  'Payement',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    senderName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    senderEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    details: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    DateOfPayment: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cafeId: {
      type: DataTypes.INTEGER,
      references: {
        model: Cafe, // ✅ reference the actual model
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  {
    tableName: 'payments',
    timestamps: true,
    freezeTableName: true,
  }
);

module.exports = Payement;
