import mongoose from "mongoose";

// Appearance settings are stored on the account so they follow the user across devices.
const preferencesSchema = new mongoose.Schema(
  {
    colorMode: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    accent: { type: String, default: "default" }, // matches data-theme-preset in the frontend CSS
    background: { type: String, default: "aurora" }, // id of a built-in background, or "custom"
    customBackgroundUrl: { type: String, default: "" },
    backgroundDim: { type: Number, default: 0, min: 0, max: 80 }, // overlay opacity in %, for busy images
    bubbleStyle: {
      type: String,
      enum: ["solid", "gradient"],
      default: "gradient",
    },
    // per-conversation background overrides: { [otherUserId]: backgroundId }
    chatBackgrounds: { type: Map, of: String, default: {} },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // users synced before this field existed won't have one until their next sync
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 190,
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true }, //createdAt and updatedAt fields added automatically
);

// fields that are safe to show to other users
export const PUBLIC_USER_FIELDS =
  "_id fullName username profilePicture bio createdAt";

const User = mongoose.model("User", userSchema);

export default User;
