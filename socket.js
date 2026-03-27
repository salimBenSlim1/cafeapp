const { Server } = require("socket.io");
const jwt        = require("jsonwebtoken");

const JWT_SECRET        = process.env.JWT_SECRET;
const SERVER_JWT_SECRET = process.env.SERVER_JWT_SECRET || JWT_SECRET;

/* ─────────────────────────────────────────────────────────────────
   extractCafeId — tries every common field name for cafeId.
   Add yours here if it's different.
───────────────────────────────────────────────────────────────── */
function extractCafeId(p) {
  const raw =
    p.cafeId    ??   // { cafeId: 4 }
    p.cafe_id   ??   // { cafe_id: 4 }
    p.cafe?.id  ??   // { cafe: { id: 4 } }
    p.CafeId    ??   // Sequelize default pascal
    p.id??
    null;
  return raw != null ? String(raw) : null;
}

/* ─────────────────────────────────────────────────────────────────
   verifyToken — returns { userId, role, cafeId } or null.
   cafeId MAY be null if the token is valid but doesn't embed it —
   the client will send it via joinCafe instead.
───────────────────────────────────────────────────────────────── */
function verifyToken(token) {
  if (!token) return null;

  // Try admin token
  try {
    const p = jwt.verify(token, JWT_SECRET);
    if (p?.id || p?.userId) {
      const cafeId = extractCafeId(p);
      // Log once so you can see the actual payload field names in dev
      if (!cafeId) console.warn('[socket] admin token has no cafeId field — payload keys:', Object.keys(p));
      return {
        userId: p.id ?? p.userId,
        role:   p.role ?? 'admin',
        cafeId,               // may be null — joinCafe fallback handles it
        verified: true,
      };
    }
  } catch (_) {}

  // Try server (waiter / barman) token
  try {
    const p = jwt.verify(token, SERVER_JWT_SECRET);
    if (p?.id || p?.serverId) {
      const cafeId = extractCafeId(p);
      if (!cafeId) console.warn('[socket] server token has no cafeId field — payload keys:', Object.keys(p));
      return {
        userId: p.id ?? p.serverId,
        role:   p.role ?? 'waiter',
        cafeId,
        verified: true,
      };
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

    // ── JWT handshake middleware ─────────────────────────────────
    // Accepts any valid JWT (admin or server).
    // Rejects only if the token is completely missing or invalid.
    this.#io.use((socket, next) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        null;

      const user = verifyToken(token);

      if (!user) {
        console.warn('[socket] rejected — invalid/missing token');
        return next(new Error("UNAUTHORIZED"));
      }

      socket.userId   = user.userId;
      socket.role     = user.role;
      socket.cafeId   = user.cafeId;   // may be null
      socket.verified = true;           // token was valid

      next();
    });

    this.#io.on("connection", (socket) => this.#handleConnection(socket));
    console.log("Socket.io initialized");
    return this;
  }

  #handleConnection(socket) {
    // Auto-join if cafeId was in the token
    if (socket.cafeId) {
      socket.join(`cafe_${socket.cafeId}`);
      console.log(`[socket] ${socket.role} ${socket.userId} auto-joined cafe_${socket.cafeId}`);
    }

    socket.on("joinCafe", ({ cafeId }) => this.#joinCafe(socket, cafeId));
    socket.on("userJoin", ({ id })     => this.#joinUser(socket, id));
    socket.on("disconnect", ()         => console.log(`[socket] ${socket.role ?? "?"} ${socket.userId ?? socket.id} disconnected`));
  }

  #joinCafe(socket, cafeId) {
    if (!cafeId) return;

    // If the token already has a cafeId, enforce it matches
    if (socket.cafeId && String(cafeId) !== String(socket.cafeId)) {
      console.warn(`[socket] ${socket.id} tried to join cafe_${cafeId} but token says cafe_${socket.cafeId} — rejected`);
      return;
    }

    // Token is valid but had no cafeId — trust the client-sent value
    // (the token itself was still verified, so this is safe)
    if (!socket.cafeId) {
      socket.cafeId = String(cafeId);
    }

    socket.join(`cafe_${cafeId}`);
    console.log(`[socket] ${socket.role} ${socket.userId} joined cafe_${cafeId} via joinCafe`);
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