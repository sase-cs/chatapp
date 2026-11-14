import { create } from "zustand";

function readFlag(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

// Overlays and panels that can be opened from anywhere in the app.
export const useUIStore = create((set) => ({
  settingsOpen: false,
  settingsSection: "appearance",
  profileUserId: null, // user shown in the profile modal
  profilePanelOpen: readFlag("profilePanelOpen", true), // right-hand panel in a chat
  sidebarOpen: false, // mobile drawer
  lightbox: null, // { type: "image" | "video", src }

  openSettings: (section = "appearance") =>
    set({ settingsOpen: true, settingsSection: section, sidebarOpen: false }),
  setSettingsSection: (section) => set({ settingsSection: section }),
  closeSettings: () => set({ settingsOpen: false }),

  openProfile: (userId) => set({ profileUserId: userId }),
  closeProfile: () => set({ profileUserId: null }),

  toggleProfilePanel: () =>
    set((state) => {
      writeFlag("profilePanelOpen", !state.profilePanelOpen);
      return { profilePanelOpen: !state.profilePanelOpen };
    }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openLightbox: (media) => set({ lightbox: media }),
  closeLightbox: () => set({ lightbox: null }),
}));
