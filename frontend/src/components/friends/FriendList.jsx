import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AnimatePresence } from "motion/react";
import { toast } from "@heroui/react";
import { MessageCircle, Search, UserMinus, UserPlus } from "lucide-react";
import FriendRow from "./FriendRow";
import IconButton from "../common/IconButton";
import ConfirmDialog from "../common/ConfirmDialog";
import EmptyState from "../common/EmptyState";
import { useFriendsStore } from "../../store/useFriendsStore";
import { useSocketStore } from "../../store/useSocketStore";
import { errorMessage } from "../../lib/api";

export default function FriendList({ onlineOnly = false }) {
  const friends = useFriendsStore((s) => s.friends);
  const loaded = useFriendsStore((s) => s.loaded);
  const remove = useFriendsStore((s) => s.remove);
  const onlineUsers = useSocketStore((s) => s.onlineUsers);
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const [filter, setFilter] = useState("");
  const [removing, setRemoving] = useState(null);

  const visible = friends
    .filter((f) => !onlineOnly || onlineUsers.has(f._id))
    .filter((f) => {
      const q = filter.trim().toLowerCase();
      return !q || f.fullName.toLowerCase().includes(q) || f.username?.includes(q);
    });

  if (loaded && friends.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="No friends yet"
        text="Add someone by their username to start chatting."
        action={{ label: "Add Friend", onPress: () => setParams({ tab: "add" }) }}
      />
    );
  }

  return (
    <>
      <label className="mb-5 flex items-center gap-2 rounded-xl bg-default/70 px-3 focus-within:ring-2 focus-within:ring-focus">
        <Search size={16} className="text-muted" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search"
          className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <h2 className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {onlineOnly ? "Online" : "All friends"} — {visible.length}
      </h2>

      {onlineOnly && visible.length === 0 && !filter ? (
        <EmptyState title="Nobody's online right now" text="Friends show up here when they're active." compact />
      ) : (
        <ul>
          <AnimatePresence initial={false}>
            {visible.map((friend, i) => (
              <FriendRow
                key={friend._id}
                index={i}
                user={friend}
                subtitle={onlineUsers.has(friend._id) ? "Online" : "Offline"}
                actions={
                  <>
                    <IconButton
                      label="Message"
                      icon={MessageCircle}
                      variant="secondary"
                      onPress={() => navigate(`/chat/${friend._id}`)}
                    />
                    <IconButton
                      label="Remove friend"
                      icon={UserMinus}
                      variant="secondary"
                      className="hover:!text-danger"
                      onPress={() => setRemoving(friend)}
                    />
                  </>
                }
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.fullName}?`}
        description="You won't be able to message each other until one of you sends a new friend request. Your chat history stays."
        confirmLabel="Remove friend"
        danger
        onConfirm={async () => {
          try {
            await remove(removing._id);
          } catch (err) {
            toast.danger(errorMessage(err, "Couldn't remove friend"));
          }
        }}
      />
    </>
  );
}
