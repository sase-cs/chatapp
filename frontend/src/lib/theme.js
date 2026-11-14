// Applies the user's appearance preferences to <html>.
// HeroUI reads data-theme (light/dark); our accent presets read data-theme-preset.

const CACHE_KEY = "appearance";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export const DEFAULT_PREFERENCES = {
  colorMode: "system",
  accent: "default",
  background: "aurora",
  customBackgroundUrl: "",
  backgroundDim: 0,
  bubbleStyle: "gradient",
  chatBackgrounds: {},
};

export function resolveColorMode(colorMode) {
  if (colorMode === "system") return darkQuery.matches ? "dark" : "light";
  return colorMode;
}

export function applyAppearance(prefs) {
  const root = document.documentElement;
  root.dataset.theme = resolveColorMode(prefs.colorMode);
  root.dataset.themePreset = prefs.accent || "default";
  root.dataset.bubbles = prefs.bubbleStyle || "gradient";
  root.style.colorScheme = root.dataset.theme;

  // cached so the next page load paints in the right theme before the API answers
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        colorMode: prefs.colorMode,
        accent: prefs.accent,
        bubbleStyle: prefs.bubbleStyle,
      }),
    );
  } catch {
    /* storage can be unavailable in private windows */
  }
}

// re-apply when the OS theme flips while "system" is selected
export function watchSystemTheme(getPrefs) {
  const onChange = () => {
    const prefs = getPrefs();
    if (prefs.colorMode === "system") applyAppearance(prefs);
  };
  darkQuery.addEventListener("change", onChange);
  return () => darkQuery.removeEventListener("change", onChange);
}

export function cachedAppearance() {
  try {
    return {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}"),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
