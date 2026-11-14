import { NavLink, useMatch } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Search, Users } from "lucide-react";
import Logo from "../common/Logo";
import ConversationItem from "./ConversationItem";
import ActivePill from "./ActivePill";
import UserPanel from "./UserPanel";
import { useChatStore } from "../../store/useChatStore";
import { useFriendsStore } from "../../store/useFriendsStore";

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="h-10 w-10 animate-pulse rounded-full bg-default" />
      <span className="flex flex-1 flex-col gap-1.5">
        <span className="h-3 w-24 animate-pulse rounded bg-default" />
        <span className="h-3 w-36 animate-pulse rounded bg-default/70" />
      </span>
    </div>
  );
}

export default function Sidebar({ onOpenSwitcher }) {
  const conversations = useChatStore((s) => s.conversations);
  const loaded = useChatStore((s) => s.conversationsLoaded);
  const pendingCount = useFriendsStore((s) => s.incoming.length);
  const onFriendsPage = useMatch("/");

  return (
    <aside className="flex h-full w-full flex-col border-r border-subtle bg-sidebar">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Logo size={28} withName />
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onOpenSwitcher}
          className="flex w-full items-center gap-2 rounded-xl bg-default/70 px-3 py-2 text-sm text-muted transition-colors hover:bg-default hover:text-foreground"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Find or start a chat</span>
          <kbd className="rounded-md border border-subtle px-1.5 text-[11px] font-medium">Ctrl K</kbd>
        </button>
      </div>

      <nav className="px-3 pb-1">
        <NavLink
          to="/"
          className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-default/60"
        >
          {onFriendsPage && <ActivePill />}
          <span className="relative flex flex-1 items-center gap-3">
            <Users size={18} className={onFriendsPage ? "text-accent" : "text-muted"} />
            Friends
          </span>
          <AnimatePresence>
            {pendingCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-danger-foreground"
              >
                {pendingCount}
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </nav>

      <div className="flex items-center justify-between px-6 pt-4 pb-1.5">
        <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Direct messages</span>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-3">
        {!loaded ? (
          <>
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            No conversations yet. Add a friend and say hi.
          </p>
        ) : (
          <motion.ul layout className="flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {conversations.map((c) => (
                <ConversationItem key={c.user._id} conversation={c} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      <UserPanel />
    </aside>
  );
}
