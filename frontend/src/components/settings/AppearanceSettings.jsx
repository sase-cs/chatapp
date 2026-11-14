import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "@heroui/react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import BackgroundTiles from "../chat/BackgroundTiles";
import ChatBackground from "../chat/ChatBackground";
import { HERO_UI_THEME_PRESETS } from "../../data/herouiThemePresets";
import { useAuthStore } from "../../store/useAuthStore";
import { errorMessage } from "../../lib/api";

const MODES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Sync with system", icon: Monitor },
];

function Section({ title, description, children }) {
  return (
    <section className="border-b border-subtle py-7 first:pt-0 last:border-0">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// A small chat that shows every appearance change as it happens.
function LivePreview({ preferences }) {
  return (
    <div className="relative h-44 overflow-hidden rounded-2xl border border-subtle">
      <ChatBackground background={preferences.background} customUrl={preferences.customBackgroundUrl} dim={preferences.backgroundDim} />
      <div className="relative flex h-full flex-col justify-end gap-1 p-4 text-[14px]">
        <div className="flex">
          <div className="bubble bubble-in px-3.5 py-2" data-pos="first">
            Did you change the theme?
          </div>
        </div>
        <div className="flex">
          <div className="bubble bubble-in px-3.5 py-2" data-pos="last">
            It looks great
          </div>
        </div>
        <div className="mt-1 flex justify-end">
          <div className="bubble bubble-out px-3.5 py-2">Thanks! Just picked a new color</div>
        </div>
      </div>
    </div>
  );
}

export default function AppearanceSettings() {
  const preferences = useAuthStore((s) => s.preferences);
  const updatePreferences = useAuthStore((s) => s.updatePreferences);
  const uploadBackground = useAuthStore((s) => s.uploadBackground);
  const [uploading, setUploading] = useState(false);

  const save = (patch) => updatePreferences(patch).catch((err) => toast.danger(errorMessage(err, "Couldn't save")));

  const upload = async (file) => {
    if (file.size > 25 * 1024 * 1024) return toast.danger("Images can be up to 25 MB");
    setUploading(true);
    try {
      await uploadBackground(file);
    } catch (err) {
      toast.danger(errorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Appearance</h1>

      <div className="mb-8">
        <LivePreview preferences={preferences} />
      </div>

      <Section title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {MODES.map(({ id, label, icon: Icon }) => {
            const selected = preferences.colorMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => save({ colorMode: id })}
                aria-pressed={selected}
                className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-colors ${
                  selected ? "border-accent bg-accent-soft text-foreground" : "border-subtle text-muted hover:text-foreground"
                }`}
              >
                <Icon size={20} className={selected ? "text-accent" : ""} />
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Accent color" description="Used for your messages, buttons and highlights.">
        <div className="flex flex-wrap gap-3">
          {HERO_UI_THEME_PRESETS.map((preset) => {
            const selected = preferences.accent === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={selected}
                onClick={() => save({ accent: preset.id })}
                className="group flex flex-col items-center gap-1.5"
              >
                <motion.span
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow ${
                    selected ? "ring-2 ring-foreground/70" : ""
                  }`}
                  style={{ background: preset.swatch }}
                >
                  {selected && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check size={18} strokeWidth={3} className="text-white drop-shadow" />
                    </motion.span>
                  )}
                </motion.span>
                <span className={`text-[11px] ${selected ? "font-semibold" : "text-muted"}`}>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Message bubbles">
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "gradient", label: "Gradient" },
            { id: "solid", label: "Solid" },
          ].map((style) => {
            const selected = preferences.bubbleStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => save({ bubbleStyle: style.id })}
                aria-pressed={selected}
                className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  selected ? "border-accent" : "border-subtle text-muted hover:text-foreground"
                }`}
              >
                {style.label}
                <span
                  data-bubbles={style.id}
                  className="flex"
                >
                  <span className="bubble bubble-out px-3 py-1 text-xs">Hey!</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Chat background" description="Your default for every chat. You can also pick one per chat from the chat header.">
        <BackgroundTiles
          groupId="settings-bg"
          value={preferences.background}
          onChange={(background) => save({ background })}
          customUrl={preferences.customBackgroundUrl}
          onUpload={upload}
          uploading={uploading}
        />
        {preferences.background === "custom" && (
          <label className="mt-5 flex items-center gap-4 text-sm">
            <span className="w-24 shrink-0 text-muted">Dim image</span>
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={preferences.backgroundDim}
              onChange={(e) => save({ backgroundDim: Number(e.target.value) })}
              className="flex-1 accent-[var(--accent)]"
            />
            <span className="w-10 text-right tabular-nums text-muted">{preferences.backgroundDim}%</span>
          </label>
        )}
      </Section>
    </div>
  );
}
