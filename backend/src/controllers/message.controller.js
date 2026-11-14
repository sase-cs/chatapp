import mongoose from "mongoose";
import User, { PUBLIC_USER_FIELDS } from "../models/user.model.js";
import Message from "../models/message.model.js";
import { uploadChatMedia, hasImageKitConfig } from "../lib/imagekit.js";
import { emitToUser } from "../lib/socket.js";
import { areFriends } from "../lib/relationships.js";

const PAGE_SIZE = 50;

// messages between the signed-in user and another user, in either direction
function conversationFilter(userA, userB) {
  return {
    $or: [
      { senderId: userA, receiverId: userB },
      { senderId: userB, receiverId: userA },
    ],
  };
}

function isParticipant(message, userId) {
  return message.senderId.equals(userId) || message.receiverId.equals(userId);
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;
    const publicFields = Object.fromEntries(
      PUBLIC_USER_FIELDS.split(" ").map((field) => [field, 1]),
    );

    const conversations = await Message.aggregate([
      // keep only the messages a user sends or receives
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      // newest first, so $first below picks the latest message
      { $sort: { createdAt: -1 } },
      // group by the other user, keep the latest message and count unread ones
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", loggedInUserId] },
                    { $eq: ["$seen", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      // attach the other user's public profile
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: publicFields }],
        },
      },
      { $unwind: "$user" }, // drops conversations with deleted users
      {
        $project: {
          _id: 0,
          user: 1,
          unreadCount: 1,
          "lastMessage._id": 1,
          "lastMessage.senderId": 1,
          "lastMessage.text": 1,
          "lastMessage.image": 1,
          "lastMessage.video": 1,
          "lastMessage.audio.isVoiceNote": 1,
          "lastMessage.audio.url": 1,
          "lastMessage.parentId": 1,
          "lastMessage.createdAt": 1,
          "lastMessage.seen": 1,
        },
      },
    ]);
    res.status(200).json(conversations);
  } catch (err) {
    console.error("Error in getConversationsForSidebar:", err.message);
    res.status(500).json({ message: "Failed to load sidebar" });
  }
}

// GET /api/messages/:id?before=<ISO date>
// Returns the latest PAGE_SIZE messages (or the ones before `before`), oldest first.
export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params; // id matches :id, important to be the same!
    if (!mongoose.isValidObjectId(userToChatId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const loggedInUserId = req.user._id;

    const filter = conversationFilter(loggedInUserId, userToChatId);
    if (req.query.before) {
      filter.createdAt = { $lt: new Date(req.query.before) };
    }

    const newestFirst = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1);

    const hasMore = newestFirst.length > PAGE_SIZE;
    const messages = newestFirst.slice(0, PAGE_SIZE).reverse();

    res.status(200).json({ messages, hasMore });
  } catch (err) {
    console.error("Error in getMessages:", err.message);
    res.status(500).json({ message: "Failed to load messages" });
  }
}

// GET /api/messages/thread/:messageId -> the root message and every reply to it
export async function getThread(req, res) {
  try {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const clicked = await Message.findById(messageId);
    if (!clicked || !isParticipant(clicked, req.user._id)) {
      return res.status(404).json({ message: "Message not found" });
    }

    // opening a thread from one of its replies should still show the whole thread
    const root = clicked.parentId
      ? await Message.findById(clicked.parentId)
      : clicked;
    const replies = await Message.find({ parentId: root._id }).sort({
      createdAt: 1,
    });

    res.status(200).json({ root, replies });
  } catch (err) {
    console.error("Error in getThread:", err.message);
    res.status(500).json({ message: "Failed to load thread" });
  }
}

function parseWaveform(raw) {
  if (!raw) return [];
  try {
    const values = JSON.parse(raw);
    if (!Array.isArray(values)) return [];
    return values
      .slice(0, 64)
      .map((v) => Math.min(1, Math.max(0, Number(v) || 0)));
  } catch {
    return [];
  }
}

