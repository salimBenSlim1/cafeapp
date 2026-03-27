const cron = require('node-cron');
const { Op } = require('sequelize');
const Orders = require('../models/orders');

// runs once per day at 3:00 AM
cron.schedule('27 11 * * *', async () => {
  try {
    console.log('🧹 Running OrderItems cleanup...');

    const fifteenHoursAgo = new Date(Date.now() - 15 * 60 * 60 * 1000);

    const deleted = await Orders.destroy({
      where: {
        createdAt: {
          [Op.lt]: fifteenHoursAgo
        }
      }
    });

    console.log(`✅ Deleted ${deleted} old order items`);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  }
});