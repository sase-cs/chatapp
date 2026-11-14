// Built-in chat backgrounds. Each one is a CSS class in index.css that is drawn with the
// current accent color, so every background matches the chosen theme in light and dark mode.
export const CHAT_BACKGROUNDS = [
  { id: "none", label: "Plain" },
  { id: "aurora", label: "Aurora" },
  { id: "dusk", label: "Dusk" },
  { id: "dots", label: "Dots" },
  { id: "grid", label: "Grid" },
  { id: "waves", label: "Waves" },
  { id: "confetti", label: "Confetti" },
];

export function backgroundFor(prefs, otherUserId) {
  const override = otherUserId && prefs.chatBackgrounds?.[otherUserId];
  return override || prefs.background || "aurora";
}
