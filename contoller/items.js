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
},
getItemsForPro:async(req,res)=>{
  try {
   const categoryImages = {
  coffee: [
    '/images/cafecreme.jpg',
    '/images/cappucin.jpg',
    '/images/express.jpg',
    '/images/american.jpg',
    '/images/cafe-turc.jpg',
    '/images/cappucino+.png',
    '/images/latte-noisette.png',
    '/images/latte-vanille.jpg',
    '/images/latte.jpg',
    '/images/latte-caramel.png',
    '/images/latte-glacé-noisette.png',
    '/images/latte-glacé-vanille.png',
    '/images/black.jpg',
    
  ],
  food: [
    '/images/black.jpg',
    '/images/pathé.jpg',
    '/images/sandwish-viande-haché.png',
    '/images/sandwish-salami.png',
    '/images/sandwish-jambon.png',
    '/images/pizza-mexicaine.jpg',
    '/images/pizza-margherita.png',
    '/images/patte-puttanesca.jpg',
    '/images/pates-poulet-alacreme.jpg',
    '/images/pates-bolognaise.jpg',
    '/images/sandwish-thon.jpg',
    '/images/sandwish-escalope-grillé.jpg',
    '/images/salade-poulet-grillé.jpg',
    '/images/salade-poulet-panné.jpg',
    '/images/poisson-dorade.jpg',
    '/images/pizza-vegetarienne.jpg',
    '/images/pizza-poule-champignon.jpg',
    '/images/pizza-neptune.jpeg',
    '/images/pancake-thon-fromage.jpg',
    '/images/pancake-mexicaine.jpg',
    '/images/pancake-japonaise.png',
    '/images/pancake-fromage-salami.jpg',
    '/images/pacake-jambon-fromage.jpg',
    '/images/omlette-thon-fromage.jpg',
    '/images/omlette-salami-fromage.jpg',
    '/images/omlette-jambon-fromage.jpg',
    '/images/omlette-jambon-fromage.jpg',
    '/images/mixte-panné.jpg',
    '/images/escalope-panné.jpg',
    '/images/escalope-grillé.jpeg',
    '/images/frites.png',
    '/images/crepe-thon-fromage.jpg',
    '/images/crepe-salami-fromage.jpg',
    '/images/crepe-jambon-fromage.jpg',
    
    
  ],
  drink: [
    '/images/orangejuice.jpg',
    '/images/black.jpg',
    '/images/eau0.5L.png',
    '/images/eau1L.png',
    '/images/boissons-energetique.jpg',
    '/images/thé-vert.jpg',
    '/images/the-infusion.jpg',
    '/images/thé-menthe.png',
    '/images/thé-fruits-sec.jpg',
    '/images/thé-amande.jpeg',
    '/images/sommthie-fruit-rouge.jpg',
    '/images/smoothie-fraise-banane.jpg',
    '/images/mojito-fruitsRouge.png',
    '/images/mojito-energetic.jpg',
    '/images/mojito-blue.jpg',
    '/images/milkshake-nutella.png',
    '/images/milkshake-noisette.png',
    '/images/milkshake-chocolat.jpg',
    '/images/milkshake-caramel.jpg',
    '/images/milkshake-712.jpg',
    '/images/lait-de-poule.jpg',
    '/images/Kiwi-Banana-Smoothie.jpg',
    '/images/frappucino-snickers.jpg',
    '/images/frappucino-nutella.jpg',
    '/images/frappucino-noisette.jpg',
    '/images/frappucino-chocolat.jpg',
    '/images/frappucino-caramel.jpg',
    '/images/frappucino-712.jpg',
    '/images/frappucino-oreo.png',
    
    
  ],
  dessert: [
     '/images/pancake-chocolat.jpg',
    '/images/pancake-chocolat-oreo.jpg',
    '/images/pancake-chocolat-fraise.png',
    '/images/pancake-nutella-oreo.jpg',
    '/images/pancake-nutella-fraise.jpg',
    '/images/pancake-nutella-banane.jpg',
    '/images/painauchocolat.jpg',
    '/images/gauffre.png',
    '/images/jwejem-classique.jpg',
    '/images/black.jpg',
    '/images/jawjem-712.jpg',
    '/images/jus-kiwi-banane.jpg',
    '/images/jus-fraise-banane.jpg',
    '/images/jus-datte-banane-fruit-sec.jpg',
    '/images/jus-cocktail-fruitDeSaison.jpg',
    '/images/jus-citron-glacé.jpg',
    '/images/jus-fraise.png',
    '/images/glace-712-5boule.jpeg',
    '/images/glace-3boole.jpg',
    '/images/galce-2boole.png',
    '/images/fruits-de-saison.png',
    '/images/gaufres-aux-fruits-sec.jpeg',
    '/images/Gaufre-Oreo.jpg',
    '/images/gauffre-nutella.jpg',
    '/images/gauffre-nutella-spéculoos.jpg',
    '/images/gauffre-nutella-oreo.jpg',
    '/images/gauffre-nutella-fruit-sec.jpg',
    '/images/gauffre-nutella-fraise.jpg',
    '/images/gauffre-chocolat.jpg',
    '/images/gauffre-chocolat-fraise.jpg',
    '/images/gauffre-chocolat-spéculoos.jpeg',
    '/images/gauffre-chocolat-banane.jpeg',
    '/images/gauffre-nutella-banane.png',
    '/images/crepe-nutella.jpg',
    '/images/crepe-nutella-oreo.jpg',
    '/images/crepe-nutella-banane.jpg',
    '/images/crepe-mexicaine.png',
    '/images/crepe-japoniase.png',
    '/images/crepe-chocolat-oreo.jpg',
    '/images/crepe-chocolat-fraise.jpg',
  ],
  games: [
    '/images/belote.jpg',
    '/images/black.jpg',
    
  ],
  smoking: [
    '/images/chicha.jpg',
    '/images/chicha-menthe.png',
    '/images/black.jpg',
    
  ],
}
  return res.status(200).json(categoryImages)
  } catch (e) {
    res.status(500).json('serv err')
  }
}


}