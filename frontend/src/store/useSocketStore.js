import { create } from "zustand";
import { io } from "socket.io-client";
import { toast } from "@heroui/react";
import { useChatStore } from "./useChatStore";
import { useFriendsStore } from "./useFriendsStore";

export const useSocketStore = create((set, get) => ({
  socket: null,
  onlineUsers: new Set(),

  connect(getToken) {
    if (get().socket) return;

    // same origin as the page; Vite proxies /socket.io to the backend in dev
    const socket = io(import.meta.env.VITE_API_URL || undefined, {
      // called on every (re)connect, so an expired Clerk token is refreshed automatically
      auth: (cb) => getToken().then((token) => cb({ token })),
    });

    const chat = useChatStore.getState();
    const friends = useFriendsStore.getState();

    socket.on("getOnlineUsers", (ids) => set({ onlineUsers: new Set(ids) }));
    socket.on("newMessage", (payload) => chat.onNewMessage(payload));
    socket.on("messagesSeen", (payload) => chat.onMessagesSeen(payload));
    socket.on("typing", (payload) => chat.onTyping(payload));

    socket.on("friendRequest:new", (request) => {
      friends.onRequestReceived(request);
      toast(`${request.user.fullName} sent you a friend request`, {
        description: `@${request.user.username}`,
      });
    });
    socket.on("friendRequest:accepted", (payload) => {
      friends.onRequestAccepted(payload);
      toast.success(`You and ${payload.user.fullName} are now friends`);
    });
    socket.on("friendRequest:removed", (payload) => friends.onRequestRemoved(payload));
    socket.on("friend:removed", ({ userId }) => friends.removeFriendLocally(userId));

    set({ socket });
  },

  disconnect() {
    get().socket?.disconnect();
    set({ socket: null, onlineUsers: new Set() });
  },

  emitTyping(to, isTyping, threadId = null) {
    get().socket?.emit("typing", { to, isTyping, threadId });
  },
}));

export const useIsOnline = (userId) =>
  useSocketStore((s) => (userId ? s.onlineUsers.has(userId) : false));
