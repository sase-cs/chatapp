import { useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, Copy, CornerUpLeft } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import { formatTime } from "../../lib/format";
import { useUIStore } from "../../store/useUIStore";
import { useChatStore } from "../../store/useChatStore";

function UploadRing({ progress }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} stroke="white" strokeOpacity="0.3" strokeWidth="3" fill="none" />
        <circle
          cx="22"
          cy="22"
          r={r}
          stroke="white"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (progress ?? 0))}
          style={{ transition: "stroke-dashoffset 0.2s" }}
        />
      </svg>
    </div>
  );
}

function MediaContent({ message }) {
  const openLightbox = useUIStore((s) => s.openLightbox);
  const [loaded, setLoaded] = useState(false);
  const uploading = message.status === "sending";

  if (message.image) {
    // show the local preview until the uploaded copy has loaded, so there's no flash
    const src = message.image;
    return (
      <button
        type="button"
        className="relative block overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          if (!uploading) openLightbox({ type: "image", src });
        }}
      >
        {message.localUrl && !loaded && (
          <img src={message.localUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <img
          src={src}
          alt="Shared photo"
          onLoad={() => setLoaded(true)}
          className={`block max-h-80 w-full min-w-40 object-cover transition-opacity duration-300 ${
            loaded || !message.localUrl ? "opacity-100" : "opacity-0"
          } ${!loaded && !message.localUrl ? "min-h-40 bg-default" : ""}`}
        />
        {uploading && <UploadRing progress={message.progress} />}
      </button>
    );
  }
  if (message.video) {
    return (
      <div className="relative">
        <video
          src={message.video}
          controls={!uploading}
          preload="metadata"
          playsInline
          className="block max-h-80 w-full bg-black"
        />
        {uploading && <UploadRing progress={message.progress} />}
      </div>
    );
  }
  return null;
}

/**
 * One chat message.
 * - `pos` (single/first/middle/last) squares off corners between grouped bubbles.
 * - Thread members are clickable and highlight together on hover.
 */
export default function MessageBubble({
  message,
  mine,
  pos = "single",
  inPanel = false,
  hidden = false,
  threadActive = false,
  onHoverThread,
  onOpenThread,
  bubbleRef,
}) {
  const retryMessage = useChatStore((s) => s.retryMessage);
  const discardMessage = useChatStore((s) => s.discardMessage);
  const chatId = mine ? message.receiverId : message.senderId;

  const hasMedia = !!(message.image || message.video);
  const mediaOnly = hasMedia && !message.text;
  const threadId = message.parentId ?? (message.replyCount > 0 ? message._id : null);
  const inThread = !!threadId;
  const failed = message.status === "failed";

  const open = (e) => {
    const bubble = e.currentTarget.closest("[data-message]")?.querySelector("[data-bubble]");
    onOpenThread?.(message, bubble?.getBoundingClientRect() ?? null);
  };

  return (
    <motion.div
      data-message={message._id}
      className={`group flex ${mine ? "justify-end" : "justify-start"} ${pos === "single" || pos === "first" ? "mt-2" : "mt-0.5"}`}
      // new bubbles rise from the composer; history loads without animation
      initial={message.isNew ? { opacity: 0, y: 14, scale: 0.94 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.8 }}
      style={{ transformOrigin: mine ? "bottom right" : "bottom left", visibility: hidden ? "hidden" : undefined }}
      onMouseEnter={() => inThread && onHoverThread?.(threadId)}
      onMouseLeave={() => inThread && onHoverThread?.(null)}
    >
      <div className={`flex max-w-[min(78%,560px)] flex-col ${mine ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
          <div
            ref={bubbleRef}
            data-bubble={message._id}
            data-pos={pos}
            data-thread-active={threadActive}
            onClick={inThread && !inPanel ? open : undefined}
            className={`bubble relative text-[15px] leading-snug transition-[outline-color,opacity] ${
              mine ? "bubble-out" : "bubble-in"
            } ${mediaOnly ? "bubble-media" : hasMedia ? "overflow-hidden" : ""} ${
              inThread && !inPanel ? "cursor-pointer" : ""
            } ${message.status === "sending" && !hasMedia ? "opacity-70" : ""} ${
              failed ? "opacity-60" : ""
            }`}
          >
            {hasMedia && <MediaContent message={message} />}
            {message.audio && <AudioPlayer audio={message.audio} mine={mine} />}
            {message.text && <div className="px-3.5 py-2">{message.text}</div>}
          </div>

          {/* hover actions */}
          {!message.status && (
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
              {!inPanel && (
                <button
                  type="button"
                  onClick={open}
                  aria-label="Reply in thread"
                  title="Reply"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
                >
                  <CornerUpLeft size={15} />
                </button>
              )}
              {message.text && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(message.text)}
                  aria-label="Copy text"
                  title="Copy"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
                >
                  <Copy size={14} />
                </button>
              )}
              <span className="px-1 text-[11px] whitespace-nowrap text-muted">{formatTime(message.createdAt)}</span>
            </div>
          )}
        </div>

        {/* "3 replies" under a thread root */}
        {!inPanel && message.replyCount > 0 && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={open}
            className="mt-1 px-2 text-xs font-semibold text-accent hover:underline"
          >
            {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
          </motion.button>
        )}

        {failed && (
          <div className="mt-1 flex items-center gap-2 text-xs text-danger">
            <AlertCircle size={13} />
            <span>{message.error ?? "Not delivered"}</span>
            <button type="button" className="font-semibold hover:underline" onClick={() => retryMessage(chatId, message._id)}>
              Retry
            </button>
            <button type="button" className="text-muted hover:underline" onClick={() => discardMessage(chatId, message._id)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
