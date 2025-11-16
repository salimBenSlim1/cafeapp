// server.js
const WebSocket = require('ws');

// Create a WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log('✅ WebSocket server running on ws://localhost:8080');
});

// Map to store connected agents by cafeId
const agents = new Map();

wss.on('connection', (ws, req) => {
  console.log('📡 New agent connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // 1️⃣ Agent registration
      if (data.type === 'agent.register' && data.printers) {
        // Assuming cafeId is in query params: ws://server?cafeId=abc
        const url = new URL(req.url, `http://${req.headers.host}`);
        const cafeId = url.searchParams.get('cafeId');

        if (cafeId) {
          agents.set(cafeId, ws);
          console.log(`✅ Agent registered: ${cafeId}`);
        }

        // Optionally save printer config per cafe
        console.log('Printers:', data.printers);
      }

      // 2️⃣ Agent acknowledges print
      if (data.type === 'print.done') {
        console.log('✅ Print completed for job:', data.jobId);
      }

    } catch (err) {
      console.error('❌ Invalid message from agent:', err);
    }
  });

  ws.on('close', () => {
    console.log('⚠️ Agent disconnected');
    // Remove from agents map
    for (const [cafeId, socket] of agents.entries()) {
      if (socket === ws) agents.delete(cafeId);
    }
  });
});

