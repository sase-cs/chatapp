import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import { useUIStore } from "../../store/useUIStore";

// Full-screen viewer for photos and videos.
export default function MediaLightbox() {
  const lightbox = useUIStore((s) => s.lightbox);
  const close = useUIStore((s) => s.closeLightbox);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close]);

  return createPortal(
    <AnimatePresence>
      {lightbox && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="absolute top-4 right-4 flex gap-2">
            <a
              href={lightbox.src}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Open original"
            >
              <ExternalLink size={18} />
            </a>
            <button
              type="button"
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.type === "video" ? (
              <video src={lightbox.src} controls autoPlay className="max-h-[85vh] max-w-[90vw] rounded-2xl" />
            ) : (
              <img src={lightbox.src} alt="" className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain" />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
