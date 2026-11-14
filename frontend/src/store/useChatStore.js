import { create } from "zustand";
import { api } from "../lib/api";
import { useAuthStore } from "./useAuthStore";

const emptyChat = { messages: [], hasMore: false, status: "idle", loadingOlder: false };

const myId = () => useAuthStore.getState().me?._id;

function otherParticipant(message) {
  return message.senderId === myId() ? message.receiverId : message.senderId;
}

function sortByDate(a, b) {
  return new Date(a.createdAt) - new Date(b.createdAt);
}

let tempCounter = 0;
const typingTimers = {};

export const useChatStore = create((set, get) => ({
  conversations: [], // [{ user, lastMessage, unreadCount }]
  conversationsLoaded: false,
  chats: {}, // { [otherUserId]: { messages, hasMore, status, loadingOlder } }
  activeChatId: null,
  typing: {}, // { [userId]: { threadId } }
  // open thread: { rootId, chatId, root, replies, status, originRect }
  thread: null,

  // ---------- helpers ----------
  getChat: (userId) => get().chats[userId] ?? emptyChat,

  patchChat(userId, patch) {
    set((s) => ({
      chats: { ...s.chats, [userId]: { ...(s.chats[userId] ?? emptyChat), ...patch } },
    }));
  },

  // insert or replace a message everywhere it is shown (timeline + open thread)
  upsertMessage(chatId, message, matchKey = message._id) {
    set((s) => {
      const chat = s.chats[chatId];
      const chats = { ...s.chats };
      if (chat) {
        const index = chat.messages.findIndex(
          (m) => m._id === matchKey || m._id === message._id,
        );
        const messages = [...chat.messages];
        if (index === -1) messages.push(message);
        else messages[index] = { ...messages[index], ...message };
        chats[chatId] = { ...chat, messages: messages.sort(sortByDate) };
      }

      let thread = s.thread;
      if (thread && message.parentId && message.parentId === thread.rootId) {
        const index = thread.replies.findIndex(
          (m) => m._id === matchKey || m._id === message._id,
        );
        const replies = [...thread.replies];
        if (index === -1) replies.push(message);
        else replies[index] = { ...replies[index], ...message };
        thread = { ...thread, replies: replies.sort(sortByDate) };
      }
      return { chats, thread };
    });
  },

  applyThreadUpdate(chatId, update) {
    if (!update) return;
    const patch = { replyCount: update.replyCount, lastReplyAt: update.lastReplyAt };
    set((s) => {
      const chat = s.chats[chatId];
      const chats = chat
        ? {
            ...s.chats,
            [chatId]: {
              ...chat,
              messages: chat.messages.map((m) =>
                m._id === update._id ? { ...m, ...patch } : m,
              ),
            },
          }
        : s.chats;
      const thread =
        s.thread?.rootId === update._id && s.thread.root
          ? { ...s.thread, root: { ...s.thread.root, ...patch } }
          : s.thread;
      return { chats, thread };
    });
  },

  bumpConversation(chatId, message, { incrementUnread = false } = {}) {
    const { conversations } = get();
    const existing = conversations.find((c) => c.user._id === chatId);
    if (!existing) {
      get().loadConversations(); // first message with this person: fetch their profile with the list
      return;
    }
    const updated = {
      ...existing,
      lastMessage: message,
      unreadCount: incrementUnread ? existing.unreadCount + 1 : existing.unreadCount,
    };
    set({ conversations: [updated, ...conversations.filter((c) => c !== existing)] });
  },

  // ---------- loading ----------
  async loadConversations() {
    const { data } = await api.get("/messages/conversations");
    set({ conversations: data, conversationsLoaded: true });
  },

  setActiveChat: (userId) => set({ activeChatId: userId }),

  async loadMessages(userId) {
    const chat = get().getChat(userId);
    if (chat.status === "ready" || chat.status === "loading") return;
    get().patchChat(userId, { status: "loading" });
    try {
      const { data } = await api.get(`/messages/${userId}`);
      get().patchChat(userId, {
        messages: data.messages,
        hasMore: data.hasMore,
        status: "ready",
      });
    } catch (err) {
      get().patchChat(userId, { status: "error" });
      throw err;
    }
  },

  async loadOlder(userId) {
    const chat = get().getChat(userId);
    if (!chat.hasMore || chat.loadingOlder || !chat.messages.length) return;
    get().patchChat(userId, { loadingOlder: true });
    try {
      const before = chat.messages[0].createdAt;
      const { data } = await api.get(`/messages/${userId}`, { params: { before } });
      const current = get().getChat(userId);
      get().patchChat(userId, {
        messages: [...data.messages, ...current.messages],
        hasMore: data.hasMore,
        loadingOlder: false,
      });
    } catch {
      get().patchChat(userId, { loadingOlder: false });
    }
  },

  // ---------- sending ----------
  /**
   * Optimistic send: the bubble appears right away with a "sending" state and a local
   * preview of any attachment, then gets swapped for the saved message.
   * `audioMeta` = { duration, waveform, isVoiceNote } for voice notes and audio files.
   */
  async sendMessage({ to, text = "", file = null, parentId = null, audioMeta = null }) {
    const tempId = `temp-${Date.now()}-${tempCounter++}`;
    const localUrl = file ? URL.createObjectURL(file) : null;
    const isAudio = file && (audioMeta || file.type.startsWith("audio/"));

    const temp = {
      _id: tempId,
      clientKey: tempId,
      senderId: myId(),
      receiverId: to,
      text: text.trim() || undefined,
      parentId,
      createdAt: new Date().toISOString(),
      status: "sending",
      progress: 0,
      isNew: true,
      image: !isAudio && file?.type.startsWith("image/") ? localUrl : undefined,
      video: !isAudio && file?.type.startsWith("video/") ? localUrl : undefined,
      audio: isAudio
        ? {
            url: localUrl,
            duration: audioMeta?.duration ?? 0,
            waveform: audioMeta?.waveform ?? [],
            isVoiceNote: !!audioMeta?.isVoiceNote,
            fileName: file.name,
          }
        : undefined,
      retry: { to, text, file, parentId, audioMeta },
    };
    get().upsertMessage(to, temp);
    get().bumpConversation(to, temp);

    const form = new FormData();
    if (text.trim()) form.append("text", text.trim());
    if (parentId) form.append("parentId", parentId);
    if (file) form.append("media", file);
    if (audioMeta) {
      form.append("duration", String(audioMeta.duration ?? 0));
      form.append("waveform", JSON.stringify(audioMeta.waveform ?? []));
      form.append("isVoiceNote", String(!!audioMeta.isVoiceNote));
    }

    try {
      const { data } = await api.post(`/messages/send/${to}`, form, {
        onUploadProgress: file
          ? (e) => {
              if (e.total)
                get().upsertMessage(to, { _id: tempId, progress: e.loaded / e.total });
            }
          : undefined,
      });
      // keep the temp key so React doesn't remount (and re-animate) the bubble
      const saved = {
        ...data.message,
        clientKey: tempId,
        isNew: true,
        status: undefined,
        progress: undefined,
        retry: undefined,
      };
      // keep showing the local file until the remote one has loaded, to avoid a flash
      if (localUrl) saved.localUrl = localUrl;
      get().upsertMessage(to, saved, tempId);
      get().applyThreadUpdate(to, data.threadUpdate);
      get().bumpConversation(to, saved);
    } catch (err) {
      get().upsertMessage(to, {
        _id: tempId,
        status: "failed",
        error: err?.response?.data?.message ?? "Couldn't send",
      });
    }
  },

  async retryMessage(chatId, tempId) {
    const message = get().getChat(chatId).messages.find((m) => m._id === tempId);
    if (!message?.retry) return;
    get().discardMessage(chatId, tempId);
    await get().sendMessage(message.retry);
  },

  discardMessage(chatId, tempId) {
    set((s) => {
      const chat = s.chats[chatId];
      if (!chat) return {};
      return {
        chats: {
          ...s.chats,
          [chatId]: { ...chat, messages: chat.messages.filter((m) => m._id !== tempId) },
        },
        thread: s.thread
          ? { ...s.thread, replies: s.thread.replies.filter((m) => m._id !== tempId) }
          : s.thread,
      };
    });
  },

  // ---------- seen receipts ----------
  async markSeen(chatId) {
    const conversation = get().conversations.find((c) => c.user._id === chatId);
    const chat = get().getChat(chatId);
    const hasUnseen =
      conversation?.unreadCount > 0 ||
      chat.messages.some((m) => m.senderId === chatId && !m.seen);
    if (!hasUnseen) return;

    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.user._id === chatId ? { ...c, unreadCount: 0 } : c,
      ),
      chats: {
        ...s.chats,
        [chatId]: {
          ...chat,
          messages: chat.messages.map((m) =>
            m.senderId === chatId ? { ...m, seen: true } : m,
          ),
        },
      },
    }));
    try {
      await api.patch(`/messages/${chatId}/seen`);
    } catch {
      /* not critical */
    }
  },

  // ---------- threads ----------
  async openThread(message, originRect = null) {
    const chatId = otherParticipant(message);
    const rootId = message.parentId ?? message._id;
    const loaded = get().getChat(chatId).messages;
    const root = loaded.find((m) => m._id === rootId) ?? (message.parentId ? null : message);

    set({
      thread: {
        rootId,
        chatId,
        root,
        replies: loaded.filter((m) => m.parentId === rootId),
        status: "loading",
        originRect,
      },
    });

    try {
      const { data } = await api.get(`/messages/thread/${rootId}`);
      set((s) => {
        if (s.thread?.rootId !== rootId) return {};
        // keep replies that are still uploading
        const pending = s.thread.replies.filter((m) => m.status);
        return {
          thread: {
            ...s.thread,
            root: s.thread.root ?? data.root,
            replies: [...data.replies, ...pending].sort(sortByDate),
            status: "ready",
          },
        };
      });
    } catch {
      set((s) => (s.thread?.rootId === rootId ? { thread: { ...s.thread, status: "error" } } : {}));
    }
  },

  // Closing is two steps: `closing` starts the exit animation (the root bubble flies back),
  // then the panel calls finishCloseThread once it has landed, which un-hides the original bubble.
  closeThread: () => set((s) => (s.thread ? { thread: { ...s.thread, closing: true } } : {})),

  finishCloseThread(rootId) {
    set((s) => (s.thread?.rootId === rootId && s.thread.closing ? { thread: null } : {}));
  },

  resetThread: () => set({ thread: null }),

  // ---------- socket events ----------
  onNewMessage({ message, threadUpdate }) {
    const chatId = otherParticipant(message);
    const fromMe = message.senderId === myId();
    const chat = get().chats[chatId];

    const alreadyHave = chat?.messages.some((m) => m._id === message._id);
    // our own message echoed back before the POST resolved: the POST handler will swap it in
    const pendingEcho =
      fromMe &&
      chat?.messages.some(
        (m) =>
          m.status === "sending" &&
          (m.text ?? "") === (message.text ?? "") &&
          (m.parentId ?? null) === (message.parentId ?? null),
      );

    if (!alreadyHave && !pendingEcho) {
      if (chat?.status === "ready") get().upsertMessage(chatId, { ...message, isNew: true });
      const viewing = get().activeChatId === chatId && !document.hidden;
      get().bumpConversation(chatId, message, { incrementUnread: !fromMe && !viewing });
    }
    get().applyThreadUpdate(chatId, threadUpdate);
    if (!fromMe) get().onTyping({ from: chatId, isTyping: false });
  },

  onMessagesSeen({ by }) {
    set((s) => {
      const chat = s.chats[by];
      return {
        chats: chat
          ? {
              ...s.chats,
              [by]: {
                ...chat,
                messages: chat.messages.map((m) =>
                  m.receiverId === by ? { ...m, seen: true } : m,
                ),
              },
            }
          : s.chats,
        conversations: s.conversations.map((c) =>
          c.user._id === by && c.lastMessage?.senderId !== by
            ? { ...c, lastMessage: { ...c.lastMessage, seen: true } }
            : c,
        ),
      };
    });
  },

  onTyping({ from, isTyping, threadId = null }) {
    clearTimeout(typingTimers[from]);
    set((s) => {
      const typing = { ...s.typing };
      if (isTyping) typing[from] = { threadId };
      else delete typing[from];
      return { typing };
    });
    // in case the "stopped typing" event never arrives
    if (isTyping) typingTimers[from] = setTimeout(() => get().onTyping({ from, isTyping: false }), 6000);
  },
}));
