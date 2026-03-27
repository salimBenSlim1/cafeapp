const OrderItems=require('../models/orderItems')
const Order=require('../models/orders')
const Item=require('../models/item')
const {literal,Op} =require('sequelize')

module.exports={
 

getItemsEndSoon: async (req, res) => {
  const cafeId = req.cafe.id

  try {
    const data = await Item.findAll({
      where: {
        cafeId,  
        isDeleted:false,                
        stock: { [Op.lt]: 3 }    
      },
      attributes:['id','name','stock']
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