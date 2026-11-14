import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Users } from "lucide-react";
import PageHeader from "../layout/PageHeader";
import FriendList from "./FriendList";
import PendingRequests from "./PendingRequests";
import AddFriend from "./AddFriend";
import { useFriendsStore } from "../../store/useFriendsStore";

const TABS = [
  { id: "online", label: "Online" },
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "add", label: "Add Friend" },
];

export default function FriendsPage() {
  const [params, setParams] = useSearchParams();
  const pendingCount = useFriendsStore((s) => s.incoming.length);
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "online";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader>
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <Users size={18} className="text-muted" />
          Friends
        </span>
        <span className="mx-1 hidden h-5 w-px bg-separator sm:block" />
        {/* tabs with a pill that slides to the selected one */}
        <nav className="scrollbar-thin flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => {
            const selected = t.id === tab;
            const isAdd = t.id === "add";
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setParams(t.id === "online" ? {} : { tab: t.id }, { replace: true })}
                className={`relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isAdd
                    ? selected
                      ? "text-accent"
                      : "bg-accent text-accent-foreground hover:bg-accent-hover"
                    : selected
                      ? "text-foreground"
                      : "text-muted hover:text-foreground"
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="friends-tab"
                    className={`absolute inset-0 rounded-lg ${isAdd ? "bg-accent-soft" : "bg-default"}`}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {t.label}
                  {t.id === "pending" && pendingCount > 0 && (
                    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
                      {pendingCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </PageHeader>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="scrollbar-thin absolute inset-0 overflow-y-auto px-4 py-5 md:px-8"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <div className="mx-auto max-w-3xl">
              {tab === "online" && <FriendList onlineOnly />}
              {tab === "all" && <FriendList />}
              {tab === "pending" && <PendingRequests />}
              {tab === "add" && <AddFriend />}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
