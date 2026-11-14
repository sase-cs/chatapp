import { motion } from "motion/react";
import UserAvatar from "../common/UserAvatar";
import { useUIStore } from "../../store/useUIStore";

// One person in a friends list. `actions` are the buttons on the right.
export default function FriendRow({ user, subtitle, actions, onClick, index = 0 }) {
  const openProfile = useUIStore((s) => s.openProfile);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 10) * 0.025 } }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
      className="group flex items-center gap-3 rounded-xl border-t border-subtle px-3 py-2.5 transition-colors first:border-t-transparent hover:border-transparent hover:bg-default/60 [&:hover+li]:border-transparent"
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onClick ?? (() => openProfile(user._id))}
      >
        <UserAvatar user={user} size={38} showStatus ringColor="var(--background)" />
        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-sm font-semibold">{user.fullName}</span>
            <span className="hidden truncate text-xs text-muted group-hover:inline">@{user.username}</span>
          </span>
          <span className="block truncate text-xs text-muted">{subtitle}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
    </motion.li>
  );
}
