import { motion } from "motion/react";
import { Check, ImagePlus } from "lucide-react";
import { CHAT_BACKGROUNDS } from "../../lib/backgrounds";

// One thumbnail, drawn with the real background class plus two tiny bubbles.
export function BackgroundTile({ selected, label, onSelect, className = "", style, groupId = "bg" }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className="group flex flex-col items-center gap-1.5">
      <span
        className={`relative block h-20 w-full overflow-hidden rounded-xl border-2 transition-all ${
          selected ? "border-accent" : "border-subtle group-hover:border-foreground/20"
        }`}
      >
        <span className={`chat-bg absolute inset-0 ${className}`} style={style} />
        <span className="absolute top-3 left-2 h-2.5 w-10 rounded-full bg-[var(--bubble-in)] shadow-sm" />
        <span className="absolute top-7 right-2 h-2.5 w-8 rounded-full bg-accent" />
        {selected && (
          <motion.span
            layoutId={`${groupId}-check`}
            className="absolute right-1.5 bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <Check size={12} strokeWidth={3} />
          </motion.span>
        )}
      </span>
      <span className={`text-xs ${selected ? "font-semibold text-foreground" : "text-muted"}`}>{label}</span>
    </button>
  );
}

// Grid of background thumbnails, with optional "upload your own" tile.
export default function BackgroundTiles({ value, onChange, customUrl, onUpload, uploading = false, extra, groupId = "bg" }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {extra}
      {CHAT_BACKGROUNDS.map((bg) => (
        <BackgroundTile
          key={bg.id}
          groupId={groupId}
          selected={value === bg.id}
          label={bg.label}
          onSelect={() => onChange(bg.id)}
          className={`chat-bg-${bg.id}`}
        />
      ))}
      {customUrl && (
        <BackgroundTile
          groupId={groupId}
          selected={value === "custom"}
          label="Your image"
          onSelect={() => onChange("custom")}
          className="chat-bg-custom"
          style={{ backgroundImage: `url("${customUrl}")` }}
        />
      )}
      {onUpload && (
        <label className="group flex cursor-pointer flex-col items-center gap-1.5">
          <span className="flex h-20 w-full items-center justify-center rounded-xl border-2 border-dashed border-subtle text-muted transition-colors group-hover:border-accent group-hover:text-accent">
            {uploading ? <span className="text-xs">Uploading…</span> : <ImagePlus size={20} />}
          </span>
          <span className="text-xs text-muted">Upload</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files[0]) onUpload(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
