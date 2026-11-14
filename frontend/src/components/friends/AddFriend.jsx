import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Button, toast } from "@heroui/react";
import { Check, Clock, MessageCircle, UserPlus } from "lucide-react";
import FriendRow from "./FriendRow";
import { api, errorMessage } from "../../lib/api";
import { useFriendsStore } from "../../store/useFriendsStore";

// Search results update as you type, after a short pause.
function useUserSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/users/search", { params: { q } });
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  // short queries show nothing, without needing to clear state
  return { results: q.length < 2 ? [] : results, setResults, loading: q.length >= 2 && loading };
}

export default function AddFriend() {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState(null); // { ok, text }
  const [sending, setSending] = useState(false);
  const { results, setResults, loading } = useUserSearch(query);
  const { sendRequest, accept } = useFriendsStore.getState();
  const navigate = useNavigate();

  const setRelationship = (userId, relationship) =>
    setResults((list) => list.map((u) => (u._id === userId ? { ...u, relationship } : u)));

  const submit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSending(true);
    try {
      const data = await sendRequest({ username: query.trim() });
      setFeedback({
        ok: true,
        text:
          data.status === "accepted"
            ? `You and ${data.user.fullName} are now friends!`
            : `Success! Your friend request to @${data.request.user.username} was sent.`,
      });
      setQuery("");
    } catch (err) {
      setFeedback({ ok: false, text: errorMessage(err, "Couldn't send friend request") });
    } finally {
      setSending(false);
    }
  };

  const addFromResults = async (user) => {
    try {
      const data = await sendRequest({ userId: user._id });
      setRelationship(
        user._id,
        data.status === "accepted" ? { status: "friend" } : { status: "outgoing", requestId: data.request._id },
      );
    } catch (err) {
      toast.danger(errorMessage(err, "Couldn't send friend request"));
    }
  };

  const actionFor = (user) => {
    const { status, requestId } = user.relationship;
    if (status === "friend")
      return (
        <Button size="sm" variant="secondary" onPress={() => navigate(`/chat/${user._id}`)}>
          <MessageCircle size={15} /> Message
        </Button>
      );
    if (status === "outgoing")
      return (
        <Button size="sm" variant="ghost" isDisabled>
          <Clock size={15} /> Pending
        </Button>
      );
    if (status === "incoming")
      return (
        <Button
          size="sm"
          onPress={async () => {
            await accept(requestId);
            setRelationship(user._id, { status: "friend" });
          }}
        >
          <Check size={15} /> Accept
        </Button>
      );
    return (
      <Button size="sm" onPress={() => addFromResults(user)}>
        <UserPlus size={15} /> Add
      </Button>
    );
  };

  return (
    <div>
      <h2 className="text-base font-semibold">Add a friend</h2>
      <p className="mt-1 text-sm text-muted">Type their username or name. Only friends can message each other.</p>

      <form
        onSubmit={submit}
        className={`mt-4 flex items-center gap-2 rounded-2xl border bg-surface py-2 pr-2 pl-4 transition-colors focus-within:border-accent ${
          feedback ? (feedback.ok ? "border-success" : "border-danger") : "border-subtle"
        }`}
      >
        <span className="text-muted">@</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFeedback(null);
          }}
          placeholder="username"
          autoComplete="off"
          spellCheck={false}
          className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        <Button type="submit" isDisabled={!query.trim()} isPending={sending}>
          Send Request
        </Button>
      </form>

      <AnimatePresence>
        {feedback && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-2 text-sm ${feedback.ok ? "text-success" : "text-danger"}`}
          >
            {feedback.text}
          </motion.p>
        )}
      </AnimatePresence>

      {(results.length > 0 || loading) && (
        <div className="mt-8">
          <h3 className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
            {loading ? "Searching…" : "People"}
          </h3>
          <ul>
            <AnimatePresence initial={false}>
              {results.map((user, i) => (
                <FriendRow
                  key={user._id}
                  index={i}
                  user={user}
                  subtitle={user.bio || `@${user.username}`}
                  actions={actionFor(user)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}
