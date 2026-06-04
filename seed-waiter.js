"use strict";

const sequelize       = require("./db/db-config");
const WaiterDailyStat = require("./models/waiter_stats");
const Cafe            = require("./models/cafe");
const Server          = require("./models/servers");

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

function weightedRandom() {
  const weights = MENU.map((_, i) => Math.max(1, MENU.length - i * 0.4));
  const total   = weights.reduce((s, w) => s + w, 0);
  let   r       = Math.random() * total;
  for (let i = 0; i < MENU.length; i++) {
    r -= weights[i];
    if (r <= 0) return MENU[i];
  }
  return MENU[MENU.length - 1];
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  await sequelize.authenticate();
  console.log("✔  DB connected\n");

  // ── Pull a real cafe + server from DB ──────────────────────────
  const cafe = await Cafe.findOne({ attributes: ["id", "name"] });
  if (!cafe) { console.error("❌ No cafes in DB. Seed cafes first."); process.exit(1); }

  const server = await Server.findOne({ where: { cafeId: cafe.id }, attributes: ["id", "name"] });
  if (!server) { console.error(`❌ No servers found for cafeId=${cafe.id}. Seed servers first.`); process.exit(1); }

  const CAFE_ID     = cafe.id;
  const WAITER_ID   = server.id;
  const WAITER_NAME = server.name;
  const TODAY       = new Date().toISOString().slice(0, 10);

  console.log(`  Cafe     : ${cafe.name} (id=${CAFE_ID})`);
  console.log(`  Waiter   : ${WAITER_NAME} (id=${WAITER_ID})`);
  console.log(`  Date     : ${TODAY}\n`);

  // ── Simulate 200 orders ────────────────────────────────────────
  const tally = {};
  for (let o = 0; o < 200; o++) {
    for (let j = 0; j < rand(1, 4); j++) {
      const item = weightedRandom();
      const qty  = rand(1, 3);
      if (!tally[item.name]) tally[item.name] = { ...item, totalSold: 0, totalRevenue: 0 };
      tally[item.name].totalSold    += qty;
      tally[item.name].totalRevenue  = parseFloat((tally[item.name].totalRevenue + item.price * qty).toFixed(2));
    }
  }

  const rows = Object.values(tally);
  console.log(`📦  Upserting ${rows.length} rows…\n`);

  await WaiterDailyStat.bulkCreate(
    rows.map(row => ({
      cafeId:       CAFE_ID,
      waiterId:     WAITER_ID,
      waiterName:   WAITER_NAME,
      itemName:     row.name,
      itemCategory: row.category,
      totalSold:    row.totalSold,
      totalRevenue: row.totalRevenue,
      statDate:     TODAY,
    })),
    { updateOnDuplicate: ["totalSold", "totalRevenue", "updatedAt"] }
  );

  rows.forEach(row =>
    console.log(`  ↑ ${row.category.padEnd(14)} | ${row.name.padEnd(22)} | qty: ${String(row.totalSold).padStart(3)} | rev: ${row.totalRevenue.toFixed(2)} TND`)
  );

  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const totalSold    = rows.reduce((s, r) => s + r.totalSold, 0);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Done
  Cafe       : ${cafe.name} (id=${CAFE_ID})
  Waiter     : ${WAITER_NAME} (id=${WAITER_ID})
  Date       : ${TODAY}
  Rows       : ${rows.length} upserted
  Items sold : ${totalSold} units
  Revenue    : ${totalRevenue.toFixed(2)} TND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  await sequelize.close();
}

seed().catch(err => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});