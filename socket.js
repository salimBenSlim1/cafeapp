const { Server } = require("socket.io");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinCafe", ({ cafeId }) => {
      if (!cafeId) return;
      socket.join(`cafe_${cafeId}`);
      console.log(`Admin joined cafe ${cafeId}`);
    });

    socket.on("userJoin", ({ id }) => {
      if (!id) return;
      socket.join(`user_${id}`);
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
