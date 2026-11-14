import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { MessageCircle, Search } from "lucide-react";
import Modal from "../common/Modal";
import UserAvatar from "../common/UserAvatar";
import { useFriendsStore } from "../../store/useFriendsStore";
import { useChatStore } from "../../store/useChatStore";

// Ctrl+K: jump to any friend or recent conversation by typing part of a name.
function SwitcherBody({ onClose }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const friends = useFriendsStore((s) => s.friends);
  const conversations = useChatStore((s) => s.conversations);
  const navigate = useNavigate();

  const people = useMemo(() => {
    // recent conversations first, then the remaining friends
    const seen = new Set();
    const all = [];
    for (const c of conversations) {
      seen.add(c.user._id);
      all.push(c.user);
    }
    for (const f of friends) if (!seen.has(f._id)) all.push(f);

    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 8);
    return all
      .filter((u) => u.fullName.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [conversations, friends, query]);

  const go = (user) => {
    navigate(`/chat/${user._id}`);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, people.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && people[index]) {
      go(people[index]);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-subtle px-4">
        <Search size={18} className="text-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Where would you like to go?"
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
      </div>
      <ul className="max-h-80 overflow-y-auto p-2">
        {people.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No one matches “{query}”.</li>}
        {people.map((user, i) => (
          <li key={user._id}>
            <button
              type="button"
              onMouseEnter={() => setIndex(i)}
              onClick={() => go(user)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                i === index ? "bg-default" : ""
              }`}
            >
              <UserAvatar user={user} size={32} showStatus ringColor="var(--overlay)" />
              <span className="flex-1 truncate text-sm font-medium">{user.fullName}</span>
              <span className="text-xs text-muted">@{user.username}</span>
              {i === index && <MessageCircle size={15} className="text-accent" />}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-subtle px-4 py-2 text-[11px] text-muted">
        Use ↑ ↓ to move, Enter to open, Esc to close
      </div>
    </>
  );
}

export default function QuickSwitcher({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} label="Quick switcher" align="top" className="max-w-lg">
      <SwitcherBody onClose={onClose} />
    </Modal>
  );
}
