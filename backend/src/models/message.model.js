import mongoose from "mongoose";

const audioSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    duration: { type: Number, default: 0 }, // seconds
    waveform: [{ type: Number, min: 0, max: 1 }], // normalized peaks, recorded on the client
    isVoiceNote: { type: Boolean, default: false },
    fileName: { type: String },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    audio: {
      type: audioSchema,
    },
    // Threads: a reply points to the message it answers (the thread root).
    // Replies to a reply are attached to the same root, so threads stay one level deep.
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true,
    },
    replyCount: { type: Number, default: 0 },
    lastReplyAt: { type: Date },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true },
); //createdAt and updatedAt fields added automatically;

// speeds up loading a conversation between two users
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
