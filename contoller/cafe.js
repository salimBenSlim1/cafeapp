const crypto = require("crypto");
const Cafe = require("../models/cafe");
const bcrypt=require('bcrypt');
const Item = require("../models/item");
const Orders = require("../models/orders");
const OrderItems = require("../models/orderItems");
const Payement = require("../models/paiement");
const Table = require("../models/table");
module.exports={
    login:async(req, res) => {
  const { email, password } = req.body;

  const cafe = await Cafe.findOne({ where: { email } });
  if (!cafe) return res.status(404).json({ error: "Email introuvable" });
  const valid=cafe.password===password
  if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" });

  res.status(200).json({ apiKey: cafe.apiKey })

},


  deleteCafe: async (req, res) => {
    const { id } = req.params;

    try {
      const cafe = await Cafe.findOne({ where: { id } });
      if (!cafe) return res.status(404).json("Cafe not found");

      // 🧹 Step 1: Get all orders belonging to the café
      const orders = await Orders.findAll({ where: { cafeId: id } });

      // 🧾 Step 2: Delete related order items
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length > 0) {
        await OrderItems.destroy({ where: { orderId: orderIds } });
      }

      // 🧾 Step 3: Delete payments related to the café (if linked)
      await Payement.destroy({ where: { cafeId: id } });

      // 🧾 Step 4: Delete orders
      await Orders.destroy({ where: { cafeId: id } });

      // 🧾 Step 5: Delete items & tables
      await Item.destroy({ where: { cafeId: id } });
      await Table.destroy({ where: { cafeId: id } });

      // 🧾 Step 6: Finally, delete the café itself
      await Cafe.destroy({ where: { id } });

      res.status(200).json({ message: "Cafe and all related data deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Internal server error", error: e.message });
    }
  },
  updateCofe:async(req,res)=>{
    const {id}=req.params
    try {
      const data=await Cafe.findOne({where:{id}})
      if (!data) return res.status(400).json('no cafe found')
      data.verifiedPayment='1'
      await data.save()
      res.status(200).json('updated')
      
    } catch (e) {
      res.status(500).json('server err')
    }
  },
  updateCreatedAt:async(req,res)=>{
    const {id}=req.params
    try {
      const data=await Cafe.findOne({where:{id}})
      if (!data) return res.status(400).json('no cafe found')
        console.log(req.body.createdAt)
      const newDat=new Date(req.body.createdAt)
      data.apiKeyExpiresAt=newDat
      await data.save()
      res.status(200).json('updated')
      
    } catch (e) {
      res.status(500).json('server err')
    }
  }


}
