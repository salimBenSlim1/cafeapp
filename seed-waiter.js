/**
 * seed-waiter-stats.js
 * Run with:  node seed-waiter-stats.js
 * Seeds waiter_daily_stats for cafeId=4, waiterId=32, statDate=TODAY
 * Simulates 200 orders spread across a realistic cafe menu.
 */

const sequelize      = require("./db/db-config"); // adjust path if needed
const WaiterDailyStat = require("./models/waiter_stats");

// ── Menu (name, category, unit price) ───────────────────────────
const MENU = [
  // Hot drinks
  { name: "Espresso",          category: "Hot Drinks",   price: 1.80 },
  { name: "Café Crème",        category: "Hot Drinks",   price: 2.50 },
  { name: "Cappuccino",        category: "Hot Drinks",   price: 3.20 },
  { name: "Café Noisette",     category: "Hot Drinks",   price: 2.80 },
  { name: "Café Turc",         category: "Hot Drinks",   price: 2.00 },
  { name: "Café Viennois",     category: "Hot Drinks",   price: 3.50 },
  { name: "Thé Vert",          category: "Hot Drinks",   price: 2.20 },
  { name: "Thé à la Menthe",   category: "Hot Drinks",   price: 2.20 },

  // Cold drinks
  { name: "Café Glacé",        category: "Cold Drinks",  price: 3.80 },
  { name: "Cold Brew",         category: "Cold Drinks",  price: 4.50 },
  { name: "Americano Glacé",   category: "Cold Drinks",  price: 3.50 },
  { name: "Jus d'Orange",      category: "Cold Drinks",  price: 3.00 },
  { name: "Citronnade",        category: "Cold Drinks",  price: 3.00 },
  { name: "Coca-Cola",         category: "Cold Drinks",  price: 2.50 },

  // Food
  { name: "Croissant Beurre",  category: "Pastries",     price: 1.80 },
  { name: "Pain au Chocolat",  category: "Pastries",     price: 2.00 },
  { name: "Brioche Maison",    category: "Pastries",     price: 2.50 },
  { name: "Tarte Citron",      category: "Pastries",     price: 4.50 },
  { name: "Cheesecake",        category: "Pastries",     price: 5.00 },
  { name: "Croque Monsieur",   category: "Food",         price: 6.50 },
  { name: "Club Sandwich",     category: "Food",         price: 7.50 },
  { name: "Assiette Fromages", category: "Food",         price: 9.00 },

  // Games (hookah cafe specific)
  { name: "Narguile Menthe",   category: "Hookah",       price: 12.00 },
  { name: "Narguile Double",   category: "Hookah",       price: 16.00 },
  { name: "Scrabble",          category: "Games",        price: 2.00 },
  { name: "Jeu d'Échecs",      category: "Games",        price: 2.00 },
  { name: "Dominos",           category: "Games",        price: 2.00 },
  { name: "Backgammon",        category: "Games",        price: 2.00 },
  { name: "Cartes à Jouer",    category: "Games",        price: 1.50 },
];

// ── Weighted random pick (popular items sell more) ───────────────
// Items earlier in the list get slightly higher weight
function weightedRandom() {
  const weights = MENU.map((_, i) => Math.max(1, MENU.length - i * 0.4));
  const total   = weights.reduce((s, w) => s + w, 0);
  let   rand    = Math.random() * total;
  for (let i = 0; i < MENU.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return MENU[i];
  }
  return MENU[MENU.length - 1];
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  await sequelize.authenticate();
  console.log("✔  DB connected");

  const TODAY     = new Date().toISOString().slice(0, 10);
  const CAFE_ID   = 4;
  const WAITER_ID = 32;
  const WAITER_NAME = "Waiter #32";

  // Simulate 200 orders — each order has 1–4 items, random quantities
  const tally = {}; // itemName → { ...item, totalSold, totalRevenue }

  for (let order = 0; order < 200; order++) {
    const itemsInOrder = rand(1, 4);
    for (let j = 0; j < itemsInOrder; j++) {
      const item = weightedRandom();
      const qty  = rand(1, 3);
      const key  = item.name;

      if (!tally[key]) {
        tally[key] = { ...item, totalSold: 0, totalRevenue: 0 };
      }
      tally[key].totalSold    += qty;
      tally[key].totalRevenue += parseFloat((item.price * qty).toFixed(2));
    }
  }

  // Upsert one row per item (respects unique key uq_waiter_item_day)
  const rows = Object.values(tally);
  console.log(`\n📦  Inserting/updating ${rows.length} item rows for ${TODAY}…\n`);

  let inserted = 0, updated = 0;

  for (const row of rows) {
    const [record, created] = await WaiterDailyStat.findOrCreate({
      where: {
        cafeId:   CAFE_ID,
        waiterId: WAITER_ID,
        itemName: row.name,
        statDate: TODAY,
      },
      defaults: {
        cafeId:       CAFE_ID,
        waiterId:     WAITER_ID,
        waiterName:   WAITER_NAME,
        itemName:     row.name,
        itemCategory: row.category,
        totalSold:    row.totalSold,
        totalRevenue: parseFloat(row.totalRevenue.toFixed(2)),
        statDate:     TODAY,
      },
    });

    if (!created) {
      await record.increment({
        totalSold:    row.totalSold,
        totalRevenue: parseFloat(row.totalRevenue.toFixed(2)),
      });
      updated++;
    } else {
      inserted++;
    }

    console.log(
      `  ${created ? "✚ inserted" : "↑ updated "} | ${row.category.padEnd(14)} | ${row.name.padEnd(22)} | qty: ${String(row.totalSold).padStart(3)} | rev: ${row.totalRevenue.toFixed(2)} TND`
    );
  }

  // Summary
  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const totalSold    = rows.reduce((s, r) => s + r.totalSold, 0);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Done
  Date       : ${TODAY}
  Cafe ID    : ${CAFE_ID}
  Waiter ID  : ${WAITER_ID}
  Rows       : ${inserted} inserted, ${updated} updated
  Items sold : ${totalSold} units across ${rows.length} products
  Revenue    : ${totalRevenue.toFixed(2)} TND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  await sequelize.close();
}

seed().catch(err => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});