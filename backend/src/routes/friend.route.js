import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  sendFriendRequest,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getFriends);
router.get("/requests", getFriendRequests);
router.post("/requests", sendFriendRequest);
router.post("/requests/:id/accept", acceptFriendRequest);
router.post("/requests/:id/decline", declineFriendRequest);
router.delete("/requests/:id", cancelFriendRequest);
router.delete("/:userId", removeFriend);

export default router;
