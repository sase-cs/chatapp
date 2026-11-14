import { Button } from "@heroui/react";
import { motion } from "motion/react";

export default function EmptyState({ icon: Icon, title, text, action, compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center text-center ${compact ? "py-10" : "py-20"}`}
    >
      {Icon && (
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={28} />
        </span>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && (
        <Button className="mt-5" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
