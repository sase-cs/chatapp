import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { uploadChatMedia, hasImageKitConfig } from "../lib/imagekit.js";

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id; // MongoDB generates the _id field
    const everyoneBUTLoggedInUser = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-clerkId"); // every user except the logged in user
    res.status(200).json(everyoneBUTLoggedInUser);
  } catch (err) {
    console.error("Error in getUsersForSidebar:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;
    const conversations = await Message.aggregate([
      // First stage: keep only the messages a user sends or recieves
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      // Second stage: group by the other user and get the latest message timestamp
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessageAt: { $max: "$createdAt" },
        },
      },
      // Third stage: sort by latest message timestamp
      {
        $sort: { lastMessageAt: -1 },
      },
      // Fourth stage: lookup the user details for the other user
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      // Fifth stage: replace the root with the user details
      {
        $replaceRoot: { newRoot: { $first: "$user" } },
      },
      // Exclude the clerkId field
      {
        $project: { clerkId: 0 },
      },
    ]);
    res.status(200).json(conversations);
  } catch (err) {
    console.error("Error in getConversationsForSidebar:", err.message);
    res.status(500).json({ message: "Failed to load sidebar" });
  }
}

export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params; // id matches :id, important to be the same!
    const loggedInUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: loggedInUserId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: loggedInUserId },
      ],
    }).sort({ createdAt: 1 }); // Sort messages in ascending order by creation time

    res.status(200).json(messages);
  } catch (err) {
    console.error("Error in getMessages:", err.message);
    res.status(500).json({ message: "Failed to load messages" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    let videoUrl;
    // initially undefined because most messages don't have any media attached

    if (req.file) {
      if (!hasImageKitConfig()) {
        return res.status(500).json({ message: "ImageKit is not configured" });
      }
      const url = await uploadChatMedia(req.file);
      if (req.file.mimetype.startswith("image/")) imageUrl = url;
      if (req.file.mimetype.startswith("video/")) videoUrl = url;
    }

    const newMessage = new Message({
      senderId, // equal to senderId: senderId
      receiverId, // equal to receiverId: receiverId
      text,
      image: imageUrl,
      video: videoUrl,
    });

    await newMessage.save();
    // todo: realtime with socketio
    res.status(201).json(newMessage); // 201 - resource created
  } catch (err) {
    console.error("Error in sendMessage:", err.message);
    res.status(500).json({ message: "Failed to send message" });
  }
}
