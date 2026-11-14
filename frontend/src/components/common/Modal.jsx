import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

/**
 * Animated modal: fades the backdrop and springs the panel in.
 * Closes on Escape and on backdrop click; returns focus to whatever was focused before.
 */
export default function Modal({ open, onClose, children, className = "", label, align = "center" }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    // focus the first field, or the panel itself
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector("[data-autofocus], input, textarea") ?? panelRef.current;
      target?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 z-50 flex justify-center p-4 ${align === "top" ? "items-start pt-[12vh]" : "items-center"}`}
        >
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={`relative w-full overflow-hidden rounded-2xl bg-overlay text-overlay-foreground shadow-2xl outline-none ${className}`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
