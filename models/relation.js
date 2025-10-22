const Table=require('./table')
const sequelize=require('../db/db-config')
const Order=require('./orders')
const OrderItems=require('./orderItems')
const Item=require('./item')
const Cafe = require('./cafe')
const MessagesForm=require('./messagesForm')
Table.hasMany(Order,{foreignKey:'tableId'})
Order.belongsTo(Table,{foreignKey:'tableId'})

Item.hasMany(OrderItems,{foreignKey:'itemId'})
OrderItems.belongsTo(Item,{foreignKey:'itemId'})

Order.hasMany(OrderItems,{foreignKey:'orderId'})
OrderItems.belongsTo(Order,{foreignKey:'orderId'})

// 🏢 CAFE RELATIONS
Cafe.hasMany(Table, { foreignKey: 'cafeId', onDelete: 'CASCADE' });
Cafe.hasMany(Item, { foreignKey: 'cafeId', onDelete: 'CASCADE' });
Cafe.hasMany(Order, { foreignKey: 'cafeId', onDelete: 'CASCADE' });

Table.belongsTo(Cafe, { foreignKey: 'cafeId' });
Item.belongsTo(Cafe, { foreignKey: 'cafeId' });
Order.belongsTo(Cafe, { foreignKey: 'cafeId' });



async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database Connected!');
    
    // Sync tables in order based on dependencies
    console.log('Creating tables in order...');
    
    // 1. First, create tables with no foreign keys
    await Cafe.sync({ alter: true });
    console.log('✓ Cafes table created');
    
    // 2. Create tables that depend on Cafe
    await Item.sync({ alter: true });
    console.log('✓ Items table created');
    
    await Table.sync({ alter: true });
    console.log('✓ Tables table created');
    
    // 3. Create Order table which depends on Table and Cafe
    await Order.sync({ alter: true });
    console.log('✓ Orders table created');
    
    // 4. Finally create OrderItems which depends on Order and Item
    await OrderItems.sync({ alter: true });
    console.log('✓ OrderItems table created');

    // 5. Create any independent tables
    await MessagesForm.sync({ alter: true });
    console.log('✓ MessagesForm table created');

    console.log('📦 All Models synchronized successfully');
  } catch (error) {
    console.error('❌ DB Error:', error);
    // Log more details about the error
    if (error.parent) {
      console.error('Detailed error:', error.parent.message);
    }
    throw error; // Re-throw to ensure the application fails to start if DB setup fails
  }
}

// Execute the initialization
initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1); // Exit with error if DB initialization fails
});