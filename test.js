// printAgentSocket.js - Backend Socket.IO handler for print agents

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Store active print agents
const activePrintAgents = new Map();

/**
 * Setup print agent Socket.IO handlers
 */
function setupPrintAgentSocket(io) {
  
  io.on('connection', (socket) => {
    
    // Print Agent Authentication
    socket.on('authenticatePrintAgent', async (data) => {
      try {
        const { token, cafeId, printers } = data;
        
        // Verify token (JWT or simple token from database)
        const agent = await verifyPrintAgentToken(token);
        
        if (!agent || agent.cafeId.toString() !== cafeId.toString()) {
          console.log(`❌ Invalid print agent token for café ${cafeId}`);
          socket.emit('authError', { message: 'Invalid token' });
          socket.disconnect();
          return;
        }
        
        // Store agent info
        const agentId = `agent-${cafeId}-${socket.id}`;
        activePrintAgents.set(agentId, {
          socketId: socket.id,
          cafeId: cafeId,
          cafeName: agent.cafeName,
          printers: printers || [],
          connectedAt: new Date(),
          lastSeen: new Date(),
          token: token
        });
        
        // Join café room
        socket.join(`print-agent-${cafeId}`);
        
        console.log(`✅ Print agent connected: Café ${agent.cafeName} (${cafeId})`);
        console.log(`   Printers: ${printers.join(', ')}`);
        
        // Send confirmation
        socket.emit('authenticated', {
          success: true,
          cafeName: agent.cafeName,
          cafeId: cafeId
        });
        
        // Notify admins
        io.emit('printAgentStatus', {
          cafeId,
          status: 'online',
          printers
        });
        
      } catch (error) {
        console.error('Print agent auth error:', error);
        socket.emit('authError', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });
    
    // Print job result callback
    socket.on('printJobsResult', (data) => {
      const { cafeId, results, success } = data;
      
      console.log(`📄 Print job result - Café ${cafeId}: ${success ? '✓' : '✗'}`);
      
      // Update agent last seen
      for (const [agentId, agent] of activePrintAgents.entries()) {
        if (agent.socketId === socket.id) {
          agent.lastSeen = new Date();
          break;
        }
      }
      
      // Notify the café's staff interface
      io.to(`cafe-${cafeId}`).emit('printJobCompleted', {
        success,
        results,
        timestamp: new Date()
      });
    });
    
    // Test print result
    socket.on('testPrintResult', (data) => {
      console.log(`🧪 Test print: ${data.success ? '✓' : '✗'} - Station: ${data.station}`);
      
      // Find which agent this is
      for (const [agentId, agent] of activePrintAgents.entries()) {
        if (agent.socketId === socket.id) {
          io.emit('testPrintCompleted', {
            cafeId: agent.cafeId,
            success: data.success,
            station: data.station
          });
          break;
        }
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      // Find and remove agent
      for (const [agentId, agent] of activePrintAgents.entries()) {
        if (agent.socketId === socket.id) {
          console.log(`❌ Print agent disconnected: Café ${agent.cafeName}`);
          
          // Notify admins
          io.emit('printAgentStatus', {
            cafeId: agent.cafeId,
            status: 'offline'
          });
          
          activePrintAgents.delete(agentId);
          break;
        }
      }
    });
    
  });
}

/**
 * Verify print agent token
 * This should check your database for valid tokens
 */
async function verifyPrintAgentToken(token) {
  try {
    // Option 1: JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
    
    // Option 2: Database lookup (recommended)
   
    
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Send print jobs to agent
 * This is what you call when creating an order
 */
function sendPrintJobs(io, cafeId, printJobsData) {
  try {
    // Find active agent for this café
    let targetAgent = null;
    for (const [agentId, agent] of activePrintAgents.entries()) {
      if (agent.cafeId.toString() === cafeId.toString()) {
        // Check if online (within last 2 minutes)
        const timeSinceLastSeen = Date.now() - agent.lastSeen.getTime();
        if (timeSinceLastSeen < 120000) {
          targetAgent = agent;
          break;
        }
      }
    }
    
    if (!targetAgent) {
      console.log(`⚠️  No active print agent for café ${cafeId}`);
      return {
        success: false,
        error: 'No active print agent',
        offline: true
      };
    }
    
    // Send via socket
    io.to(targetAgent.socketId).emit('printJobs', printJobsData);
    
    console.log(`📤 Print jobs sent to café ${cafeId}`);
    
    return {
      success: true,
      agentId: targetAgent.socketId,
      cafeName: targetAgent.cafeName
    };
    
  } catch (error) {
    console.error('Error sending print jobs:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get active agents status
 */
function getActivePrintAgents() {
  const agents = [];
  for (const [agentId, agent] of activePrintAgents.entries()) {
    const timeSinceLastSeen = Date.now() - agent.lastSeen.getTime();
    agents.push({
      cafeId: agent.cafeId,
      cafeName: agent.cafeName,
      printers: agent.printers,
      isOnline: timeSinceLastSeen < 120000,
      connectedAt: agent.connectedAt,
      lastSeen: agent.lastSeen
    });
  }
  return agents;
}

/**
 * Check if café has active agent
 */
function hasActivePrintAgent(cafeId) {
  for (const agent of activePrintAgents.values()) {
    if (agent.cafeId.toString() === cafeId.toString()) {
      const timeSinceLastSeen = Date.now() - agent.lastSeen.getTime();
      if (timeSinceLastSeen < 120000) {
        return true;
      }
    }
  }
  return false;
}

module.exports = {
  setupPrintAgentSocket,
  sendPrintJobs,
  getActivePrintAgents,
  hasActivePrintAgent
};

// ============================================
// INTEGRATION EXAMPLE
// ============================================

/*
// In your main server.js:

const { Server } = require('socket.io');
const { setupPrintAgentSocket, sendPrintJobs } = require('./printAgentSocket');

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

// Setup print agent handlers
setupPrintAgentSocket(io);

// Your existing socket handlers
io.on('connection', (socket) => {
  socket.on('joinCafe', ({ cafeId }) => {
    socket.join(`cafe-${cafeId}`);
  });
  // ... other handlers
});

// ============================================
// API ENDPOINTS FOR PRINT AGENT
// ============================================

// Verify token endpoint (for agent first-time setup)
router.post('/api/print-agent/verify', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify token belongs to this user's café
    const agentToken = await PrintAgentToken.findOne({
      where: { 
        token,
        cafeId: req.cafe.id  // from your middleware
      },
      include: [{ model: Cafe, as: 'Cafe' }]
    });
    
    if (!agentToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({
      success: true,
      cafeId: agentToken.cafeId,
      cafeName: agentToken.Cafe.name
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate token for download
router.post('/api/print-agent/generate-token', authenticateUser, async (req, res) => {
  try {
    const cafeId = req.cafe.id;  // from your middleware
    
    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Save to database
    await PrintAgentToken.create({
      cafeId,
      token,
      createdBy: req.user.id,
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      token,
      downloadUrl: `/api/print-agent/download?token=${token}`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WHEN ORDER IS CREATED - SEND TO PRINT
// ============================================

router.post('/server/createOrder', authenticateServer, async (req, res) => {
  try {
    const cafeId = req.cafe.id;
    
    // Your existing order creation...
    const order = await Order.create({...});
    await OrderItem.bulkCreate(req.body.items);
    
    // Fetch complete order
    const completeOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'OrderItems', include: [{ model: Item, as: 'Item' }] },
        { model: Table, as: 'Table' }
      ]
    });
    
    // Generate print jobs (your existing logic that returns HTML)
    const printJobsData = await generatePrintJobs(completeOrder);
    
    // Send to print agent
    sendPrintJobs(io, cafeId, printJobsData);
    
    // Emit to connected clients (your existing code)
    io.to(`cafe-${cafeId}`).emit('newOrder', completeOrder);
    
    res.json({ ok: true, order: completeOrder });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Your existing function that generates HTML
async function generatePrintJobs(order) {
  // Your existing code that returns:
  // {
  //   success: true,
  //   printJobs: [
  //     { station: 'bar', html: '...' },
  //     { station: 'cuisine', html: '...' },
  //     { station: 'caisse', html: '...' }
  //   ]
  // }
}

*/