import { create } from "zustand";
import { api } from "../lib/api";
import { applyAppearance, cachedAppearance, DEFAULT_PREFERENCES } from "../lib/theme";

// The signed-in user as stored in MongoDB, plus their appearance preferences.
export const useAuthStore = create((set, get) => ({
  me: null,
  preferences: cachedAppearance(),
  status: "idle", // idle | loading | ready | error

  async loadMe() {
    set({ status: "loading" });
    try {
      const { data } = await api.get("/users/me");
      const preferences = { ...DEFAULT_PREFERENCES, ...data.preferences };
      applyAppearance(preferences);
      set({ me: data, preferences, status: "ready" });
    } catch (err) {
      console.error("Failed to load profile", err);
      set({ status: "error" });
    }
  },

  // Optimistic: the UI changes instantly, the server call happens in the background.
  async updatePreferences(patch) {
    const previous = get().preferences;
    const next = { ...previous, ...patch };
    if (patch.chatBackground) {
      const { userId, background } = patch.chatBackground;
      const chatBackgrounds = { ...previous.chatBackgrounds };
      if (background === null) delete chatBackgrounds[userId];
      else chatBackgrounds[userId] = background;
      next.chatBackgrounds = chatBackgrounds;
      delete next.chatBackground;
    }
    applyAppearance(next);
    set({ preferences: next });

    try {
      const { data } = await api.patch("/users/me/preferences", patch);
      set({ preferences: { ...DEFAULT_PREFERENCES, ...data } });
    } catch (err) {
      applyAppearance(previous);
      set({ preferences: previous });
      throw err;
    }
  },

  async uploadBackground(file) {
    const form = new FormData();
    form.append("image", file);
    const { data } = await api.post("/users/me/background", form);
    const preferences = { ...DEFAULT_PREFERENCES, ...data };
    set({ preferences });
    return preferences;
  },

  async updateBio(bio) {
    const { data } = await api.patch("/users/me", { bio });
    set({ me: data });
  },

  // friend list changes come from the friends store; keep `me.friends` in sync for checks like canMessage
  setFriendIds(ids) {
    const me = get().me;
    if (me) set({ me: { ...me, friends: ids } });
  },
}));
