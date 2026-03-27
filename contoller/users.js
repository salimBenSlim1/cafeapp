const Server = require("../models/servers")
const jwt=require('jsonwebtoken')
const Table = require("../models/table");
const Orders = require("../models/orders");
const OrderItems = require("../models/orderItems");
const Item = require("../models/item");
const { Op,literal } = require("sequelize");
const sequelize=require('../db/db-config');
const Cafe = require("../models/cafe");
const socketServer=require('../socket');
const DailyCafeStat=require('../models/order_stats')
const DailyItemStat=require('../models/items_stats')
const WaiterDailyStat = require("../models/waiter_stats");

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
 
/* ─────────────────────────────────────────────────────────────────
   upsertIncrement — shared pattern used by all three stat tables.
   Finds or creates the row identified by `where`, then increments
   the numeric fields in `deltas` atomically.
───────────────────────────────────────────────────────────────── */
async function upsertIncrement(Model, where, defaults, deltas) {
  const [row, created] = await Model.findOrCreate({ where, defaults: { ...where, ...defaults } });
  if (!created) await row.increment(deltas);
}
 
/* ─────────────────────────────────────────────────────────────────
   recordItemServed
   Called once per OrderItem that flips to "served".
   Writes to:  daily_item_stats  +  waiter_daily_stats
───────────────────────────────────────────────────────────────── */
async function recordItemServed({ cafeId, waiterId, waiterName, itemName, itemCategory, unitPrice, quantity }) {
  const statDate = todayDate();
  const revenue  = parseFloat((unitPrice * quantity).toFixed(2));
 
  await Promise.all([
    // 1. Global item snapshot
    upsertIncrement(
      DailyItemStat,
      { cafeId, itemName, statDate },
      { itemCategory: itemCategory || "", unitPrice, totalSold: quantity, totalRevenue: revenue },
      { totalSold: quantity, totalRevenue: revenue },
    ),
 
    // 2. Per-waiter item snapshot
    upsertIncrement(
      WaiterDailyStat,
      { cafeId, waiterId, itemName, statDate },
      { waiterName: waiterName || "", itemCategory: itemCategory || "", totalSold: quantity, totalRevenue: revenue },
      { totalSold: quantity, totalRevenue: revenue },
    ),
  ]);
}
 
