import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "@heroui/react";
import { ArrowUp, FileAudio, Mic, Paperclip, Trash2, X } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useSocketStore } from "../../store/useSocketStore";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { formatDuration } from "../../lib/format";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPT = "image/*,video/*,audio/*";
const TYPING_IDLE_MS = 2500;

function isSupportedFile(file) {
  return ["image/", "video/", "audio/"].some((p) => file.type.startsWith(p));
}

function AttachmentPreview({ file, onRemove }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: 8, height: 0 }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-3 px-3 pt-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-default">
          {file.type.startsWith("image/") && <img src={url} alt="" className="h-full w-full object-cover" />}
          {file.type.startsWith("video/") && <video src={url} muted className="h-full w-full object-cover" />}
          {file.type.startsWith("audio/") && (
            <span className="flex h-full w-full items-center justify-center text-accent">
              <FileAudio size={26} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{file.name}</div>
          <div className="text-xs text-muted">{sizeMb} MB</div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// Live bars while recording a voice note.
function RecordingBar({ recorder, onCancel, onSend }) {
  return (
    <motion.div
      className="flex flex-1 items-center gap-3 pl-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        onClick={onCancel}
        aria-label="Discard recording"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-soft"
      >
        <Trash2 size={17} />
      </button>
      <span className="recording-pulse h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
      <span className="w-10 shrink-0 text-sm tabular-nums">{formatDuration(recorder.elapsed)}</span>
      <div className="flex h-8 flex-1 items-center justify-end gap-[3px] overflow-hidden">
        {recorder.levels.map((level, i) => (
          <motion.span
            key={i}
            className="w-[3px] shrink-0 rounded-full bg-accent"
            animate={{ height: `${Math.max(10, level * 100)}%` }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onSend}
        aria-label="Send voice message"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform active:scale-90"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}

/**
 * Message input. Enter sends, Shift+Enter adds a line.
 * Attach files with the clip button, by pasting, or by dropping them on the box.
 * With nothing typed, the send button becomes a microphone for voice notes.
 */
export default function Composer({ to, parentId = null, placeholder = "Message", autoFocus = false, threadId = null }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingRef = useRef({ active: false, timer: null });
  const sendMessage = useChatStore((s) => s.sendMessage);
  const emitTyping = useSocketStore((s) => s.emitTyping);
  const recorder = useVoiceRecorder();
  const recording = recorder.state === "recording";

  const canSend = text.trim().length > 0 || !!file;

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (recorder.error) toast.danger(recorder.error);
  }, [recorder.error]);

  // stop the typing indicator if the composer goes away mid-sentence
  useEffect(() => {
    const typing = typingRef.current;
    return () => {
      clearTimeout(typing.timer);
      if (typing.active) emitTyping(to, false, threadId);
    };
  }, [to, threadId, emitTyping]);

  // grow with the text, up to a limit
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const stopTyping = () => {
    const typing = typingRef.current;
    clearTimeout(typing.timer);
    if (typing.active) {
      typing.active = false;
      emitTyping(to, false, threadId);
    }
  };

  const onChange = (e) => {
    setText(e.target.value);
    const typing = typingRef.current;
    if (!typing.active && e.target.value) {
      typing.active = true;
      emitTyping(to, true, threadId);
    }
    clearTimeout(typing.timer);
    typing.timer = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const attach = (candidate) => {
    if (!candidate) return;
    if (!isSupportedFile(candidate)) return toast.danger("Only photos, videos and audio files can be shared");
    if (candidate.size > MAX_FILE_SIZE) return toast.danger("Files can be up to 25 MB");
    setFile(candidate);
    textareaRef.current?.focus();
  };

  const send = () => {
    if (!canSend) return;
    sendMessage({ to, text, file, parentId });
    setText("");
    setFile(null);
    stopTyping();
    textareaRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const onPaste = (e) => {
    const pasted = [...e.clipboardData.files][0];
    if (pasted) {
      e.preventDefault();
      attach(pasted);
    }
  };

  const sendRecording = async () => {
    const { blob, duration, waveform } = await recorder.stop();
    if (duration < 0.5) return; // accidental tap
    const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const voiceFile = new File([blob], `voice-message.${extension}`, { type: blob.type || "audio/webm" });
    sendMessage({ to, file: voiceFile, parentId, audioMeta: { duration, waveform, isVoiceNote: true } });
  };

  return (
    <div className="shrink-0 px-3 pt-2 pb-3 md:px-6 md:pb-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          attach(e.dataTransfer.files[0]);
        }}
        className={`relative rounded-[22px] border bg-surface shadow-sm transition-[border-color,box-shadow] ${
          dragging ? "border-accent ring-4 ring-accent/20" : "border-subtle focus-within:border-accent/60"
        }`}
      >
        <AnimatePresence>{file && <AttachmentPreview key={file.name + file.size} file={file} onRemove={() => setFile(null)} />}</AnimatePresence>

        <div className="flex items-end gap-1 p-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {recording ? (
              <RecordingBar key="rec" recorder={recorder} onCancel={recorder.cancel} onSend={sendRecording} />
            ) : (
              <motion.div
                key="input"
                className="flex flex-1 items-end gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach a photo, video or audio file"
                  title="Attach file"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    attach(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={onChange}
                  onKeyDown={onKeyDown}
                  onPaste={onPaste}
                  rows={1}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  className="scrollbar-thin max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-[7px] text-[15px] leading-[22px] outline-none placeholder:text-muted"
                />
                {/* send and mic swap places with a small pop */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {canSend ? (
                    <motion.button
                      key="send"
                      type="button"
                      onClick={send}
                      aria-label="Send message"
                      initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      whileTap={{ scale: 0.88 }}
                      transition={{ type: "spring", stiffness: 600, damping: 30 }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
                    >
                      <ArrowUp size={18} strokeWidth={2.5} />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="mic"
                      type="button"
                      onClick={recorder.start}
                      aria-label="Record voice message"
                      title="Record voice message"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      whileTap={{ scale: 0.88 }}
                      transition={{ type: "spring", stiffness: 600, damping: 30 }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
                    >
                      <Mic size={18} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
