import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Spinner } from "@heroui/react";
import { ArrowDown } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ThreadRails from "./ThreadRails";
import TypingIndicator from "./TypingIndicator";
import UserAvatar from "../common/UserAvatar";
import { formatDay, formatMonthYear, isSameDay } from "../../lib/format";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";

const NO_MESSAGES = []; // stable reference for effect dependencies
const GROUP_GAP_MS = 3 * 60 * 1000; // messages closer than this from the same sender are grouped

// first/middle/last/single position of each message in its group
function groupPositions(messages) {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const joins = (a, b) =>
      a &&
      b &&
      a.senderId === b.senderId &&
      isSameDay(a.createdAt, b.createdAt) &&
      Math.abs(new Date(b.createdAt) - new Date(a.createdAt)) < GROUP_GAP_MS;
    const withPrev = joins(prev, m);
    const withNext = joins(m, next);
    if (withPrev && withNext) return "middle";
    if (withPrev) return "last";
    if (withNext) return "first";
    return "single";
  });
}

function DaySeparator({ date }) {
  return (
    <div className="sticky top-2 z-[1] my-4 flex justify-center">
      <span className="rounded-full bg-background/80 px-3 py-1 text-[11px] font-semibold text-muted shadow-sm backdrop-blur-md">
        {formatDay(date)}
      </span>
    </div>
  );
}

// Shown at the very top once the whole history is loaded.
function ConversationStart({ partner }) {
  return (
    <div className="flex flex-col items-center pt-10 pb-6 text-center">
      <UserAvatar user={partner} size={72} />
      <h2 className="mt-3 text-lg font-semibold">{partner.fullName}</h2>
      <p className="text-sm text-muted">@{partner.username}</p>
      <p className="mt-3 max-w-xs text-sm text-muted">
        This is the beginning of your conversation with {partner.fullName.split(" ")[0]}.
        {partner.createdAt && ` Member since ${formatMonthYear(partner.createdAt)}.`}
      </p>
    </div>
  );
}

export default function MessageList({ chatId, partner }) {
  const myId = useAuthStore((s) => s.me._id);
  const chat = useChatStore((s) => s.chats[chatId]);
  const thread = useChatStore((s) => s.thread);
  const typing = useChatStore((s) => s.typing[chatId]);
  const loadOlder = useChatStore((s) => s.loadOlder);
  const openThread = useChatStore((s) => s.openThread);

  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const stickToBottom = useRef(true);
  const prevFirstKey = useRef(null);
  const prevScrollHeight = useRef(0);
  const prevCount = useRef(0);
  const [hoveredThread, setHoveredThread] = useState(null);
  const [showJump, setShowJump] = useState(false);

  const messages = chat?.messages ?? NO_MESSAGES;
  const positions = groupPositions(messages);
  const lastMine = [...messages].reverse().find((m) => m.senderId === myId && !m.status);
  const isTyping = typing && !typing.threadId;

  const scrollToBottom = (behavior = "auto") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Keep the view in place when older messages are added on top,
  // and follow new messages at the bottom when the user is already there.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstKey = messages[0]?._id;
    const prepended = prevFirstKey.current && firstKey !== prevFirstKey.current && messages.length > prevCount.current;

    if (prepended && !stickToBottom.current) {
      el.scrollTop += el.scrollHeight - prevScrollHeight.current;
    } else if (messages.length !== prevCount.current) {
      const last = messages[messages.length - 1];
      if (stickToBottom.current || prevCount.current === 0) scrollToBottom(prevCount.current === 0 ? "auto" : "smooth");
      else if (last?.senderId === myId) scrollToBottom("smooth");
      else requestAnimationFrame(() => setShowJump(true)); // new message arrived while scrolled up
    }

    prevFirstKey.current = firstKey;
    prevCount.current = messages.length;
    prevScrollHeight.current = el.scrollHeight;
  }, [messages, myId]);

  // images load after the first scroll; keep the bottom pinned while they do
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) scrollToBottom();
      prevScrollHeight.current = scrollRef.current?.scrollHeight ?? 0;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isTyping && stickToBottom.current) scrollToBottom("smooth");
  }, [isTyping]);

  const onScroll = () => {
    const el = scrollRef.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 80;
    if (stickToBottom.current) setShowJump(false);
    if (el.scrollTop < 120 && chat?.hasMore && !chat.loadingOlder) loadOlder(chatId);
  };

  return (
    <div className="absolute inset-0">
      <div ref={scrollRef} onScroll={onScroll} data-message-list className="scrollbar-thin h-full overflow-y-auto">
        <div ref={contentRef} className="relative flex min-h-full flex-col justify-end px-4 pt-4 pb-3 md:px-10">
          {chat?.loadingOlder && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}
          {chat && !chat.hasMore && chat.status === "ready" && <ConversationStart partner={partner} />}

          <ThreadRails
            messages={messages}
            myId={myId}
            activeThreadId={hoveredThread}
          />

          {messages.map((m, i) => {
            const mine = m.senderId === myId;
            const prev = messages[i - 1];
            const threadId = m.parentId ?? (m.replyCount > 0 ? m._id : null);
            return (
              <Fragment key={m.clientKey ?? m._id}>
                {(!prev || !isSameDay(prev.createdAt, m.createdAt)) && <DaySeparator date={m.createdAt} />}
                <MessageBubble
                  message={m}
                  mine={mine}
                  pos={positions[i]}
                  hidden={thread?.rootId === m._id}
                  threadActive={!!threadId && threadId === hoveredThread}
                  onHoverThread={setHoveredThread}
                  onOpenThread={openThread}
                />
                {m === lastMine && (
                  <motion.div
                    key={m.seen ? "seen" : "sent"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1 pr-1 text-right text-[11px] font-medium text-muted"
                  >
                    {m.seen ? "Seen" : "Sent"}
                  </motion.div>
                )}
              </Fragment>
            );
          })}

          <AnimatePresence>{isTyping && <TypingIndicator key="typing" />}</AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showJump && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={() => {
              scrollToBottom("smooth");
              setShowJump(false);
            }}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground shadow-lg"
          >
            <ArrowDown size={14} /> New messages
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
