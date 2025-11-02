const OrderItems=require('../models/orderItems')
const Order=require('../models/orders')
const Item=require('../models/item')
const Table = require('../models/table')
const { getIo } = require("../socket");
const {literal,Op} =require('sequelize')
const sequelize=require('../db/db-config');
const Cafe = require('../models/cafe');

module.exports={
    addOrder : async (req, res) => {
  const { items, cafeId } = req.body;
  const tableId = req.table.id;
  const transaction = await sequelize.transaction();

  try {
    // 1. Validate input
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    // 2. Pre-fetch all items with stock check
    const itemIds = items.map(it => it.itemId);
    const existingItems = await Item.findAll({
      where: { 
        id: itemIds,
        cafeId // Security: Ensure items belong to the café
      },
      lock: transaction.LOCK.UPDATE, // Lock rows for update
      transaction
    });

    // Validate all items exist and have sufficient stock
    const itemMap = new Map(existingItems.map(item => [item.id, item]));
    for (const orderItem of items) {
      const item = itemMap.get(orderItem.itemId);
      if (!item) {
        await transaction.rollback();
        return res.status(404).json({ 
          error: `Item ${orderItem.itemId} not found or doesn't belong to this café`
        });
      }
      if (item.stock < orderItem.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Insufficient stock for item ${item.name}. Available: ${item.stock}`
        });
      }
    }
    
    const caffe=await Cafe.findOne({where:{id:cafeId}})
    // 3. Find or create order with proper status check
    const [order, created] = await Order.findOrCreate({
      where: {
        tableId,
        cafeId,
        status: {
    [Op.notIn]: ['served', 'canceled']
  }
      },
      defaults: {
        totalPrice: 0,
        status: 'pending'
      },
      transaction
    });

    // 4. Process items and update stock atomically
    let total = order.totalPrice || 0;
    const orderItemsToCreate = [];
    const stockUpdates = [];

    for (const it of items) {
      const item = itemMap.get(it.itemId);
      
      // Find existing order item
      let orderItem = await OrderItems.findOne({
        where: {
          orderId: order.id,
          itemId: it.itemId
        },
        transaction
      });

      const newQuantity = orderItem ? orderItem.quantity + it.quantity : it.quantity;

      // Update or create order item
      if (orderItem) {
        await orderItem.update({
          quantity: newQuantity
        }, { transaction });
      } else {
        orderItemsToCreate.push({
          quantity: it.quantity,
          price: item.price,
          itemId: item.id,
          orderId: order.id
        });
      }

      // Prepare stock update
      stockUpdates.push(
        Item.update(
          { 
            stock: literal(`stock - ${it.quantity}`),
            updatedAt: new Date()
          },
          { 
            where: { 
              id: it.itemId,
              stock: { [Op.gte]: it.quantity } // Double-check stock availability
            },
            transaction
          }
        )
      );
      
      // Update running total
      total += it.quantity * item.price;
      
      // Check if stock will be low after update
      if (item.stock - it.quantity < 3) {
        getIo().to(`cafe_${caffe.id}`).emit("newAlert", {
          name: item.name,
          stock: item.stock - it.quantity
        });
      }
    }

    // 5. Create new order items in bulk
    if (orderItemsToCreate.length > 0) {
      await OrderItems.bulkCreate(orderItemsToCreate, { transaction });
    }

    // 6. Execute all stock updates
    await Promise.all(stockUpdates);

    // 7. Update order total
    await order.update({ 
      totalPrice: total 
    }, { transaction });

    // 8. Commit transaction
    await transaction.commit();

    // 9. Notify frontend
    getIo().to(`cafe_${caffe.id}`).emit("newOrder", {
      ...order.toJSON(),
      items: orderItemsToCreate
    });
    

    return res.status(201).json({
      message: "Order created successfully",
      orderId: order.id
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Order creation error:', error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
},

getItemsEndSoon: async (req, res) => {
  const cafeId = req.cafe.id;

  try {
    const data = await Item.findAll({
      where: {
        cafeId,                  // ✅ Correct object syntax
        stock: { [Op.lt]: 3 }    // ✅ Use Sequelize operator properly
      }
    });

    if (!data.length) {
      return res.status(404).json('No items found with low stock');
    }

    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ 'server error': e.message });
  }
}
,

    getAllInfoOfOneTable: async (req, res) => {
  const { id } = req.params;
  const cafeId=req.cafe.id

  try {
    const data = await Order.findOne({
  where: { id ,cafeId},
  include: [
    {
      model: OrderItems,
      include: [{ model: Item,attributes: [ "name", "price", "imageUrl"], }]
    }
  ]
});



    if (!data || data.length === 0)
    return res.status(404).json({ message: "Order not found" });

    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ message: "Internal server error", error: e.message });
  }
}
,
    adminUpdateOrder: async (req, res) => {
  const { quantity } = req.body;
  const { id } = req.params; // id متاع OrderItem
  const cafeId = req.cafe.id; // 🔐 الكافيه الحالي

  try {
    // نجيب الـOrderItem مع الـOrder متاعو، ونتأكد من الكافيه
    const orderItem = await OrderItems.findOne({
      where: { id },
      include: [{ model: Order, where: { cafeId } }],
    });

    if (!orderItem)
      return res.status(404).json("❌ Order item not found or unauthorized");

    // نحدّث الكمية
    orderItem.quantity = quantity;
    await orderItem.save();

    // نحسب الـtotalPrice الجديد
    const order = await Order.findOne({
      where: { id: orderItem.Order.id, cafeId },
    });

    const orderItems = await OrderItems.findAll({
      where: { orderId: order.id },
    });

    const newPrice = orderItems.reduce(
      (s, r) => s + r.quantity * r.price,
      0
    );

    order.totalPrice = newPrice;
    await order.save();

    res.status(200).json("✅ Commande mise à jour avec succès");
  } catch (e) {
    console.error(e);
    res.status(500).json({ "internal server error": e.message });
  }
},

   adminDeleteOrder: async (req, res) => {
  const { id } = req.params; // id متاع OrderItem
  const cafeId = req.cafe.id;

  try {
    
    const orderItem = await OrderItems.findOne({
      where: { id },
      include: [{ model: Order, where: { cafeId } }],
    });

    if (!orderItem)
      return res.status(404).json("❌ Order item not found or unauthorized");

    // نحط الكمية 0 (باش total يتحسب)
    orderItem.quantity = 0;
    await orderItem.save();

    // نجيب الطلب ونحدّث المجموع
    const order = await Order.findOne({
      where: { id: orderItem.Order.id, cafeId },
    });

    const orderItems = await OrderItems.findAll({
      where: { orderId: order.id },
    });

    const newPrice = orderItems.reduce(
      (s, r) => s + r.quantity * r.price,
      0
    );

    order.totalPrice = newPrice;
    await order.save();

    // نحذف العنصر فعلياً
    await OrderItems.destroy({ where: { id } });

    // إذا الطلب ولى total 0 → نحذفو زادة
    if (order.totalPrice === 0) {
      await Order.destroy({ where: { id: order.id } });
    }

    res.status(200).json("✅ Commande supprimée avec succès");
  } catch (e) {
    console.error(e);
    res.status(500).json({ "internal server error": e.message });
  }
},

}