import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadImage } from "../middleware/upload.middleware.js";
import {
  getMe,
  getUserProfile,
  searchUsers,
  updateMe,
  updatePreferences,
  uploadBackground,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/me", getMe);
router.patch("/me", updateMe);
router.patch("/me/preferences", updatePreferences);
router.post("/me/background", uploadImage.single("image"), uploadBackground);
router.get("/search", searchUsers);
router.get("/:id", getUserProfile);

export default router;
