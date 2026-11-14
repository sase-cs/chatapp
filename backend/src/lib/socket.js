import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173"; // default to localhost if FRONTEND_URL is not set

const io = new Server(server, { cors: { origin: [allowedOrigin] } }); // socket io on top of http server with express

function getRecieverSocketId(userId) {
  return userSocketMap[userId];
}

// { userId: socketId } ->online users map
const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // broadcast to everyone
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // .on used to listen for events
  socket.on("disconnect", () => {
    if (userId) {
      delete userSocketMap[userId];
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io, getRecieverSocketId };
