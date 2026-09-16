import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export async function protectRoute(req, res, next) {
  try {
    const { userId } = getAuth(req); //getAuth is a function from clerk that gets the userId from the request object
    if (!userId) {
      res.status(401).json({ message: "Unauthorized!" });
      return;
    }
    const user = await User.findOne({ clerkId: userId }); //find the user in the database using the clerkId
    if (!user) {
      res.status(404).json({ message: "User is not synced up yet!" });
    }
    //if everything is fine, we attach the user to the request object and pass control to the next middleware or route handler
    req.user = user;
    next();
  } catch (err) {
    console.error("Error in protectRoute middleware:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