/* ─────────────────────────────────────────────────────────────────
   recordOrderServed
   Called once when the entire order flips to "served".
   Writes to:  daily_cafe_stats
───────────────────────────────────────────────────────────────── */
async function recordOrderServed({ cafeId, orderRevenue }) {
  const statDate = todayDate();
  const revenue  = parseFloat(orderRevenue.toFixed(2));
 
  const [row, created] = await DailyCafeStat.findOrCreate({
    where:    { cafeId, statDate },
    defaults: { cafeId, totalRevenue: revenue, totalOrders: 1, avgOrderValue: revenue, statDate },
  });
 
  if (!created) {
    await row.increment({ totalRevenue: revenue, totalOrders: 1 });
    await row.reload();
    await row.update({
      avgOrderValue: parseFloat((parseFloat(row.totalRevenue) / row.totalOrders).toFixed(2)),
    });
  }
}
module.exports={


  serverLogin: async (req, res) => {
    
    const { id } = req.params; // café id
    const { name, password } = req.body;

    try {
      // 1️⃣ Find server by name and cafe
      const server = await Server.findOne({ where: { name, cafeId: id } });
      if (!server) {
        return res.status(400).json({ error: "Server not found" });
      }

      // 2️⃣ Validate password
      if (server.password !== password) {
        return res.status(401).json({ error: "Invalid password" });
      }

      // 3️⃣ Get all tables assigned to this server
      const tables = await Table.findAll({
        where: { assignedTo: server.id }, // adjust field if needed
        attributes: [ "number"],
      });

      // 4️⃣ Prepare array of table IDs
      const tableIds = tables.map((t) => t.number);
      const caffe=await Cafe.findOne({where:{id}})
      if (caffe.subscriptionEndDate<Date.now()){
        return res.status(401).json('unauthorized')
      }
      // 5️⃣ Sign JWT with role, serverId, cafeId, and tables
      const token = jwt.sign(
        {
          role: "server",
          serverId: server.id,
          name:server.name,
          cafeId: id,
          tables: tableIds,
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" } // optional expiry
      );

      // 6️⃣ Respond with token + data
      res.status(200).json({
        message: "Server login successful",
        serverToken: token,
        id: server.id,
        name: server.name,
        tables: tableIds,
      });
    } catch (e) {
      console.error("Server login error:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
getAllOrders: async (req, res, next) => {
  const limit  = 10;
  const page   = parseInt(req.query.page) || 1;
  const cafeId = req.server.cafeId;
  const offset = (page - 1) * limit;
  const since  = new Date(Date.now() - 10 * 60 * 60 * 1000)
                   .toISOString().slice(0, 19).replace('T', ' ');

  const [rows, countResult] = await Promise.all([
    sequelize.query(`
      SELECT
        o.id,
        o.totalPrice,
        o.status,
        o.createdAt,
        o.updatedAt,
        o.tableNumber,
        oi.id       AS oi_id,
        oi.quantity AS oi_quantity,
        oi.price    AS oi_price,
        oi.comment  AS oi_comment,
        oi.itemName AS oi_itemName,
        oi.status AS oi_status,
        oi.createdAt AS oi_createdAt
      FROM (
        SELECT id, totalPrice, status, createdAt, updatedAt, tableNumber
        FROM Orders
        WHERE cafeId    = :cafeId
        AND updatedAt>=:since
        ORDER BY updatedAt DESC
        LIMIT :limit OFFSET :offset
      ) o
      LEFT JOIN OrderItems oi ON oi.orderId = o.id
    `, {
      replacements: { cafeId, since, limit, offset },
      type: sequelize.QueryTypes.SELECT,
    }),
    sequelize.query(`
      SELECT COUNT(*) AS total
      FROM Orders
      WHERE cafeId    = :cafeId
      AND updatedAt >= :since
        
    `, {
      replacements: { cafeId, since },
      type: sequelize.QueryTypes.SELECT,
    }),
  ]);

  const total = parseInt(countResult[0].total);

  const ordersMap = new Map();
  for (const row of rows) {
    if (!ordersMap.has(row.id)) {
      ordersMap.set(row.id, {
        id:          row.id,
        totalPrice:  row.totalPrice,
        status:      row.status,
        createdAt:   row.createdAt,
        updatedAt:   row.updatedAt,
        tableNumber: row.tableNumber,
        OrderItems:  [],
      });
    }
    if (row.oi_id) {
      ordersMap.get(row.id).OrderItems.push({
        id:       row.oi_id,
        quantity: row.oi_quantity,
        price:    row.oi_price,
        comment:  row.oi_comment,
        itemName: row.oi_itemName,
        status: row.oi_status,
        createdAt: row.oi_createdAt,
      });
    }
  }

  res.status(200).json({
    orders:     [...ordersMap.values()],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
},
getAllOrdersBarman: async (req, res, next) => {
  const limit  = 10;
  const page   = parseInt(req.query.page) || 1;
  const cafeId = req.server.cafeId;
  const offset = (page - 1) * limit;
  const since  = new Date(Date.now() - 10 * 60 * 60 * 1000)
                   .toISOString().slice(0, 19).replace('T', ' ');

  const [rows, countResult] = await Promise.all([
    sequelize.query(`
      SELECT
        o.id,
        o.totalPrice,
        o.status,
        o.createdAt,
        o.updatedAt,
        o.tableNumber,
        oi.id       AS oi_id,
        oi.quantity AS oi_quantity,
        oi.price    AS oi_price,
        oi.comment  AS oi_comment,
        oi.itemName AS oi_itemName,
        oi.status AS oi_status,
        oi.category  AS oi_category ,
        oi.createdAt AS oi_createdAt
      FROM (
        SELECT id, totalPrice, status, createdAt, updatedAt, tableNumber
        FROM Orders
        WHERE cafeId    = :cafeId
        AND updatedAt>=:since
        AND status IN ('pending', 'preparing')
        ORDER BY updatedAt ASC
        LIMIT :limit OFFSET :offset
      ) o
      LEFT JOIN OrderItems oi ON oi.orderId = o.id
    `, {
      replacements: { cafeId, since, limit, offset },
      type: sequelize.QueryTypes.SELECT,
    }),
    sequelize.query(`
      SELECT COUNT(*) AS total
      FROM Orders
      WHERE cafeId    = :cafeId
      AND updatedAt >= :since
      AND status !='served'
        
    `, {
      replacements: { cafeId, since },
      type: sequelize.QueryTypes.SELECT,
    }),
  ]);

  const total = parseInt(countResult[0].total);

  const ordersMap = new Map();
  for (const row of rows) {
    if (!ordersMap.has(row.id)) {
      ordersMap.set(row.id, {
        id:          row.id,
        totalPrice:  row.totalPrice,
        status:      row.status,
        createdAt:   row.createdAt,
        updatedAt:   row.updatedAt,
        tableNumber: row.tableNumber,
        OrderItems:  [],
      });
    }
    if (row.oi_id) {
      ordersMap.get(row.id).OrderItems.push({
        id:       row.oi_id,
        quantity: row.oi_quantity,
        price:    row.oi_price,
        comment:  row.oi_comment,
        itemName: row.oi_itemName,
        status: row.oi_status,
        category:  row.oi_category, 
        createdAt: row.oi_createdAt,
      });
    }
  }

  res.status(200).json({
    orders:     [...ordersMap.values()],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
},

addOrderForTable: async (req, res) => {
  const { tableNumber, items } = req.body;
  const { serverId, cafeId } = req.server;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Items required' });

  const transaction = await sequelize.transaction();

  try {
    let table=await Table.update({status:'occupé',sessionStart:new Date()},{where:{number:tableNumber,assignedTo:serverId},transaction})

    let order = await Orders.findOne({
      where: { tableNumber, cafeId, status: 'pending' },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!order) {
      order = await Orders.create(
        { tableNumber, cafeId, status: 'pending', totalPrice: 0 },
        { transaction }
      );
    }

    const dbItems = await Item.findAll({
      where: { id: items.map(i => i.itemId), cafeId },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    const itemMap = new Map(dbItems.map(i => [i.id, i]));
    let totalAddition = 0;
    const createdItems = [];

for (const it of items) {
      const item = itemMap.get(it.itemId);
      if (!item) throw new Error(`Item not found: ${it.itemId}`);
      if (item.stock < it.quantity) throw new Error(`${item.name} out of stock`);

      const orderItem = await OrderItems.create({
        orderId:  order.id,
        serverId:serverId,
        itemName: item.name,
        quantity: it.quantity,
        price:    item.price,
        category: item.category,
        comment:  it.comment || '',
        status:   'pending',
      }, { transaction });

      await item.update(
        { stock: Math.max(item.stock - it.quantity, 0) },
        { transaction }
      );

      totalAddition += it.quantity * item.price;

     createdItems.push({   
  id:orderItem.id,   
  itemName:  item.name,
  quantity:  it.quantity,
  comment:   it.comment || null, 
  category:  item.category,               
  createdAt: orderItem.createdAt,
});
      // ← no socket call here
    }

    const newTotal = Number(order.totalPrice) + totalAddition;

    await order.update({ totalPrice: newTotal }, { transaction });
    await transaction.commit();

    // Single emit, after commit, with complete data
    socketServer.emitToCafe(cafeId, 'newOrder', {
      id:          order.id,
      tableNumber:order.tableNumber,
      createdAt:   order.createdAt,
      totalPrice:  newTotal,
      OrderItems:  createdItems,
    });
    
    return res.status(201).json({ message: 'Order added'});
  } catch (err) {
    await transaction.rollback();
    console.error('addOrderForTable error:', err);
    const isStock = err.message.includes('out of stock');
    return res.status(isStock ? 409 : 500).json({ error: err.message });
  }
},

// PUT /server/updateOrderItemStatus/:orderItemId
// updateOrderItemStatus controller — add all-served check
 updateOrderItemStatus : async (req, res) => {
  const { orderItemId } = req.params;
  const { status, orderId } = req.body;
  const cafeId = req.server.cafeId;
 
  const VALID = ["preparing", "served"];
  if (!VALID.includes(status))
    return res.status(400).json({ error: "Invalid status" });
 
  try {
    // ── 1. Load the order item
    const orderItem = await OrderItems.findOne({ where: { id: orderItemId, orderId } });
    if (!orderItem) return res.status(404).json({ error: "Item not found" });
 
    const wasAlreadyServed = orderItem.status === "served";
 
    // ── 2. Persist the status change
    await orderItem.update({ status });
 
    // ── 3. Broadcast to barman devices
    socketServer.emitToCafe(cafeId, "barman:itemStatusChanged", {
      orderId,
      orderItemId: Number(orderItemId),
      status,
    });
 
    // ── 4. Record item-level stats when it first hits "served"
    if (status === "served" && !wasAlreadyServed) {
      recordItemServed({
        cafeId,
        waiterId:     orderItem.serverId,
        itemName:     orderItem.itemName     ?? "Unknown",
        itemCategory: orderItem.itemCategory ?? "",
        unitPrice:    parseFloat(orderItem.price ?? 0),
        quantity:     orderItem.quantity ?? 1,
      }).catch(err => console.error("recordItemServed failed:", err));
    }
 
    // ── 5. Check if the whole order is now complete
    const pendingCount = await OrderItems.count({
      where: { orderId, status: { [Op.ne]: "served" } },
    });
 
    if (pendingCount === 0) {
      // ── 5a. Mark order as served
      await Orders.update({ status: "served" }, { where: { id: orderId } });
 
      // ── 5b. Broadcast completion
      socketServer.emitToCafe(cafeId, "orderStatusUpdated", { id: orderId, status: "served" });
 
      // ── 5c. Record cafe-level stat
      const order = await Orders.findOne({ where: { id: orderId }, attributes: ["totalPrice"] });
      const orderRevenue = parseFloat(order?.totalPrice ?? 0);
 
      recordOrderServed({ cafeId, orderRevenue })
        .catch(err => console.error("recordOrderServed failed:", err));
    }
 
    return res.status(200).json({ ok: true });
 
  } catch (err) {
    console.error("updateOrderItemStatus error:", err);
    return res.status(500).json({ error: err.message });
  }
},
serverUpdateOrder: async (req, res) => {
  const { quantity } = req.body;              // new quantity
  const { id } = req.params;                  // orderItem id
  const cafeId = req.server.cafeId;           // current café id
  const serverId = req.server.serverId;             // current server id

  try {
    // 🟢 Fetch the order item with its order to ensure same café
    const orderItem = await OrderItems.findOne({
      where: { id },
      include: [{ model: Orders, where: { cafeId } }],
    });

    if (!orderItem)
      return res.status(404).json("❌ Order item not found or unauthorized");

    const oldQuantity = orderItem.quantity;
    orderItem.quantity = quantity;
    await orderItem.save();
    const orderItems = await OrderItems.findAll({
      where: { orderId: orderItem.orderId },
    });

    const newTotal = orderItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    await Orders.update(
      { totalPrice: newTotal },
      { where: { id: orderItem.orderId, cafeId } }
    );

    res.status(200).json("✅ Commande mise à jour avec succès");
  } catch (e) {
    console.error("serverUpdateOrder error:", e);
    res.status(500).json({ error: e.message });
  }
},
 generateServerReport : async (req, res) => {
  try {
    const cafeId   = req.cafe.id;
    const waiterId = req.params.serverId
    const statDate = req.query.date || new Date().toISOString().slice(0, 10);
 
    // Verify the waiter belongs to this cafe
    const waiter = await Server.findOne({
      where:      { id: waiterId, cafeId },
      attributes: ["id", "name"],
    });
    if (!waiter) return res.status(404).json({ error: "Waiter not found" });
 
    // Pull all item rows for this waiter on this day
    const rows = await WaiterDailyStat.findAll({
      where:    { cafeId, waiterId, statDate },
      attributes: ["itemName", "itemCategory", "totalSold", "totalRevenue"],
      order:    [["totalRevenue", "DESC"]],
      raw:      true,
    });
 
    const totalItems   = rows.reduce((s, r) => s + r.totalSold,              0);
    const totalRevenue = rows.reduce((s, r) => s + parseFloat(r.totalRevenue), 0);
 
    return res.json({
      waiterId:    waiter.id,
      waiterName:  waiter.name,
      statDate,
      items:       rows.map(r => ({
        itemName:     r.itemName,
        itemCategory: r.itemCategory,
        totalSold:    r.totalSold,
        totalRevenue: parseFloat(parseFloat(r.totalRevenue).toFixed(2)),
      })),
      summary: {
        totalItems,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      },
    });
 
  } catch (err) {
    console.error("getWaiterReport error:", err);
    return res.status(500).json({ error: 'err' });
  }
},



getItems: async (req, res) => {
  try {
    const cafeId = req.server.cafeId;
    const items = await Item.findAll({
      where: { 
        cafeId
      }
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},
getTables: async (req, res) => {
  try {
    const cafeId = req.server.cafeId;
    const serverId=req.server.serverId
    const items = await Table.findAll({
      where: { 
        cafeId,
        assignedTo:serverId
      }
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

};

