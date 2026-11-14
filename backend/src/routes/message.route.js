import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import {
  getConversationsForSidebar,
  getMessages,
  getThread,
  markConversationSeen,
  sendMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

//we use it each time
router.use(protectRoute);

// static paths first, so "conversations" or "thread" are never read as a user id
router.get("/conversations", getConversationsForSidebar);
router.get("/thread/:messageId", getThread);
router.get("/:id", getMessages);
router.patch("/:id/seen", markConversationSeen);
router.post("/send/:id", upload.single("media"), sendMessage); // one attachment per message
// !!! IMPORTANT : whatever sent from frontend, we use the key "media"
export default router;
