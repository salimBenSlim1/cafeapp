"use strict";

/**
 * SEED SCRIPT — CoffAI
 * ─────────────────────────────────────────────────────────────
 *  20 cafes  (already in DB — script reads them, doesn't recreate)
 *  70 items  each
 *  70 tables each
 *   6 servers each
 *  30 days history:
 *     2 000 orders      / day / cafe  (exact)
 *     4 000 order-items / day / cafe  (exact: 2 per order)
 *  DailyCafeStat + DailyItemStat rolled up from real numbers
 *
 *  Run:   node seed.js
 *  Deps:  npm i bcryptjs uuid
 */

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { Op }         = require("sequelize");

const sequelize    = require("./db/db-config");
const Cafe         = require("./models/cafe");
const Orders       = require("./models/orders");
const OrderItems   = require("./models/orderItems");
const Server       = require("./models/servers");
const Table        = require("./models/table");
const DailyItemStat = require("./models/items_stats");
const DailyCafeStat = require("./models/order_stats");
const Item         = require("./models/item");
async function seed(){

  for (let cafeId = 1; cafeId <= 20; cafeId++) {
    const orders = await Orders.bulkCreate(
      Array.from({ length: 2000 }, () => ({ cafeId, status: "served", totalPrice: 10,tableNumber:10 }))
  );
  
  await OrderItems.bulkCreate(
    orders.flatMap(o => [
      { orderId: o.id, itemId: 1, quantity: 1, price: 5 },
      { orderId: o.id, itemId: 2, quantity: 1, price: 5 },
    ])
  );
}

}
seed().catch(err => {
  console.error("\n❌  Seed failed:", err);
  process.exit(1);
});