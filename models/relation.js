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
    console.log('✅ MySQL Connected!');
    await sequelize.sync({ alter: true });
    console.log('📦 Models synchronized');
  } catch (error) {
    console.error('❌ DB Error:', error);
  }
}
initDB()