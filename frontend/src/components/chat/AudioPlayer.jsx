import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play } from "lucide-react";
import { formatDuration, hueFor } from "../../lib/format";

const BARS = 40;

// Uploaded audio files have no recorded waveform, so draw a stable pseudo one from the URL.
function fallbackWaveform(seed) {
  let x = hueFor(seed) + 1;
  return Array.from({ length: BARS }, (_, i) => {
    x = (x * 9301 + 49297) % 233280;
    return 0.25 + 0.75 * Math.abs(Math.sin(i / 3 + x / 233280));
  });
}

// Only one clip plays at a time across the app.
const PLAY_EVENT = "audio-player:play";

export default function AudioPlayer({ audio, mine }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(audio.duration || 0);

  const waveform = audio.waveform?.length ? audio.waveform : fallbackWaveform(audio.url);
  const progress = duration ? Math.min(1, current / duration) : 0;

  useEffect(() => {
    const el = ref.current;
    const onOtherPlay = (e) => e.detail !== el && el.pause();
    window.addEventListener(PLAY_EVENT, onOtherPlay);
    return () => window.removeEventListener(PLAY_EVENT, onOtherPlay);
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (el.paused) {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: el }));
      el.play().catch(() => {});
    } else el.pause();
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    if (duration) ref.current.currentTime = ratio * duration;
  };

  return (
    <div className="flex w-64 max-w-full flex-col gap-1 px-3 py-2.5">
      {!audio.isVoiceNote && audio.fileName && (
        <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
          <Music size={13} />
          <span className="truncate">{audio.fileName}</span>
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 ${
            mine ? "bg-accent-foreground text-accent" : "bg-accent text-accent-foreground"
          }`}
        >
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>

        <div
          className="flex h-8 flex-1 cursor-pointer items-center gap-[2px]"
          onClick={seek}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") ref.current.currentTime = Math.min(duration, current + 5);
            if (e.key === "ArrowLeft") ref.current.currentTime = Math.max(0, current - 5);
          }}
        >
          {waveform.map((v, i) => (
            <span
              key={i}
              className="flex-1 rounded-full transition-opacity duration-150"
              style={{
                height: `${Math.max(12, v * 100)}%`,
                background: "currentColor",
                opacity: i / waveform.length < progress ? 1 : 0.35,
              }}
            />
          ))}
        </div>

        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums opacity-80">
          {formatDuration(playing || current ? current : duration)}
        </span>
      </div>

      <audio
        ref={ref}
        src={audio.url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        // recorded webm files often report Infinity; keep the recorded duration then
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      />
    </div>
  );
}
