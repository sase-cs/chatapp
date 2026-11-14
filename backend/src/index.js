import express from "express"; //syntax from "module" type in package.json
import "dotenv/config";
import multer from "multer";
import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import fs from "fs"; //file system module to check if public folder exists
import path from "path";
import job from "./lib/cron.js";
import clerkWebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import friendRoutes from "./routes/friend.route.js";
import userRoutes from "./routes/user.route.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

const publicDir = path.join(process.cwd(), "public"); // join current working directory with public folder

app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhook,
); // to handle webhooks from clerk, we use express.raw() because clerk sends raw data in the request body

//middleware
app.use(express.json()); // helps parse data to destructure it into its components
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware()); // adds req.auth

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes); // authRoutes is imported from auth.route.js
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/users", userRoutes);

// only for prod build
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir)); //middleware to serve static files from public folder
  app.get("/{*any}", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    }); //lets react handle rerouting in the browser
  });
}

// errors thrown by multer (file too large, wrong type) and anything else that slips through
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Files can be up to 25 MB" : err.message;
    return res.status(status).json({ message });
  }
  console.error("Unhandled error:", err);
  res
    .status(err.status || 500)
    .json({ message: err.status ? err.message : "Internal server error" });
});

server.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
  if (process.env.NODE_ENV === "production") job.start();
});
