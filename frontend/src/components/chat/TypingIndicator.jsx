import { motion } from "motion/react";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{ transformOrigin: "bottom left" }}
      className="mt-2 flex justify-start"
      aria-label="Typing"
    >
      <div className="bubble bubble-in flex items-center gap-1 px-4 py-3">
        <span className="typing-dot h-2 w-2 rounded-full bg-current" />
        <span className="typing-dot h-2 w-2 rounded-full bg-current" />
        <span className="typing-dot h-2 w-2 rounded-full bg-current" />
      </div>
    </motion.div>
  );
}
