import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSidebar } from "../controllers/message.controller.js";
import { getConversationsForSidebar } from "../controllers/message.controller.js";
import { getMessages } from "../controllers/message.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

//we use it each time
router.use(protectRoute);

//api/messages/users
router.get("/users", getUsersForSidebar);
router.get("/conversations", getConversationsForSidebar);
router.get("/:id", getMessages);
router.post("/send/:id", upload.single("media"), sendMessage); // we use single for sending only one file each time, come back to update
// !!! IMPORTANT : whatever sent from frontend, we use the key "media"
export default router;
