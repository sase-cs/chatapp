import mongoose from "mongoose";
import User, { PUBLIC_USER_FIELDS } from "../models/user.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import { uploadChatMedia, hasImageKitConfig } from "../lib/imagekit.js";
import { getRelationship } from "../lib/relationships.js";
import { isOnline } from "../lib/socket.js";

const COLOR_MODES = ["light", "dark", "system"];
const BUBBLE_STYLES = ["solid", "gradient"];
const ID_PATTERN = /^[a-z0-9-]{1,32}$/; // accent and background ids

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/users/me
export async function getMe(req, res) {
  res.status(200).json(req.user);
}

// PATCH /api/users/me  body: { bio }
// Name and avatar are managed by Clerk and synced through the webhook.
export async function updateMe(req, res) {
  try {
    const { bio } = req.body;
    if (typeof bio !== "string") {
      return res.status(400).json({ message: "Nothing to update" });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { bio: bio.trim().slice(0, 190) } },
      { returnDocument: "after", runValidators: true },
    );
    res.status(200).json(user);
  } catch (err) {
    console.error("Error in updateMe:", err.message);
    res.status(500).json({ message: "Failed to update profile" });
  }
}

// PATCH /api/users/me/preferences
// body: any of { colorMode, accent, background, backgroundDim, bubbleStyle, chatBackground: { userId, background|null } }
export async function updatePreferences(req, res) {
  try {
    const body = req.body ?? {};
    const $set = {};
    const $unset = {};

    if (COLOR_MODES.includes(body.colorMode))
      $set["preferences.colorMode"] = body.colorMode;
    if (BUBBLE_STYLES.includes(body.bubbleStyle))
      $set["preferences.bubbleStyle"] = body.bubbleStyle;
    if (ID_PATTERN.test(body.accent ?? ""))
      $set["preferences.accent"] = body.accent;
    if (ID_PATTERN.test(body.background ?? ""))
      $set["preferences.background"] = body.background;
    if (body.backgroundDim !== undefined) {
      const dim = Math.round(Number(body.backgroundDim));
      if (Number.isFinite(dim))
        $set["preferences.backgroundDim"] = Math.min(80, Math.max(0, dim));
    }

    // per-chat override; background: null resets it to the global one
    const chat = body.chatBackground;
    if (chat && mongoose.isValidObjectId(chat.userId)) {
      const key = `preferences.chatBackgrounds.${chat.userId}`;
      if (chat.background === null) $unset[key] = "";
      else if (ID_PATTERN.test(chat.background ?? ""))
        $set[key] = chat.background;
    }

    if (!Object.keys($set).length && !Object.keys($unset).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    // MongoDB rejects empty update operators, so only include the ones in use
    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      returnDocument: "after",
    });
    res.status(200).json(user.preferences);
  } catch (err) {
    console.error("Error in updatePreferences:", err.message);
    res.status(500).json({ message: "Failed to save preferences" });
  }
}

// POST /api/users/me/background  (multipart, field "image")
export async function uploadBackground(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No image sent" });
    if (!hasImageKitConfig()) {
      return res.status(500).json({ message: "ImageKit is not configured" });
    }
    const url = await uploadChatMedia(req.file);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          "preferences.customBackgroundUrl": url,
          "preferences.background": "custom",
        },
      },
      { returnDocument: "after" },
    );
    res.status(200).json(user.preferences);
  } catch (err) {
    console.error("Error in uploadBackground:", err.message);
    res.status(500).json({ message: "Failed to upload background" });
  }
}

// GET /api/users/search?q=
// Matches username prefix, part of the full name, or an exact email address.
export async function searchUsers(req, res) {
  try {
    const q = String(req.query.q ?? "")
      .trim()
      .replace(/^@/, "")
      .slice(0, 64);
    if (q.length < 2) return res.status(200).json([]);

    const pattern = escapeRegex(q);
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: `^${pattern}`, $options: "i" } },
        { fullName: { $regex: pattern, $options: "i" } },
        { email: q.toLowerCase() },
      ],
    })
      .select(PUBLIC_USER_FIELDS)
      .limit(10)
      .lean();

    // label each result so the UI can show "Add", "Pending" or "Friends"
    const ids = users.map((u) => u._id);
    const requests = await FriendRequest.find({
      $or: [
        { from: req.user._id, to: { $in: ids } },
        { from: { $in: ids }, to: req.user._id },
      ],
    }).lean();

    const results = users.map((u) => {
      let relationship = { status: "none" };
      if (req.user.friends.some((f) => f.equals(u._id)))
        relationship = { status: "friend" };
      const request = requests.find(
        (r) => r.from.equals(u._id) || r.to.equals(u._id),
      );
      if (request) {
        relationship = {
          status: request.from.equals(req.user._id) ? "outgoing" : "incoming",
          requestId: request._id,
        };
      }
      return { ...u, relationship };
    });

    res.status(200).json(results);
  } catch (err) {
    console.error("Error in searchUsers:", err.message);
    res.status(500).json({ message: "Search failed" });
  }
}

// GET /api/users/:id -> public profile, relationship and mutual friends
export async function getUserProfile(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id).select(
      `${PUBLIC_USER_FIELDS} friends`,
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const myFriends = new Set(req.user.friends.map(String));
    const mutualIds = user.friends.filter((f) => myFriends.has(String(f)));
    const mutualFriends = await User.find({ _id: { $in: mutualIds } })
      .select(PUBLIC_USER_FIELDS)
      .limit(12);

    const { friends: _friends, ...profile } = user.toObject();
    res.status(200).json({
      ...profile,
      isOnline: isOnline(user._id),
      relationship: await getRelationship(req.user, user._id),
      mutualFriends,
      mutualFriendCount: mutualIds.length,
    });
  } catch (err) {
    console.error("Error in getUserProfile:", err.message);
    res.status(500).json({ message: "Failed to load profile" });
  }
}
