const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const Server = sequelize.define(
  "Server",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    begin: { type: DataTypes.TEXT, allowNull: true },
    end: { type: DataTypes.TEXT, allowNull: true },
    password: { type: DataTypes.TEXT, allowNull: false },
    role: { type: DataTypes.TEXT, defaultValue: "server" },
    cafeId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "server",
    freezeTableName: true,
    timestamps: true,
  }
);

module.exports = Server;
