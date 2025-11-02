
const { Server } = require("socket.io");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true, // Allow older version clients
    transports: ['websocket', 'polling'] // Enable both WebSocket and polling
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("joinCafe", ({ cafeId }) => {
      console.log(cafeId)
      if (!cafeId) return;

      // Join café room
      socket.join(`cafe_${cafeId}`);

      // Join server subroom (optional)

      console.log(`Admin joined cafe ${cafeId}`);
    });
    socket.on("userJoin", ({ id }) => {
      if (!id) return;

      // Join café room
      socket.join(`user_${id}`);

      // Join server subroom (optional)

      console.log(`User joined with ${id}`);
    });
    
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
