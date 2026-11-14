/**
 * Dev-only demo data: two friends with a sample conversation (including a thread),
 * so the chat UI can be tried with a single real account.
 *
 *   npm run seed:demo                    -> seed for the only real user in the database
 *   npm run seed:demo -- --user <name>   -> seed for a specific username
 *   npm run seed:demo -- --remove        -> delete everything this script created
 *
 * Demo users have clerkIds starting with "demo_", so they can never sign in.
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/user.model.js";
import Message from "../src/models/message.model.js";
import FriendRequest from "../src/models/friendRequest.model.js";

const DEMO_USERS = [
  {
    clerkId: "demo_maya",
    email: "maya.demo@example.com",
    username: "maya",
    fullName: "Maya Torres",
    bio: "Weekend hiker, weekday coffee snob.",
  },
  {
    clerkId: "demo_leo",
    email: "leo.demo@example.com",
    username: "leo",
    fullName: "Leo Park",
    bio: "Building things with JavaScript. Mostly bugs.",
  },
];

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : (args[i + 1] ?? true);
};

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);

async function removeDemo() {
  const demo = await User.find({ clerkId: /^demo_/ }).select("_id");
  const ids = demo.map((u) => u._id);
  const messages = await Message.deleteMany({ $or: [{ senderId: { $in: ids } }, { receiverId: { $in: ids } }] });
  await FriendRequest.deleteMany({ $or: [{ from: { $in: ids } }, { to: { $in: ids } }] });
  await User.updateMany({}, { $pull: { friends: { $in: ids } } });
  await User.deleteMany({ _id: { $in: ids } });
  console.log(`Removed ${ids.length} demo users and ${messages.deletedCount} messages.`);
}

async function seed() {
  const username = flag("user");
  const real = await User.find(username ? { username } : { clerkId: { $not: /^demo_/ } });
  if (real.length !== 1) {
    throw new Error(
      username
        ? `No user named "${username}"`
        : `Found ${real.length} real users; pick one with --user <username>`,
    );
  }
  const me = real[0];

  await removeDemo(); // start clean so the script can be re-run

  const [maya, leo] = await User.create(DEMO_USERS.map((u) => ({ ...u, friends: [me._id] })));
  await User.updateOne({ _id: me._id }, { $addToSet: { friends: { $each: [maya._id, leo._id] } } });

  const msg = (from, to, text, ago, extra = {}) => ({
    senderId: from._id,
    receiverId: to._id,
    text,
    createdAt: minutesAgo(ago),
    updatedAt: minutesAgo(ago),
    seen: true,
    ...extra,
  });

  // Maya: yesterday + today, with a thread on the "trail" message
  const [, , trail] = await Message.insertMany(
    [
      msg(maya, me, "Hey! Are we still on for Saturday?", 26 * 60),
      msg(me, maya, "Yes! Wouldn't miss it", 26 * 60 - 2),
      msg(maya, me, "Which trail were you thinking? The lake loop or the ridge one?", 26 * 60 - 3),
      msg(me, maya, "Ridge, if the weather holds", 26 * 60 - 20),
      msg(maya, me, "Morning! Coffee before we leave?", 95),
      msg(me, maya, "Always", 93),
      msg(me, maya, "I'll grab the usual", 93),
      msg(maya, me, "You're the best", 90),
    ],
    { timestamps: false },
  );
  await Message.insertMany(
    [
      msg(me, maya, "Forecast says sunny all day, ridge it is", 60, { parentId: trail._id }),
      msg(maya, me, "Perfect. Bring the good snacks this time 😄", 55, { parentId: trail._id }),
    ],
    { timestamps: false },
  );
  await Message.updateOne({ _id: trail._id }, { replyCount: 2, lastReplyAt: minutesAgo(55) });

  // Leo: a short chat with two unread messages
  await Message.insertMany(
    [
      msg(leo, me, "Did you push the socket fix?", 300),
      msg(me, leo, "Yep, typing indicators work across tabs now", 290),
      msg(leo, me, "Nice. Want to pair on the thread UI later?", 12, { seen: false }),
      msg(leo, me, "I have some ideas for the animations", 11, { seen: false }),
    ],
    { timestamps: false },
  );

  console.log(`Seeded demo friends @maya and @leo for @${me.username}.`);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  if (flag("remove")) await removeDemo();
  else await seed();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
