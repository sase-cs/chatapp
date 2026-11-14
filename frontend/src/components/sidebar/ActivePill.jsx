import { motion } from "motion/react";

// Background pill that slides between the active sidebar items.
export default function ActivePill() {
  return (
    <motion.span
      layoutId="sidebar-active"
      className="absolute inset-0 rounded-xl bg-default"
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
    />
  );
}
