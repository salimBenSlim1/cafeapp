const Item = require("../models/item")
const OrderItems = require("../models/orderItems")
const Orders = require("../models/orders")

module.exports={
    getAllItems:async(req,res)=>{
    const cafeId=req.cafe.id  
      try {
          
            const data=await Item.findAll({where:{cafeId}})
            if (!data) return res.status(404).json('something wrong')
            res.status(200).json(data)
            
        } catch (e) {
            res.status(500).json({'server error':e})
        }
    },
    addItem:async(req,res)=>{
      const cafeId=req.cafe.id  
      try {

            const data=await Item.create({...req.body,cafeId})
            if (data) return res.status(200).json({'created':data})
            else return res.status(404).json('something wen wrong')
            
        } catch (e) {
            res.status(500).json({'internal server error':e})
        }
    },
    updateItem:async(req,res)=>{
      const {id}=req.params
      const cafeId=req.cafe.id

        try {
          const it=await Item.findOne({where:{id,cafeId}})
          if (!it||!cafeId||!id) return res.status(400).json('no item found')
            const data=await Item.update(req.body,{where:{id,cafeId}})
            if (data) return res.status(200).json({'updated':data})
            else return res.status(404).json('something wen wrong')
            
        } catch (e) {
            res.status(500).json({'internal server error':e})
        }
    },
  deleteItem: async (req, res) => {
  const { id } = req.params;
  const cafeId = req.cafe.id; // 🔐 الكافيه الحالي من الـmiddleware

  try {
    // 🔍 نلقاو الـItem ونتأكد أنه تابع للكافيه هذا
    const item = await Item.findOne({ where: { id, cafeId } });
    if (!item||!cafeId||!id)
      return res.status(404).json({ message: "❌ Item not found or unauthorized" });

    // 🧾 نلقاو كل الـOrderItems اللي تستعمل هذا المنتج
    const orderItems = await OrderItems.findAll({
      where: { itemId: id },
      include: [{ model: Orders, where: { cafeId } }],
    });

    for (const it of orderItems) {
      // نحافظ على التاريخ لكن نحدّث الكمية
      it.quantity = 0;
      await it.save();

      // 🧮 نعيد حساب total لكل order متأثر
      const order = await Orders.findOne({
        where: { id: it.orderId, cafeId },
      });

      if (order) {
        const relatedItems = await OrderItems.findAll({
          where: { orderId: order.id },
        });

        const newPrice = relatedItems.reduce(
          (sum, r) => sum + r.quantity * r.price,
          0
        );

        order.totalPrice = newPrice;
        await order.save();

        // ⚠️ نحذف order فارغ (total 0)
        if (newPrice === 0) {
          await Orders.destroy({ where: { id: order.id, cafeId } });
        }
      }
    }

    // 🧹 في الأخير نحذف الـItem نهائياً
    await OrderItems.destroy({ where: { itemId: id } }); // نحذف التفاصيل المتبقية
    await Item.destroy({ where: { id, cafeId } });

    res.status(200).json({ message: `✅ Item ${id} deleted successfully` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Internal server error", error: e.message });
  }
},
getItemsForUser:async(req,res)=>{
  const cafeId=req.user.cafeId
  try {
    const data=await Item.findAll({where:{cafeId}})
    if (!data) return res.status(404).json('something went wrong')
    res.status(200).json(data)


  } catch (e) {
    res.status(500).json({ message: "Internal server error", error: e.message });
    
  }
}


}