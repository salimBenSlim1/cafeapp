const cron = require('node-cron');
const { Op } = require('sequelize');
const Orders = require('../models/orders');
const OrderItems = require('../models/orderItems');
const Waiter = require('../models/waiter_stats');
const ItemStats = require('../models/items_stats');
const OrderStats = require('../models/order_stats');

// Runs once every day at 6:00 AM
cron.schedule('0 6 * * *', async () => {
  try {
    console.log('🧹 Running daily cleanup...');

    // --- Cutoff times ---
    const todayAt6AM = new Date();
    todayAt6AM.setHours(6, 0, 0, 0); // 6:00:00.000 AM today

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // --- 1. Delete OrderItems created before 6AM today ---
    const deletedOrderItems = await OrderItems.destroy({
      where: {
        createdAt: { [Op.lt]: todayAt6AM }
      }
    });
    console.log(`✅ Deleted ${deletedOrderItems} old OrderItems`);

    // --- 2. Delete Orders created before 6AM today ---
    const deletedOrders = await Orders.destroy({
      where: {
        createdAt: { [Op.lt]: todayAt6AM }
      }
    });
    console.log(`✅ Deleted ${deletedOrders} old Orders`);

    // --- 3. Delete Waiters older than 1 month ---
    const deletedWaiters = await Waiter.destroy({
      where: {
        createdAt: { [Op.lt]: oneMonthAgo }
      }
    });
    console.log(`✅ Deleted ${deletedWaiters} old Waiters`);

    // --- 4. Delete ItemStats older than 90 days ---
    const deletedItemStats = await ItemStats.destroy({
      where: {
        createdAt: { [Op.lt]: ninetyDaysAgo }
      }
    });
    console.log(`✅ Deleted ${deletedItemStats} old ItemStats`);

    // --- 5. Delete OrderStats older than 90 days ---
    const deletedOrderStats = await OrderStats.destroy({
      where: {
        createdAt: { [Op.lt]: ninetyDaysAgo }
      }
    });
    console.log(`✅ Deleted ${deletedOrderStats} old OrderStats`);

    console.log('🎉 Cleanup complete!');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  }
});