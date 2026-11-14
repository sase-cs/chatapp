import mongoose from "mongoose";
import User, { PUBLIC_USER_FIELDS } from "../models/user.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import { emitToUser } from "../lib/socket.js";
import { areFriends } from "../lib/relationships.js";

function toPublic(user) {
  const { _id, fullName, username, profilePicture, bio, createdAt } = user;
  return { _id, fullName, username, profilePicture, bio, createdAt };
}

async function makeFriends(userA, userB) {
  await Promise.all([
    User.updateOne({ _id: userA }, { $addToSet: { friends: userB } }),
    User.updateOne({ _id: userB }, { $addToSet: { friends: userA } }),
  ]);
}

// GET /api/friends
export async function getFriends(req, res) {
  try {
    const { friends } = await User.findById(req.user._id)
      .select("friends")
      .populate({
        path: "friends",
        select: PUBLIC_USER_FIELDS,
        options: { sort: { fullName: 1 } },
      });
    res.status(200).json(friends);
  } catch (err) {
    console.error("Error in getFriends:", err.message);
    res.status(500).json({ message: "Failed to load friends" });
  }
}

// GET /api/friends/requests -> { incoming, outgoing }
export async function getFriendRequests(req, res) {
  try {
    const me = req.user._id;
    const [incoming, outgoing] = await Promise.all([
      FriendRequest.find({ to: me })
        .sort({ createdAt: -1 })
        .populate("from", PUBLIC_USER_FIELDS),
      FriendRequest.find({ from: me })
        .sort({ createdAt: -1 })
        .populate("to", PUBLIC_USER_FIELDS),
    ]);
    res.status(200).json({
      incoming: incoming
        .filter((r) => r.from)
        .map((r) => ({ _id: r._id, user: r.from, createdAt: r.createdAt })),
      outgoing: outgoing
        .filter((r) => r.to)
        .map((r) => ({ _id: r._id, user: r.to, createdAt: r.createdAt })),
    });
  } catch (err) {
    console.error("Error in getFriendRequests:", err.message);
    res.status(500).json({ message: "Failed to load friend requests" });
  }
}

// POST /api/friends/requests  body: { userId } or { username }
export async function sendFriendRequest(req, res) {
  try {
    const me = req.user;
    const { userId, username } = req.body;

    let target = null;
    if (userId && mongoose.isValidObjectId(userId)) {
      target = await User.findById(userId);
    } else if (username) {
      target = await User.findOne({
        username: String(username).trim().toLowerCase().replace(/^@/, ""),
      });
    }

    if (!target) {
      return res.status(404).json({
        message: "Hm, that didn't work. Double check the username.",
      });
    }
    if (target._id.equals(me._id)) {
      return res
        .status(400)
        .json({ message: "You can't send a friend request to yourself" });
    }
    if (areFriends(me, target._id)) {
      return res
        .status(409)
        .json({ message: "You're already friends with that user" });
    }

    // they already asked us -> sending one back just accepts theirs
    const reverse = await FriendRequest.findOne({
      from: target._id,
      to: me._id,
    });
    if (reverse) {
      await makeFriends(me._id, target._id);
      await reverse.deleteOne();
      emitToUser(target._id, "friendRequest:accepted", {
        requestId: reverse._id,
        user: toPublic(me),
      });
      return res.status(200).json({
        status: "accepted",
        requestId: reverse._id,
        user: toPublic(target),
      });
    }

    const existing = await FriendRequest.findOne({
      from: me._id,
      to: target._id,
    });
    if (existing) {
      return res.status(409).json({ message: "Friend request already sent" });
    }

    const request = await FriendRequest.create({
      from: me._id,
      to: target._id,
    });
    emitToUser(target._id, "friendRequest:new", {
      _id: request._id,
      user: toPublic(me),
      createdAt: request.createdAt,
    });

    res.status(201).json({
      status: "pending",
      request: {
        _id: request._id,
        user: toPublic(target),
        createdAt: request.createdAt,
      },
    });
  } catch (err) {
    console.error("Error in sendFriendRequest:", err.message);
    res.status(500).json({ message: "Failed to send friend request" });
  }
}

async function findRequestOr404(req, res, role) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid request id" });
    return null;
  }
  const request = await FriendRequest.findById(id);
  // `role` is the side the signed-in user must be on to perform the action
  if (!request || !request[role].equals(req.user._id)) {
    res.status(404).json({ message: "Friend request not found" });
    return null;
  }
  return request;
}

// POST /api/friends/requests/:id/accept
export async function acceptFriendRequest(req, res) {
  try {
    const request = await findRequestOr404(req, res, "to");
    if (!request) return;

    await makeFriends(request.from, request.to);
    await request.deleteOne();

    const friend = await User.findById(request.from).select(PUBLIC_USER_FIELDS);
    emitToUser(request.from, "friendRequest:accepted", {
      requestId: request._id,
      user: toPublic(req.user),
    });

    res.status(200).json({ requestId: request._id, user: friend });
  } catch (err) {
    console.error("Error in acceptFriendRequest:", err.message);
    res.status(500).json({ message: "Failed to accept friend request" });
  }
}

// POST /api/friends/requests/:id/decline
export async function declineFriendRequest(req, res) {
  try {
    const request = await findRequestOr404(req, res, "to");
    if (!request) return;

    await request.deleteOne();
    emitToUser(request.from, "friendRequest:removed", {
      requestId: request._id,
    });
    res.status(200).json({ requestId: request._id });
  } catch (err) {
    console.error("Error in declineFriendRequest:", err.message);
    res.status(500).json({ message: "Failed to decline friend request" });
  }
}

// DELETE /api/friends/requests/:id -> cancel a request I sent
export async function cancelFriendRequest(req, res) {
  try {
    const request = await findRequestOr404(req, res, "from");
    if (!request) return;

    await request.deleteOne();
    emitToUser(request.to, "friendRequest:removed", {
      requestId: request._id,
    });
    res.status(200).json({ requestId: request._id });
  } catch (err) {
    console.error("Error in cancelFriendRequest:", err.message);
    res.status(500).json({ message: "Failed to cancel friend request" });
  }
}

// DELETE /api/friends/:userId
export async function removeFriend(req, res) {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $pull: { friends: userId } }),
      User.updateOne({ _id: userId }, { $pull: { friends: req.user._id } }),
    ]);
    emitToUser(userId, "friend:removed", { userId: req.user._id });
    res.status(200).json({ userId });
  } catch (err) {
    console.error("Error in removeFriend:", err.message);
    res.status(500).json({ message: "Failed to remove friend" });
  }
}
