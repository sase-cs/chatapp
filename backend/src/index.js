//const express = require('express');
import express from "express"; //syntax from "module" type in package.json
import "dotenv/config";
import User from "./models/user.model.js";
import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import fs from "fs"; //file system module to check if public folder exists
import path from "path";
import job from "./lib/cron.js";
import clerkWebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

const app = express();
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

// only for prod build
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir)); //middleware to serve static files from public folder
  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err)); //lets react handle rerouting in the browser
  });
}

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
  if (process.env.NODE_ENV === "production") job.start();
});
