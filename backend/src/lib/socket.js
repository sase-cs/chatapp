import express from "express";
import http from "http";
import { Server } from "socket.io";
import { verifyToken } from "@clerk/express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173"; // default to localhost if FRONTEND_URL is not set

const io = new Server(server, { cors: { origin: [allowedOrigin] } }); // socket io on top of http server with express

// { userId: Set<socketId> } -> a user can be online from several tabs or devices at once
const onlineUsers = new Map();

function isOnline(userId) {
  return onlineUsers.has(userId.toString());
}

// Every socket joins a room named after its user id, so emitting to a user reaches all their tabs.
function emitToUser(userId, event, payload) {
  io.to(userId.toString()).emit(event, payload);
}

function broadcastOnlineUsers() {
  io.emit("getOnlineUsers", [...onlineUsers.keys()]);
}

// The client sends its Clerk session token; we verify it instead of trusting a userId from the query string.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const user = await User.findOne({ clerkId: payload.sub }).select("_id");
    if (!user) return next(new Error("User is not synced up yet"));

    socket.data.userId = user._id.toString();
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const { userId } = socket.data;

  socket.join(userId);
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);
  broadcastOnlineUsers();

  // typing indicator, relayed as-is. threadId is set when typing inside a thread.
  socket.on("typing", ({ to, isTyping, threadId = null } = {}) => {
    if (!to) return;
    emitToUser(to, "typing", { from: userId, isTyping: !!isTyping, threadId });
  });

  socket.on("disconnect", () => {
    const sockets = onlineUsers.get(userId);
    sockets?.delete(socket.id);
    if (sockets && sockets.size === 0) onlineUsers.delete(userId);
    broadcastOnlineUsers();
  });
});

export { app, server, io, emitToUser, isOnline };
