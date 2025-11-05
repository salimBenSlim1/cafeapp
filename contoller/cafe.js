const crypto = require("crypto");
const Cafe = require("../models/cafe");
const bcrypt=require('bcrypt');
const Item = require("../models/item");
const Orders = require("../models/orders");
const OrderItems = require("../models/orderItems");
const Payement = require("../models/paiement");
const Table = require("../models/table");
const jwt=require('jsonwebtoken')
module.exports={
    login:async(req, res) => {
  const { email, password } = req.body;
const cafe = await Cafe.findOne({ where: { email } });
    if (!cafe || cafe.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

   // ✅ تحقق من الإشتراك
  const now = new Date();
  if (!cafe.subscriptionEndDate || now > cafe.subscriptionEndDate) {
    return res.status(403).json({ 
      message: "Subscription expired",
      redirectTo: "https://cafeapp-frontend.vercel.app/subscription"
    });
  }
  
  // ✅ Update last login (optional)
  await cafe.update({ lastLoginDate: now });
  
  // Create tokens
  const accessToken = jwt.sign(
    { 
      id: cafe.id, 
      name: cafe.name, 
      plan: cafe.plan,
      subscriptionEnd: cafe.subscriptionEndDate // إضافي للـ frontend
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
  
  const refreshToken = jwt.sign(
    { id: cafe.id },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" } // ✅ نقصوا لـ 7 أيام فقط
  )
  
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    // secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 أيام
  });
  
  res.json({ accessToken, cafe: { name: cafe.name, plan: cafe.plan } });


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
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // +30 يوم بالضبط
      const data=await Cafe.update({
    verifiedPayment: '1',
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate
  }, {
    where: { id }
  })
  if (!data) return res.status(404).json('err')
    res.status(200).json(data)
} catch (e) {
    res.status(500).json({'serv err':e})
  
}
  },
  updateCreatedAt:async(req,res)=>{
    const {id}=req.params
    try {
      const data=await Cafe.findOne({where:{id}})
      if (!data) return res.status(400).json('no cafe found')
        console.log(req.body.createdAt)
      const newDat=new Date(req.body.createdAt)
      data.subscriptionEndDate=newDat
      await data.save()
      res.status(200).json('updated')
      
    } catch (e) {
      res.status(500).json('server err')
    }
  },

refresh: async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      message: "No refresh token",
      redirectTo: "https://cafeapp-frontend.vercel.app/login" 
    });
  }
  
  try {
    // ✅ تحقق من الـ refresh token صحيح
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    
    // ✅ جيب الكافيه من الـ database
    const cafe = await Cafe.findByPk(decoded.id);
    
    if (!cafe) {
      console.warn("⚠️ Cafe not found in database");
      return res.status(401).json({ 
        message: "Cafe not found",
        redirectTo: "https://cafeapp-frontend.vercel.app/login" 
      });
    }
    
    const now = new Date();
    
    // ✅ تحقق 1: الإشتراك مازال valid
    if (!cafe.subscriptionEndDate || now > cafe.subscriptionEndDate) {
      console.warn(`❌ Subscription expired for ${cafe.email}`);
      return res.status(403).json({ 
        message: "Subscription expired",
        redirectTo: "https://cafeapp-frontend.vercel.app/subscription"
      });
    }
    
    // ✅✅ تحقق 2: آخر login قريب (أهم حاجة!)
    const MAX_DAYS_WITHOUT_LOGIN = 3; // مدة الـ "inactivity timeout"
    
    if (!cafe.lastLoginDate) {
      console.warn(`⚠️ No lastLoginDate for ${cafe.email} - requiring login`);
      return res.status(401).json({ 
        message: "Please login again",
        reason: "no_login_date",
        redirectTo: "https://cafeapp-frontend.vercel.app/login" 
      });
    }
    
    const daysSinceLastLogin = (now - new Date(cafe.lastLoginDate)) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastLogin > MAX_DAYS_WITHOUT_LOGIN) {
      console.warn(`⏰ Last login too old for ${cafe.email}: ${daysSinceLastLogin.toFixed(1)} days ago`);
      return res.status(401).json({ 
        message: `Please login again (inactive for ${Math.floor(daysSinceLastLogin)} days)`,
        reason: "login_required",
        redirectTo: "https://cafeapp-frontend.vercel.app/login" 
      });
    }
    
    // ✅ كل شيء OK - نعطيه access token جديد
    const newAccessToken = jwt.sign(
      { 
        id: cafe.id, 
        name: cafe.name, 
        plan: cafe.plan,
        subscriptionEnd: cafe.subscriptionEndDate
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    
    // Optional: Update lastRefreshDate
    // await cafe.update({ lastRefreshDate: now });
    
    console.log(`🔄 Token refreshed for ${cafe.email} (last login: ${daysSinceLastLogin.toFixed(1)} days ago)`);
    
    res.json({ accessToken: newAccessToken });
    
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn("⏰ Refresh token expired");
      return res.status(401).json({ 
        message: "Session expired - please login",
        reason: "token_expired",
        redirectTo: "https://cafeapp-frontend.vercel.app/login" 
      });
    }
    
    console.error("🔴 Refresh token error:", err);
    return res.status(401).json({ 
      message: "Invalid token",
      redirectTo: "https://cafeapp-frontend.vercel.app/login" 
    });
  }
},

logout: async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    // secure: true,
    sameSite: "strict",
    path: '/' // Add this - it's important!
  });
  
  res.json({ message: "Logged out" });
}
}
