import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useChatStore } from "../store/useChatStore";
import { useFriendsStore } from "../store/useFriendsStore";

/**
 * The person on the other side of a chat. Usually already known from the friends list or
 * the conversation list; otherwise (e.g. an old chat with someone who is no longer a friend,
 * or a pasted link) it's fetched. Returns undefined while loading and null if not found.
 */
export function useChatPartner(userId) {
  const fromFriends = useFriendsStore((s) => s.friends.find((f) => f._id === userId));
  const fromConversations = useChatStore((s) => s.conversations.find((c) => c.user._id === userId)?.user);
  const known = fromFriends ?? fromConversations;
  const [fetched, setFetched] = useState({ id: null, user: undefined });

  useEffect(() => {
    if (known) return;
    let cancelled = false;
    api
      .get(`/users/${userId}`)
      .then(({ data }) => !cancelled && setFetched({ id: userId, user: data }))
      .catch(() => !cancelled && setFetched({ id: userId, user: null }));
    return () => {
      cancelled = true;
    };
  }, [userId, known]);

  if (known) return known;
  return fetched.id === userId ? fetched.user : undefined;
}
