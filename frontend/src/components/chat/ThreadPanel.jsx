import { useEffect, useLayoutEffect, useRef } from "react";
import { AnimatePresence, useAnimate, usePresence } from "motion/react";
import { Spinner } from "@heroui/react";
import { X } from "lucide-react";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import TypingIndicator from "./TypingIndicator";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";

const FLY = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 };

/**
 * iMessage-style thread view. It covers the chat with a blurred layer, and the message
 * being replied to flies from its place in the chat to the top of the thread. The original
 * stays invisible in the chat while the thread is open, so it looks like the same bubble moved.
 */
export default function ThreadPanel({ rootId, partner }) {
  const thread = useChatStore((s) => (s.thread?.rootId === rootId ? s.thread : null));
  const typing = useChatStore((s) => (thread ? s.typing[thread.chatId] : null));
  const closeThread = useChatStore((s) => s.closeThread);
  const finishCloseThread = useChatStore((s) => s.finishCloseThread);
  const myId = useAuthStore((s) => s.me._id);

  const [isPresent, safeToRemove] = usePresence();
  const [scope, animate] = useAnimate();
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const root = thread?.root;
  const hasRoot = !!root;
  const originRect = thread?.originRect;
  const replies = thread?.replies ?? [];
  const typingHere = typing?.threadId === rootId;

  // Enter animations. No "already ran" guards on purpose: useAnimate stops its animations on
  // unmount, and React StrictMode (dev) mounts twice, so the effects must be able to start over.
  useLayoutEffect(() => {
    animate("[data-fade]", { opacity: [0, 1] }, { duration: 0.22 });
  }, [animate]);

  // fly in: start the root bubble where it was in the chat, then spring it into place
  useLayoutEffect(() => {
    const wrapper = rootRef.current;
    const bubble = wrapper?.querySelector("[data-bubble]");
    if (!hasRoot || !bubble) return; // root still loading; this runs again when it arrives
    if (originRect) {
      wrapper.style.transform = "none"; // measure the resting position, not a half-run animation
      const target = bubble.getBoundingClientRect();
      animate(wrapper, { x: [originRect.left - target.left, 0], y: [originRect.top - target.top, 0] }, FLY);
    } else {
      animate(wrapper, { opacity: [0, 1], y: [10, 0] }, FLY);
    }
  }, [hasRoot, originRect, animate]);

  // fly out: send the bubble back to its spot (if it's on screen), then reveal the original
  useEffect(() => {
    if (isPresent) return;
    (async () => {
      const fade = animate("[data-fade]", { opacity: 0 }, { duration: 0.18 });
      const wrapper = rootRef.current;
      const bubble = wrapper?.querySelector("[data-bubble]");
      const original = document.querySelector(`[data-message-list] [data-bubble="${CSS.escape(rootId)}"]`);
      const list = document.querySelector("[data-message-list]")?.getBoundingClientRect();

      if (bubble && original && list) {
        const from = bubble.getBoundingClientRect();
        const to = original.getBoundingClientRect();
        const visible = to.bottom > list.top && to.top < list.bottom;
        if (visible) await animate(wrapper, { x: to.left - from.left, y: to.top - from.top }, FLY);
        else await animate(wrapper, { opacity: 0 }, { duration: 0.15 });
      }
      await fade;
      finishCloseThread(rootId);
      safeToRemove();
    })();
  }, [isPresent, animate, finishCloseThread, rootId, safeToRemove]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeThread();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeThread]);

  // follow new replies
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [replies.length, typingHere]);

  const closeOnBackground = (e) => {
    if (e.target === e.currentTarget || e.target.dataset.backdrop !== undefined) closeThread();
  };

  return (
    <div ref={scope} className="absolute inset-0 z-20 flex flex-col">
      <div data-fade className="absolute inset-0 bg-background/70 backdrop-blur-2xl" onClick={closeThread} />

      <div data-fade className="relative flex h-12 shrink-0 items-center justify-between px-4 md:px-6">
        <div className="text-sm">
          <span className="font-semibold">Thread</span>
          <span className="text-muted"> · with {partner.fullName}</span>
        </div>
        <button
          type="button"
          onClick={closeThread}
          aria-label="Close thread"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-default/80 text-muted transition-colors hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-thin relative flex-1 overflow-y-auto" onClick={closeOnBackground}>
        <div data-backdrop className="flex min-h-full flex-col px-4 pt-2 pb-4 md:px-10" onClick={closeOnBackground}>
          <div ref={rootRef} className="relative z-[1]">
            {root ? (
              <MessageBubble message={{ ...root, isNew: false }} mine={root.senderId === myId} inPanel />
            ) : (
              <div className="flex justify-center py-6">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          <div data-fade data-backdrop className="my-4 flex items-center gap-3 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <span className="h-px flex-1 bg-separator" />
            {replies.length ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}` : "No replies yet"}
            <span className="h-px flex-1 bg-separator" />
          </div>

          <div data-fade>
            {thread?.status === "loading" && !replies.length && (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            )}
            {replies.map((m, i) => {
              const prev = replies[i - 1];
              const next = replies[i + 1];
              const pos =
                prev?.senderId === m.senderId
                  ? next?.senderId === m.senderId
                    ? "middle"
                    : "last"
                  : next?.senderId === m.senderId
                    ? "first"
                    : "single";
              return <MessageBubble key={m.clientKey ?? m._id} message={m} mine={m.senderId === myId} pos={pos} inPanel />;
            })}
            <AnimatePresence>{typingHere && <TypingIndicator key="typing" />}</AnimatePresence>
          </div>
        </div>
      </div>

      <div data-fade className="relative">
        <Composer to={thread?.chatId ?? partner._id} parentId={rootId} threadId={rootId} placeholder="Reply in thread" autoFocus />
      </div>
    </div>
  );
}
