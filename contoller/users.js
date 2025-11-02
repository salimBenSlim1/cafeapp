const Server = require("../models/servers")
const jwt=require('jsonwebtoken')
const { getIo } = require("../socket");
const Table = require("../models/table");
const Orders = require("../models/orders");
const OrderItems = require("../models/orderItems");
const Item = require("../models/item");
const OrderAudit = require("../models/orderAudit");
const { Op } = require("sequelize");

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

      // 5️⃣ Sign JWT with role, serverId, cafeId, and tables
      const token = jwt.sign(
        {
          role: "server",
          serverId: server.id,
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
        tables: tableIds,
      });
    } catch (e) {
      console.error("Server login error:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getAllOrders: async (req, res) => {
  try {
    const orders = await Orders.findAll({
      where:{cafeId:req.server.cafeId},
      include: [
        {
          model: OrderItems,attributes:['id','quantity','price'],
          include: [{ model: Item,attributes:['name','imageUrl'] }],
        },
        {model:Table,attributes:['number']}
      ],
     
    });
   
    res.status(200).json(orders);
  } catch (e) {
    res.status(500).json({
      message: "Internal server error",
      error: e.message,
    });
  }
},
updateOrderStatus: async (req, res) => {
  const { id } = req.params;
  const { status, tableId } = req.body;
  const {serverId,cafeId}=req.server
  try {
    if (!status || !tableId || !id) 
      return res.status(400).json('Missing parameters');

    // Find order
    const order = await Orders.findOne({ where: { id } });
    if (!order) return res.status(404).json('Order not found');
    if (!req.server.tables.includes(String(tableId))) {
    return res.status(400).json({ error: "Unauthorized: table not assigned to this server" });
}   
  // Update status
    await Orders.update({ status }, { where: { id } });

    getIo().to(`user_${id}`).emit("statusUpdated", { orderId: id, status });
    getIo().to(`cafe_${req.server.cafeId}`).emit("orderStatusUpdated", {
      orderId: id,
      status,
      tableId,
    });

    return res.status(200).json('Status updated successfully');

  } catch (e) {
    console.error('updateOrderStatus error:', e);
    return res.status(500).json({ 'server error': e.message });
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

    // 🟠 Save old quantity before changing
    const oldQuantity = orderItem.quantity;

    // 🔵 Update the quantity
    orderItem.quantity = quantity;
    await orderItem.save();

    // 🟣 Log in OrderAudit
    await OrderAudit.create({
      orderId: orderItem.orderId,
      serverId,
      cafeId,
      action: "CHANGE_QUANTITY",
      oldValue: { quantity: oldQuantity },
      newValue: { quantity },
    });

    // 🟢 Recalculate total price
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
generateServerReport: async (req, res) => {
  try {
    const { serverId } = req.params;
    const cafeId = req.cafe.id;
    
    // 1️⃣ Verify server exists
    const server = await Server.findOne({
      where: { id: serverId, cafeId },
      attributes: ["id", "name"],
    });
    
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // 2️⃣ Get tables assigned to this server
    const serverTables = await Table.findAll({
      where: { 
        assignedTo: serverId,
        cafeId 
      },
      attributes: ["id", "number"],
    });

    if (serverTables.length === 0) {
      return res.json({
        cafeName: req.cafe.name,
        serverName: server.name,
        totalDay: 0,
        ordersCount: 0,
        orders: [],
        cancellations: {
          count: 0,
          totalLost: 0,
          details: []
        },
        modifications: {
          count: 0,
          totalImpact: 0,
          details: []
        },
        assignedTables: [],
        potentialRevenue: 0,
        message: "No tables assigned to this server"
      });
    }

    const tableIds = serverTables.map(t => t.id);

    // 3️⃣ Define day time range (6am to 6am next day)
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      6, 0, 0, 0
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // 4️⃣ Get all served orders from server's tables
    const orders = await Orders.findAll({
      where: {
        tableId: { [Op.in]: tableIds },
        cafeId,
        status: "served",
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      include: [
        {
          model: OrderItems,
          include: [{ model: Item, attributes: ["name"] }],
          attributes: ["quantity", "price"],
        },
        { model: Table, attributes: ["number"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    // 5️⃣ Group items by table
    let totalDay = 0;
    const groupedByTable = {};

    orders.forEach(order => {
      const tableNumber = order.Table?.number || "-";
      
      if (!groupedByTable[tableNumber]) {
        groupedByTable[tableNumber] = {
          tableNumber,
          items: {},
          ordersCount: 0,
          totalTable: 0
        };
      }

      groupedByTable[tableNumber].ordersCount++;

      order.OrderItems.forEach(item => {
        const itemName = item.Item.name;
        const itemPrice = item.price;
        const itemQuantity = item.quantity;
        const itemTotal = itemQuantity * itemPrice;

        if (!groupedByTable[tableNumber].items[itemName]) {
          groupedByTable[tableNumber].items[itemName] = {
            name: itemName,
            quantity: 0,
            price: itemPrice,
          };
        }

        groupedByTable[tableNumber].items[itemName].quantity += itemQuantity;
        groupedByTable[tableNumber].totalTable += itemTotal;
        totalDay += itemTotal;
      });
    });

    const formattedOrders = Object.values(groupedByTable).map(table => ({
      tableNumber: table.tableNumber,
      ordersCount: table.ordersCount,
      items: Object.values(table.items),
      total: parseFloat(table.totalTable.toFixed(3)),
    }));

    // 6️⃣ Get cancellations with details
    const canceledOrders = await Orders.findAll({
      where: {
        tableId: { [Op.in]: tableIds },
        cafeId,
        status: "canceled",
        updatedAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      attributes: ["id", "updatedAt", "totalPrice"],
      include: [
        { 
          model: Table, 
          attributes: ["number"] 
        },
        {
          model: OrderItems,
          include: [{ model: Item, attributes: ["name"] }],
          attributes: ["quantity", "price"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });
   
    const cancellations = canceledOrders.map(order => ({
      orderId: order.id,
      tableNumber: order.Table?.number || "-",
      time: new Date(order.updatedAt).toLocaleTimeString('fr-TN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      items: order.OrderItems.map(item => ({
        name: item.Item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalLost: parseFloat(order.totalPrice?.toFixed(3) || 0),
    }));

    // Calculate total losses from cancellations
    const totalCancellations = cancellations.reduce((sum, c) => sum + c.totalLost, 0);

    // 7️⃣ Get all modifications from the audit table
    const modifications = await OrderAudit.findAll({
      where: {
        serverId,
        cafeId,
        action: "CHANGE_QUANTITY",
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      attributes: ["orderId", "oldValue", "newValue", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    // Initialize modifications result
    let modificationsResult = {
      count: 0,
      totalImpact: 0,
      details: []
    };

    // Only process if modifications exist
    if (modifications.length > 0) {
      // Extract all order IDs
      const modifiedOrderIds = [...new Set(modifications.map(m => m.orderId))];

      // Fetch related orders with tables and items
      const modifiedOrders = await Orders.findAll({
        where: { id: { [Op.in]: modifiedOrderIds } },
        include: [
          { model: Table, attributes: ["number"] },
          {
            model: OrderItems,
            include: [{ model: Item, attributes: ["name"] }],
            attributes: ["id", "quantity", "price"],
          },
        ],
      });

      // Create fast access map
      const orderMap = {};
      for (const order of modifiedOrders) {
        orderMap[order.id] = order;
      }

      // Format the audit data
      const formattedModifications = modifications.map(mod => {
        // Try parsing JSON values safely
        let oldVal = typeof mod.oldValue === "string" ? JSON.parse(mod.oldValue) : mod.oldValue;
        let newVal = typeof mod.newValue === "string" ? JSON.parse(mod.newValue) : mod.newValue;

        const oldQty = oldVal?.quantity || 0;
        const newQty = newVal?.quantity || 0;
        const diff = newQty - oldQty;

        const order = orderMap[mod.orderId];
        let itemName = "Unknown";
        let itemPrice = 0;

        // Try to find the specific item modified by comparing quantities
        if (order?.OrderItems?.length) {
          const found = order.OrderItems.find(i => i.quantity === newQty) || order.OrderItems[0];
          itemName = found?.Item?.name || itemName;
          itemPrice = found?.price || 0;
        }

        const priceImpact = diff * itemPrice;

        return {
          orderId: mod.orderId,
          tableNumber: order?.Table?.number || "-",
          time: new Date(mod.createdAt).toLocaleTimeString("fr-TN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          itemName,
          oldQuantity: oldQty,
          newQuantity: newQty,
          difference: diff,
          priceImpact: parseFloat(priceImpact.toFixed(3)),
        };
      });

      // Total impact
      const totalModificationsImpact = formattedModifications.reduce(
        (sum, m) => sum + m.priceImpact,
        0
      );

      modificationsResult = {
        count: formattedModifications.length,
        totalImpact: parseFloat(totalModificationsImpact.toFixed(3)),
        details: formattedModifications,
      };
    }

    // 8️⃣ Final response with detailed statistics
    res.json({
      cafeName: req.cafe.name,
      serverName: server.name,
      
      // General statistics
      totalDay: parseFloat(totalDay.toFixed(3)),
      ordersCount: orders.length,
      tablesServed: formattedOrders.length,
      
      // Order details grouped by table
      orders: formattedOrders,
      
      // Detailed cancellations
      cancellations: {
        count: cancellations.length,
        totalLost: parseFloat(totalCancellations.toFixed(3)),
        details: cancellations,
      },
      
      // Detailed modifications
      modifications: modificationsResult,
      
      // Assigned tables
      assignedTables: serverTables.map(t => t.number),
      
      // Potential revenue calculation (with cancellations)
      potentialRevenue: parseFloat((totalDay + totalCancellations).toFixed(3)),
    });

  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ 
      error: "Server error while generating report",
      details: error.message 
    });
  }
},

};

