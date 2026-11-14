import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Button, Spinner, toast } from "@heroui/react";
import { Clock, Palette, PanelRight, UserPlus, UserX } from "lucide-react";
import PageHeader from "../layout/PageHeader";
import UserAvatar from "../common/UserAvatar";
import IconButton from "../common/IconButton";
import EmptyState from "../common/EmptyState";
import ChatBackground from "./ChatBackground";
import MessageList from "./MessageList";
import Composer from "./Composer";
import ThreadPanel from "./ThreadPanel";
import ChatBackgroundDialog from "./ChatBackgroundDialog";
import ProfilePanel from "../profile/ProfilePanel";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import { useUIStore } from "../../store/useUIStore";
import { useIsOnline } from "../../store/useSocketStore";
import { useChatPartner } from "../../hooks/useChatPartner";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { backgroundFor } from "../../lib/backgrounds";
import { errorMessage } from "../../lib/api";

function ChatStatus({ partner }) {
  const online = useIsOnline(partner._id);
  const typing = useChatStore((s) => !!s.typing[partner._id]);
  const label = typing ? "typing…" : online ? "Online" : "Offline";
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={label}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.15 }}
        className={`block text-xs ${typing ? "font-medium text-accent" : online ? "text-success" : "text-muted"}`}
      >
        {label}
      </motion.span>
    </AnimatePresence>
  );
}

// Shown instead of the composer when you're not friends (anymore).
function NotFriendsBar({ partner }) {
  const outgoing = useFriendsStore((s) => s.outgoing.find((r) => r.user._id === partner._id));
  const incoming = useFriendsStore((s) => s.incoming.find((r) => r.user._id === partner._id));
  const { sendRequest, accept } = useFriendsStore.getState();
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.danger(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="m-3 flex flex-wrap items-center gap-3 rounded-2xl border border-subtle bg-surface px-4 py-3 md:m-6">
      <UserX size={18} className="text-muted" />
      <p className="flex-1 text-sm text-muted">
        You need to be friends with {partner.fullName.split(" ")[0]} to send messages.
      </p>
      {incoming ? (
        <Button size="sm" isPending={busy} onPress={() => run(() => accept(incoming._id))}>
          Accept request
        </Button>
      ) : outgoing ? (
        <Button size="sm" variant="secondary" isDisabled>
          <Clock size={14} /> Request sent
        </Button>
      ) : (
        <Button size="sm" isPending={busy} onPress={() => run(() => sendRequest({ userId: partner._id }))}>
          <UserPlus size={14} /> Add friend
        </Button>
      )}
    </div>
  );
}

function Conversation({ userId, partner }) {
  const chat = useChatStore((s) => s.chats[userId]);
  const showThread = useChatStore((s) => s.thread && !s.thread.closing && s.thread.chatId === userId);
  const threadRootId = useChatStore((s) => s.thread?.rootId);
  const canMessage = useAuthStore((s) => s.me.friends?.includes(userId));
  const preferences = useAuthStore((s) => s.preferences);
  const profilePanelOpen = useUIStore((s) => s.profilePanelOpen);
  const toggleProfilePanel = useUIStore((s) => s.toggleProfilePanel);
  const openProfile = useUIStore((s) => s.openProfile);
  const wide = useMediaQuery("(min-width: 1180px)");
  const [bgDialog, setBgDialog] = useState(false);

  const { loadMessages, markSeen, setActiveChat, resetThread } = useChatStore.getState();

  useEffect(() => {
    setActiveChat(userId);
    loadMessages(userId).catch(() => toast.danger("Couldn't load messages"));
    return () => {
      if (useChatStore.getState().activeChatId === userId) setActiveChat(null);
      if (useChatStore.getState().thread?.chatId === userId) resetThread();
    };
  }, [userId, loadMessages, setActiveChat, resetThread]);

  // mark messages as seen while the chat is open and the tab is visible
  const messageCount = chat?.messages.length ?? 0;
  const ready = chat?.status === "ready";
  useEffect(() => {
    if (!ready) return;
    const check = () => !document.hidden && markSeen(userId);
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [ready, messageCount, userId, markSeen]);

  const background = backgroundFor(preferences, userId);

  return (
    <div className="flex min-w-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <PageHeader
          actions={
            <>
              <IconButton label="Chat background" icon={Palette} onPress={() => setBgDialog(true)} />
              <IconButton
                label={wide ? (profilePanelOpen ? "Hide profile" : "Show profile") : "View profile"}
                icon={PanelRight}
                active={wide && profilePanelOpen}
                onPress={() => (wide ? toggleProfilePanel() : openProfile(userId))}
              />
            </>
          }
        >
          <button type="button" onClick={() => openProfile(userId)} className="flex min-w-0 items-center gap-3 text-left">
            <UserAvatar user={partner} size={34} showStatus ringColor="var(--background)" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{partner.fullName}</span>
              <ChatStatus partner={partner} />
            </span>
          </button>
        </PageHeader>

        {/* messages + composer; the thread panel covers both */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <ChatBackground
            background={background}
            customUrl={preferences.customBackgroundUrl}
            dim={preferences.backgroundDim}
          />
          <div className="relative min-h-0 flex-1">
            {!chat || chat.status === "loading" ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <MessageList chatId={userId} partner={partner} />
            )}
          </div>
          <div className="relative">
            {canMessage ? <Composer to={userId} placeholder={`Message ${partner.fullName.split(" ")[0]}`} /> : <NotFriendsBar partner={partner} />}
          </div>

          <AnimatePresence>
            {showThread && <ThreadPanel key={threadRootId} rootId={threadRootId} partner={partner} />}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {wide && profilePanelOpen && <ProfilePanel key="profile" userId={userId} partner={partner} />}
      </AnimatePresence>

      <ChatBackgroundDialog open={bgDialog} onClose={() => setBgDialog(false)} partner={partner} />
    </div>
  );
}

export default function ChatView() {
  const { userId } = useParams();
  const partner = useChatPartner(userId);

  if (partner === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (partner === null) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader />
        <EmptyState icon={UserX} title="User not found" text="This account may have been deleted." />
      </div>
    );
  }
  return <Conversation userId={userId} partner={partner} />;
}
