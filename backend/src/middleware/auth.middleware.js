import { clerkClient, getAuth } from "@clerk/express";
import User from "../models/user.model.js";
import { upsertUserFromClerk } from "../lib/userSync.js";

export async function protectRoute(req, res, next) {
  try {
    const { userId } = getAuth(req); //getAuth is a function from clerk that gets the userId from the request object
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized!" });
    }

    let user = await User.findOne({ clerkId: userId }); //find the user in the database using the clerkId

    // The webhook can arrive after the first request (or never, in local dev without a tunnel).
    // Pull the user straight from Clerk so the app works on first sign-in.
    // Users synced before usernames existed (or by the old webhook, which saved the avatar
    // under the wrong field) get backfilled from Clerk once.
    if (!user || !user.username) {
      const clerkUser = await clerkClient.users.getUser(userId);
      user = await upsertUserFromClerk(clerkUser);
    }

    //if everything is fine, we attach the user to the request object and pass control to the next middleware or route handler
    req.user = user;
    next();
  } catch (err) {
    console.error("Error in protectRoute middleware:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
