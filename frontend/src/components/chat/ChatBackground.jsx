import { AnimatePresence, motion } from "motion/react";

// The wallpaper behind the messages. Cross-fades when the background changes.
export default function ChatBackground({ background, customUrl, dim = 0, className = "absolute inset-0" }) {
  const isCustom = background === "custom" && customUrl;
  return (
    <div className={`${className} pointer-events-none overflow-hidden`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={isCustom ? customUrl : background}
          className={`chat-bg absolute inset-0 ${isCustom ? "chat-bg-custom" : `chat-bg-${background}`}`}
          style={isCustom ? { backgroundImage: `url("${customUrl}")` } : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        />
      </AnimatePresence>
      {isCustom && dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim / 100 }} />}
    </div>
  );
}
