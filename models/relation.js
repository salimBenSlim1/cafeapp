const Table = require('./table');
const sequelize = require('../db/db-config');
const Order = require('./orders');
const OrderItems = require('./orderItems');
const Item = require('./item');
const Cafe = require('./cafe');
const MessagesForm = require('./messagesForm');
const Server = require('./servers');

Order.hasMany(OrderItems, { foreignKey: 'orderId' });
OrderItems.belongsTo(Order, { foreignKey: 'orderId' });

Cafe.hasMany(Table, { foreignKey: 'cafeId', onDelete: 'CASCADE' });
Cafe.hasMany(Item, { foreignKey: 'cafeId', onDelete: 'CASCADE' });
Cafe.hasMany(Order, { foreignKey: 'cafeId', onDelete: 'CASCADE' });

Table.belongsTo(Cafe, { foreignKey: 'cafeId' });
Item.belongsTo(Cafe, { foreignKey: 'cafeId' });
Order.belongsTo(Cafe, { foreignKey: 'cafeId' });

Cafe.hasMany(Server, { foreignKey: "cafeId" });
Server.belongsTo(Cafe, { foreignKey: "cafeId" });

async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('Database Connected!');

    console.log('Dropping tables in dependency order...');

    await OrderItems.drop({ cascade: true });
    console.log(' OrderItems dropped');

    await Order.drop({ cascade: true });
    console.log(' Orders dropped');

    await Table.drop({ cascade: true });
    console.log(' Tables dropped');

    await Item.drop({ cascade: true });
    console.log('Items dropped');

    await MessagesForm.drop({ cascade: true });
    console.log(' MessagesForm dropped');
    
    await Server.drop({ cascade: true });
    console.log(' Server dropped');

    await Cafe.drop({ cascade: true });
    console.log(' Cafe dropped');

    console.log(' All tables dropped successfully.');

    console.log(' Recreating tables...');
    await Cafe.sync({ force: false });
    console.log(' Cafe table created');

    await Item.sync({ force: false });
    console.log(' Item table created');

    await Table.sync({ force: false });
    console.log('Table table created');

    await Order.sync({ force: false });
    console.log('Order table created');

    await OrderItems.sync({ force: false });
    console.log('OrderItems table created');

    await MessagesForm.sync({ force: false });
    console.log('MessagesForm table created');
    
    await Server.sync({ force: false });
    console.log('Server table created');
        
    console.log('All models recreated successfully!');
  } catch (error) {
    console.error('DB Error:', error);
    if (error.parent) console.error('Detailed error:', error.parent.message);
    throw error;
  }
}


// Run once
// initPrinterModel();

// Uncomment to run
// initDB().catch(err => {
//   console.error('Failed to initialize database:', err);
//   process.exit(1);
// });

module.exports = { initDB };
