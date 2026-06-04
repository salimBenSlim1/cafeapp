"use strict";
/**
 * seed-main.js
 * 20 cafes (already in DB) · 70 items · 70 tables · 6 servers · 30 days
 * 2 000 orders/day/cafe · 2 order-items per order
 * Rolls up DailyCafeStat + DailyItemStat from real numbers
 *
 * Run: node seed-main.js
 * Deps: npm i bcryptjs
 */

const bcrypt        = require("bcryptjs");
const { Op }        = require("sequelize");
const sequelize     = require("./db/db-config");
const Cafe          = require("./models/cafe");
const Item          = require("./models/item");
const Table         = require("./models/table");
const Server        = require("./models/servers");
const Orders        = require("./models/orders");
const OrderItems    = require("./models/orderItems");
const DailyItemStat = require("./models/items_stats");
const DailyCafeStat = require("./models/order_stats");

// ── Menu (matches your Item model: name, price, category) ────────
const MENU = [
  { name: "Espresso",          category: "Hot Drinks",  price: 1.80 },
  { name: "Café Crème",        category: "Hot Drinks",  price: 2.50 },
  { name: "Cappuccino",        category: "Hot Drinks",  price: 3.20 },
  { name: "Café Noisette",     category: "Hot Drinks",  price: 2.80 },
  { name: "Café Turc",         category: "Hot Drinks",  price: 2.00 },
  { name: "Café Viennois",     category: "Hot Drinks",  price: 3.50 },
  { name: "Thé Vert",          category: "Hot Drinks",  price: 2.20 },
  { name: "Thé à la Menthe",   category: "Hot Drinks",  price: 2.20 },
  { name: "Café Glacé",        category: "Cold Drinks", price: 3.80 },
  { name: "Cold Brew",         category: "Cold Drinks", price: 4.50 },
  { name: "Americano Glacé",   category: "Cold Drinks", price: 3.50 },
  { name: "Jus d'Orange",      category: "Cold Drinks", price: 3.00 },
  { name: "Citronnade",        category: "Cold Drinks", price: 3.00 },
  { name: "Coca-Cola",         category: "Cold Drinks", price: 2.50 },
  { name: "Croissant Beurre",  category: "Pastries",    price: 1.80 },
  { name: "Pain au Chocolat",  category: "Pastries",    price: 2.00 },
  { name: "Brioche Maison",    category: "Pastries",    price: 2.50 },
  { name: "Tarte Citron",      category: "Pastries",    price: 4.50 },
  { name: "Cheesecake",        category: "Pastries",    price: 5.00 },
  { name: "Croque Monsieur",   category: "Food",        price: 6.50 },
  { name: "Club Sandwich",     category: "Food",        price: 7.50 },
  { name: "Assiette Fromages", category: "Food",        price: 9.00 },
  { name: "Narguile Menthe",   category: "Hookah",      price: 12.00 },
  { name: "Narguile Double",   category: "Hookah",      price: 16.00 },
  { name: "Scrabble",          category: "Games",       price: 2.00 },
  { name: "Jeu d'Échecs",      category: "Games",       price: 2.00 },
  { name: "Dominos",           category: "Games",       price: 2.00 },
  { name: "Backgammon",        category: "Games",       price: 2.00 },
  { name: "Cartes à Jouer",    category: "Games",       price: 1.50 },
];

// Fill to 70 items with generic extras
while (MENU.length < 70) {
  const i = MENU.length + 1;
  MENU.push({ name: `Item ${i}`, category: "Extras", price: parseFloat((Math.random() * 8 + 1).toFixed(2)) });
}

const rand     = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randItem = () => MENU[rand(0, MENU.length - 1)];

// ── Helpers ──────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const CHUNK = 500; // bulkCreate chunk size
async function bulkChunked(Model, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await Model.bulkCreate(rows.slice(i, i + CHUNK));
  }
}

