const Table = require('./table');
const sequelize = require('../db/db-config');
const Order = require('./orders');
const OrderItems = require('./orderItems');
const Item = require('./item');
const Cafe = require('./cafe');
const MessagesForm = require('./messagesForm');
const Payement = require('./paiement');
const Server = require('./servers');
const OrderAudit = require('./orderAudit');

// ===== RELATIONS =====
Table.hasMany(Order, { foreignKey: 'tableId' });
Order.belongsTo(Table, { foreignKey: 'tableId' });

Item.hasMany(OrderItems, { foreignKey: 'itemId' });
OrderItems.belongsTo(Item, { foreignKey: 'itemId' });

Order.hasMany(OrderItems, { foreignKey: 'orderId' });
OrderItems.belongsTo(Order, { foreignKey: 'orderId' });

// 🏢 CAFE RELATIONS
Cafe.hasMany(Table, { foreignKey: 'cafeId', onDelete: 'CASCADE' });
Cafe.hasMany(Item, { foreignKey: 'cafeId', onDelete: 'CASCADE' });
Cafe.hasMany(Order, { foreignKey: 'cafeId', onDelete: 'CASCADE' });
Cafe.hasMany(Payement, { foreignKey: 'cafeId', onDelete: 'CASCADE' });

Table.belongsTo(Cafe, { foreignKey: 'cafeId' });
Item.belongsTo(Cafe, { foreignKey: 'cafeId' });
Order.belongsTo(Cafe, { foreignKey: 'cafeId' });
Payement.belongsTo(Cafe, { foreignKey: 'cafeId' });

Cafe.hasMany(Server, { foreignKey: "cafeId" });
Server.belongsTo(Cafe, { foreignKey: "cafeId" });

// 1 server → many order audits
Server.hasMany(OrderAudit, { foreignKey: "serverId" });
OrderAudit.belongsTo(Server, { foreignKey: "serverId" });

// 1 order → many audits
Order.hasMany(OrderAudit, { foreignKey: "orderId" });
OrderAudit.belongsTo(Order, { foreignKey: "orderId" });

Cafe.hasMany(OrderAudit, { foreignKey: "cafeId" });
OrderAudit.belongsTo(Cafe, { foreignKey: "cafeId" });
// ===== INIT FUNCTION =====
async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database Connected!');

    console.log('🧹 Dropping tables in dependency order...');

    // Drop children first to avoid FK conflicts
    await OrderItems.drop({ cascade: true });
    console.log('🗑️ OrderItems dropped');

    await Order.drop({ cascade: true });
    console.log('🗑️ Orders dropped');

    await Payement.drop({ cascade: true });
    console.log('🗑️ Payement dropped');

    await Table.drop({ cascade: true });
    console.log('🗑️ Tables dropped');

    await Item.drop({ cascade: true });
    console.log('🗑️ Items dropped');

    await MessagesForm.drop({ cascade: true });
    console.log('🗑️ MessagesForm dropped');

    await Cafe.drop({ cascade: true });
    console.log('🗑️ Cafe dropped');

    console.log('✅ All tables dropped successfully.');

    console.log('📦 Recreating tables...');
    await Cafe.sync({ force: false });
    console.log('✓ Cafe table created');

    await Item.sync({ force: false });
    console.log('✓ Item table created');

    await Table.sync({ force: false });
    console.log('✓ Table table created');

    await Order.sync({ force: false });
    console.log('✓ Order table created');

    await OrderItems.sync({ force: false });
    console.log('✓ OrderItems table created');

    await Payement.sync({ force: false });
    console.log('✓ Payement table created');

    await MessagesForm.sync({ force: false });
    console.log('✓ MessagesForm table created');
    
    await Server.sync({ force: false });
    console.log('✓ Server table created');
    
    await OrderAudit.sync({ force: false });
    console.log('✓ OrderAudit table created');
    
    console.log('🚀 All models recreated successfully!');
  } catch (error) {
    console.error('❌ DB Error:', error);
    if (error.parent) console.error('Detailed error:', error.parent.message);
    throw error;
  }
}


// Uncomment to run
// initDB().catch(err => {
//   console.error('Failed to initialize database:', err);
//   process.exit(1);
// });

module.exports = { initDB };
