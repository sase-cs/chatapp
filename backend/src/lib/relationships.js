import FriendRequest from "../models/friendRequest.model.js";

export function areFriends(user, otherUserId) {
  return user.friends.some((id) => id.equals(otherUserId));
}

/**
 * How the signed-in user relates to another user, from the signed-in user's point of view:
 * "self" | "friend" | "outgoing" (I sent a request) | "incoming" (they sent one) | "none"
 */
export async function getRelationship(me, otherUserId) {
  if (me._id.equals(otherUserId)) return { status: "self" };
  if (areFriends(me, otherUserId)) return { status: "friend" };

  const request = await FriendRequest.findOne({
    $or: [
      { from: me._id, to: otherUserId },
      { from: otherUserId, to: me._id },
    ],
  }).select("_id from");

  if (!request) return { status: "none" };
  return {
    status: request.from.equals(me._id) ? "outgoing" : "incoming",
    requestId: request._id,
  };
}
