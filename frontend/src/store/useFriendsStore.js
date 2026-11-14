import { create } from "zustand";
import { api } from "../lib/api";
import { useAuthStore } from "./useAuthStore";

function syncFriendIds(friends) {
  useAuthStore.getState().setFriendIds(friends.map((f) => f._id));
}

export const useFriendsStore = create((set, get) => ({
  friends: [],
  incoming: [], // [{ _id: requestId, user, createdAt }]
  outgoing: [],
  loaded: false,

  async load() {
    const [friendsRes, requestsRes] = await Promise.all([
      api.get("/friends"),
      api.get("/friends/requests"),
    ]);
    set({
      friends: friendsRes.data,
      incoming: requestsRes.data.incoming,
      outgoing: requestsRes.data.outgoing,
      loaded: true,
    });
  },

  isFriend: (userId) => get().friends.some((f) => f._id === userId),

  // returns "pending" or "accepted" (when they had already sent us a request)
  async sendRequest({ userId, username }) {
    const { data } = await api.post("/friends/requests", { userId, username });
    if (data.status === "accepted") {
      get().addFriend(data.user);
      set((s) => ({ incoming: s.incoming.filter((r) => r._id !== data.requestId) }));
    } else {
      set((s) => ({ outgoing: [data.request, ...s.outgoing] }));
    }
    return data;
  },

  async accept(requestId) {
    const { data } = await api.post(`/friends/requests/${requestId}/accept`);
    set((s) => ({ incoming: s.incoming.filter((r) => r._id !== requestId) }));
    get().addFriend(data.user);
  },

  async decline(requestId) {
    set((s) => ({ incoming: s.incoming.filter((r) => r._id !== requestId) }));
    await api.post(`/friends/requests/${requestId}/decline`);
  },

  async cancel(requestId) {
    set((s) => ({ outgoing: s.outgoing.filter((r) => r._id !== requestId) }));
    await api.delete(`/friends/requests/${requestId}`);
  },

  async remove(userId) {
    await api.delete(`/friends/${userId}`);
    get().removeFriendLocally(userId);
  },

  addFriend(user) {
    const friends = [...get().friends.filter((f) => f._id !== user._id), user].sort(
      (a, b) => a.fullName.localeCompare(b.fullName),
    );
    set({ friends });
    syncFriendIds(friends);
  },

  removeFriendLocally(userId) {
    const friends = get().friends.filter((f) => f._id !== userId);
    set({ friends });
    syncFriendIds(friends);
  },

  // --- socket events ---
  onRequestReceived(request) {
    set((s) => ({
      incoming: [request, ...s.incoming.filter((r) => r._id !== request._id)],
    }));
  },
  onRequestAccepted({ requestId, user }) {
    set((s) => ({ outgoing: s.outgoing.filter((r) => r._id !== requestId) }));
    get().addFriend(user);
  },
  onRequestRemoved({ requestId }) {
    set((s) => ({
      incoming: s.incoming.filter((r) => r._id !== requestId),
      outgoing: s.outgoing.filter((r) => r._id !== requestId),
    }));
  },
}));
