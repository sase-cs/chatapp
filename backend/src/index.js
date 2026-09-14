//const express = require('express');
import express from "express"; //syntax from "module" type in package.json
import "dotenv/config";
import User from "./models/user.model.js";
import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

//middleware
app.use(express.json()); // helps parse data to destructure it into its components
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware()); // adds req.auth

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
