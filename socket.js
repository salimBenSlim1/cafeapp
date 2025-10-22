
const { Server } = require("socket.io");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ["https://cafeapp-frontend-lij4.vercel.app"],
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true, // Allow older version clients
    transports: ['websocket', 'polling'] // Enable both WebSocket and polling
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initSocket(server) first.");
  }
  return io;
}

module.exports = { initSocket, getIo };
