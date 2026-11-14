import { Link, useMatch } from "react-router";
import { motion } from "motion/react";
import UserAvatar from "../common/UserAvatar";
import ActivePill from "./ActivePill";
import { formatRelative, messagePreview } from "../../lib/format";
import { useChatStore } from "../../store/useChatStore";

export default function ConversationItem({ conversation }) {
  const { user, lastMessage, unreadCount } = conversation;
  const active = useMatch(`/chat/${user._id}`);
  const typing = useChatStore((s) => !!s.typing[user._id]);
  const fromThem = lastMessage?.senderId === user._id;
  const unread = unreadCount > 0;

  return (
    <motion.li
      layout="position" // slides to the top when a new message arrives
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      <Link
        to={`/chat/${user._id}`}
        className="relative flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-default/60"
      >
        {active && <ActivePill />}
        <UserAvatar user={user} size={40} showStatus />
        <span className="relative min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>{user.fullName}</span>
            {lastMessage && (
              <span className={`shrink-0 text-[11px] ${unread ? "font-semibold text-accent" : "text-muted"}`}>
                {formatRelative(lastMessage.createdAt)}
              </span>
            )}
          </span>
          <span className="flex items-center justify-between gap-2">
            {typing ? (
              <span className="truncate text-[13px] font-medium text-accent">typing…</span>
            ) : (
              <span className={`truncate text-[13px] ${unread ? "text-foreground" : "text-muted"}`}>
                {lastMessage && !fromThem && "You: "}
                {messagePreview(lastMessage)}
              </span>
            )}
            {unread && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </span>
        </span>
      </Link>
    </motion.li>
  );
}