// ── Main ─────────────────────────────────────────────────────────
async function seed() {
  await sequelize.authenticate();
  console.log("✔  DB connected\n");

  const cafes = await Cafe.findAll({ attributes: ["id"], order: [["id", "ASC"]], limit: 20 });
  if (!cafes.length) { console.error("No cafes found — run cafe seed first."); process.exit(1); }

  const hashedPw = await bcrypt.hash("password123", 10);

  for (const cafe of cafes) {
    const cafeId = cafe.id;
    console.log(`\n── Cafe ${cafeId} ──────────────────────────────`);

    // ── 1. Items ────────────────────────────────────────────────
    const itemRows = MENU.map(m => ({ cafeId, name: m.name, price: m.price, category: m.category, isDeleted: false }));
    await bulkChunked(Item, itemRows);
    // Re-fetch so we have real IDs and names for order-item generation
    const items = await Item.findAll({ where: { cafeId }, attributes: ["id", "name", "price", "category"] });
    console.log(`  ✚ ${items.length} items`);

    // ── 2. Tables ───────────────────────────────────────────────
    const tableRows = Array.from({ length: 70 }, (_, i) => ({
      cafeId,
      number:        String(i + 1),
      status:        "libre",
      sessionActive: false,
    }));
    await bulkChunked(Table, tableRows);
    console.log(`  ✚ 70 tables`);

    // ── 3. Servers ──────────────────────────────────────────────
    const serverRows = Array.from({ length: 6 }, (_, i) => ({
      cafeId,
      name:     `Waiter ${i + 1}`,
      password: hashedPw,
      role:     "waiter",
    }));
    await bulkChunked(Server, serverRows);
    const servers = await Server.findAll({ where: { cafeId }, attributes: ["id"] });
    console.log(`  ✚ ${servers.length} servers`);

    // ── 4. 30 days of orders ────────────────────────────────────
    for (let day = 29; day >= 0; day--) {
      const statDate = daysAgo(day);

      // 4a. Orders (2 000 per day)
      const orderRows = Array.from({ length: 2000 }, () => ({
        cafeId,
        status:      "served",
        tableNumber: rand(1, 70),
        totalPrice:  0, // will set after items
        createdAt:   new Date(`${statDate}T12:00:00Z`),
        updatedAt:   new Date(`${statDate}T12:00:00Z`),
      }));
      await bulkChunked(Orders, orderRows);

      const orders = await Orders.findAll({
        where: { cafeId, createdAt: { [Op.gte]: new Date(`${statDate}T00:00:00Z`),
                                      [Op.lt]:  new Date(`${statDate}T23:59:59Z`) } },
        attributes: ["id"],
      });

      // 4b. OrderItems (2 per order — matches your model: itemName, price, etc.)
      const statTally = {}; // itemName → { category, unitPrice, totalSold, totalRevenue }
      let   dailyRevenue = 0;

      const oiRows = orders.flatMap(o => {
        const picks = [randItem(), randItem()];
        return picks.map(item => {
          const qty = rand(1, 3);
          const rev = parseFloat((item.price * qty).toFixed(2));
          dailyRevenue += rev;

          if (!statTally[item.name]) {
            statTally[item.name] = { category: item.category, unitPrice: item.price, totalSold: 0, totalRevenue: 0 };
          }
          statTally[item.name].totalSold    += qty;
          statTally[item.name].totalRevenue += rev;

          return {
            orderId:  o.id,
            itemName: item.name,         // ← string, matches your OrderItems model
            price:    item.price,
            quantity: qty,
            status:   "served",
            category: item.category,
            serverId: servers[rand(0, servers.length - 1)].id,
          };
        });
      });

      await bulkChunked(OrderItems, oiRows);

      // 4c. DailyItemStat rollup
      const itemStatRows = Object.entries(statTally).map(([itemName, v]) => ({
        cafeId,
        itemName,
        itemCategory: v.category,
        unitPrice:    v.unitPrice,
        totalSold:    v.totalSold,
        totalRevenue: parseFloat(v.totalRevenue.toFixed(2)),
        statDate,
      }));
      await DailyItemStat.bulkCreate(itemStatRows, {
        updateOnDuplicate: ["totalSold", "totalRevenue", "updatedAt"],
      });

      // 4d. DailyCafeStat rollup
      const totalOrders = orders.length;
      await DailyCafeStat.upsert({
        cafeId,
        statDate,
        totalRevenue:  parseFloat(dailyRevenue.toFixed(2)),
        totalOrders,
        avgOrderValue: parseFloat((dailyRevenue / totalOrders).toFixed(2)),
      });

      console.log(`  day ${statDate} → ${totalOrders} orders · ${oiRows.length} items · ${dailyRevenue.toFixed(2)} TND`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  ✅  Seed complete\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  await sequelize.close();
}

seed().catch(err => {
  console.error("\n❌  Seed failed:", err);
  process.exit(1);
});