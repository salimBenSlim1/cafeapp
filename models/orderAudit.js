const { DataTypes } = require("sequelize");
const sequelize = require("../db/db-config");

const OrderAudit = sequelize.define(
  "OrderAudit",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    serverId: { type: DataTypes.INTEGER, allowNull: false },
    cafeId: { type: DataTypes.INTEGER, allowNull: false },
    action: {
      type: DataTypes.ENUM( "CHANGE_QUANTITY", "CANCEL_ORDER"),
      allowNull: false,
    },
    oldValue: { type: DataTypes.JSON, allowNull: true },
    newValue: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "order_audit",
    freezeTableName: true,
    timestamps: true,
  }
);

module.exports = OrderAudit;