export async function sendMessage(req, res) {
  try {
    const { text, parentId, duration, waveform, isVoiceNote } = req.body;
    const { id: receiverId } = req.params; // contains: the id of the user to whom the message is being sent
    const sender = req.user;

    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (!text?.trim() && !req.file) {
      return res.status(400).json({ message: "Message can't be empty" });
    }

    const receiver = await User.findById(receiverId).select("_id");
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }
    // like Discord: you can only message people on your friends list
    if (!areFriends(sender, receiverId)) {
      return res
        .status(403)
        .json({ message: "You can only message your friends" });
    }

    // replies always attach to the thread root, so threads are one level deep
    let threadRoot = null;
    if (parentId) {
      const parent = mongoose.isValidObjectId(parentId)
        ? await Message.findById(parentId)
        : null;
      if (
        !parent ||
        !isParticipant(parent, sender._id) ||
        !isParticipant(parent, receiver._id)
      ) {
        return res.status(400).json({ message: "Invalid thread" });
      }
      threadRoot = parent.parentId
        ? await Message.findById(parent.parentId)
        : parent;
    }

    let imageUrl;
    let videoUrl;
    let audio;
    // initially undefined because most messages don't have any media attached

    if (req.file) {
      if (!hasImageKitConfig()) {
        return res.status(500).json({ message: "ImageKit is not configured" });
      }
      const url = await uploadChatMedia(req.file);
      const { mimetype } = req.file;
      // MediaRecorder voice notes arrive as audio/webm or video/webm depending on the browser
      if (isVoiceNote === "true" || mimetype.startsWith("audio/")) {
        audio = {
          url,
          duration: Number(duration) || 0,
          waveform: parseWaveform(waveform),
          isVoiceNote: isVoiceNote === "true",
          fileName: req.file.originalname,
        };
      } else if (mimetype.startsWith("image/")) imageUrl = url;
      else if (mimetype.startsWith("video/")) videoUrl = url;
    }

    const newMessage = await Message.create({
      senderId: sender._id,
      receiverId,
      text: text?.trim() || undefined,
      image: imageUrl,
      video: videoUrl,
      audio,
      parentId: threadRoot?._id ?? null,
    });

    let threadUpdate = null;
    if (threadRoot) {
      const updatedRoot = await Message.findByIdAndUpdate(
        threadRoot._id,
        { $inc: { replyCount: 1 }, $set: { lastReplyAt: newMessage.createdAt } },
        { returnDocument: "after" },
      );
      threadUpdate = {
        _id: updatedRoot._id,
        replyCount: updatedRoot.replyCount,
        lastReplyAt: updatedRoot.lastReplyAt,
      };
    }

    const payload = { message: newMessage, threadUpdate };

    // Rooms are per user, so this reaches every open tab of both people.
    // The sender's own tabs dedupe by _id.
    emitToUser(receiverId, "newMessage", payload);
    emitToUser(sender._id, "newMessage", payload);

    res.status(201).json(payload); // 201 - resource created
  } catch (err) {
    console.error("Error in sendMessage:", err.message);
    res.status(500).json({ message: "Failed to send message" });
  }
}

// PATCH /api/messages/:id/seen -> mark everything the other user sent me as seen
export async function markConversationSeen(req, res) {
  try {
    const { id: otherUserId } = req.params;
    if (!mongoose.isValidObjectId(otherUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const result = await Message.updateMany(
      { senderId: otherUserId, receiverId: req.user._id, seen: false },
      { $set: { seen: true } },
    );

    if (result.modifiedCount > 0) {
      emitToUser(otherUserId, "messagesSeen", {
        by: req.user._id,
        at: new Date(),
      });
    }
    res.status(200).json({ updated: result.modifiedCount });
  } catch (err) {
    console.error("Error in markConversationSeen:", err.message);
    res.status(500).json({ message: "Failed to update messages" });
  }
}
