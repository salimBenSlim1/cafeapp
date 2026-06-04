const { Server } = require("socket.io");
const jwt        = require("jsonwebtoken");

const JWT_SECRET        = process.env.JWT_SECRET;
const SERVER_JWT_SECRET = process.env.SERVER_JWT_SECRET || JWT_SECRET;
const USER_JWT_SECRET   = process.env.USER_JWT_SECRET   || JWT_SECRET; // ← add to your .env

function extractCafeId(p) {
  const raw =
    p.cafeId   ??
    p.cafe_id  ??
    p.cafe?.id ??
    p.CafeId   ??
    p?.id       ??
    // ← REMOVED p.id fallback — it was returning userId as cafeId
    null;
  return raw != null ? String(raw) : null;
}

function verifyToken(token) {
  if (!token) return null;

  // ── 1. Admin token ───────────────────────────────────────────
  try {
    const p = jwt.verify(token, JWT_SECRET);
    if (p?.id || p?.userId) {
      const cafeId = extractCafeId(p);
      if (!cafeId) console.warn('[socket] admin token missing cafeId — keys:', Object.keys(p));
      return { userId: p.id ?? p.userId, role: p.role ?? 'admin', cafeId, verified: true };
    }
  } catch (_) {}

  // ── 2. Waiter / barman token ─────────────────────────────────
  try {
    const p = jwt.verify(token, JWT_SECRET);
    if (p?.id || p?.serverId) {
      const cafeId = extractCafeId(p);
      if (!cafeId) console.warn('[socket] server token missing cafeId — keys:', Object.keys(p));
      return { userId: p.id ?? p.serverId, role: p.role ?? 'waiter', cafeId, verified: true };
    }
  } catch (_) {}

  // ── 3. Customer / user token ─────────────────────────────────
  try {
    const p = jwt.verify(token, JWT_SECRET);
    // adjust these field checks to match whatever your user JWT contains
    if (p?.id || p?.userId) {
      const cafeId = extractCafeId(p);
      if (!cafeId) console.warn('[socket] user token missing cafeId — keys:', Object.keys(p));
      return { userId: p.id ?? p.userId, role: 'user', cafeId, verified: true };
    }
  } catch (_) {}

  return null;
}

class SocketService {
  #io;

  init(server) {
    if (this.#io) return this;

    this.#io = new Server(server, {
      cors: {
        origin:      process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : ["http://localhost:3000"],
        methods:     ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.#io.use((socket, next) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        null;

      const user = verifyToken(token);

      if (!user) {
        console.warn('[socket] rejected — invalid/missing token from', socket.handshake.address);
        return next(new Error("UNAUTHORIZED"));
      }

      socket.userId   = user.userId;
      socket.role     = user.role;
      socket.cafeId   = user.cafeId;
      socket.verified = true;

      next();
    });

    this.#io.on("connection", (socket) => this.#handleConnection(socket));
    console.log("Socket.io initialized");
    return this;
  }

  #handleConnection(socket) {
    if (socket.cafeId) {
      socket.join(`cafe_${socket.cafeId}`);
      console.log(`[socket] ${socket.role} ${socket.userId} auto-joined cafe_${socket.cafeId}`);
    }

    socket.on("joinCafe", ({ cafeId }) => this.#joinCafe(socket, cafeId));
    socket.on("userJoin", ({ id })     => this.#joinUser(socket, id));
    socket.on("disconnect", () =>
      console.log(`[socket] ${socket.role ?? "?"} ${socket.userId ?? socket.id} disconnected`)
    );
  }

  #joinCafe(socket, cafeId) {
    if (!cafeId) return;
    if (socket.cafeId && String(cafeId) !== String(socket.cafeId)) {
      console.warn(`[socket] ${socket.id} tried to join cafe_${cafeId} but token says cafe_${socket.cafeId} — rejected`);
      return;
    }
    if (!socket.cafeId) socket.cafeId = String(cafeId);
    socket.join(`cafe_${cafeId}`);
  }

  #joinUser(socket, id) {
    if (!id) return;
    socket.join(`user_${id}`);
  }

  emitToCafe(cafeId, event, payload) {
    this.#io.to(`cafe_${cafeId}`).emit(event, payload);
  }

  emitToUser(userId, event, payload) {
    this.#io.to(`user_${userId}`).emit(event, payload);
  }
}

module.exports = new SocketService();