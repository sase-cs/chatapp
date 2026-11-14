import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Play } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { api } from "../../lib/api";
import { useChatStore } from "../../store/useChatStore";
import { useUIStore } from "../../store/useUIStore";

const EMPTY = [];

// Photos and videos from the loaded part of the conversation, newest first.
function SharedMedia({ chatId }) {
  const messages = useChatStore((s) => s.chats[chatId]?.messages ?? EMPTY);
  const openLightbox = useUIStore((s) => s.openLightbox);
  const media = messages.filter((m) => (m.image || m.video) && !m.status).reverse().slice(0, 9);

  return (
    <div className="mt-4 rounded-xl bg-surface-secondary p-4">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">Shared media</h3>
      {media.length === 0 ? (
        <p className="mt-1.5 text-sm text-muted">Photos and videos you share show up here.</p>
      ) : (
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {media.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => openLightbox({ type: m.image ? "image" : "video", src: m.image ?? m.video })}
              className="group relative aspect-square overflow-hidden rounded-lg bg-default"
            >
              {m.image ? (
                <img src={m.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <>
                  <video src={m.video} preload="metadata" muted className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                    <Play size={18} fill="currentColor" />
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Right-hand panel in a chat, like Discord's DM profile panel. Slides open and closed.
export default function ProfilePanel({ userId, partner }) {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/users/${userId}`)
      .then(({ data }) => !cancelled && setDetails(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className="shrink-0 overflow-hidden border-l border-subtle bg-sidebar"
    >
      <div className="scrollbar-thin h-full w-[320px] overflow-y-auto pb-6">
        <ProfileCard user={details ? { ...partner, ...details } : partner} ringColor="var(--sidebar)">
          <SharedMedia chatId={userId} />
        </ProfileCard>
      </div>
    </motion.aside>
  );
}
