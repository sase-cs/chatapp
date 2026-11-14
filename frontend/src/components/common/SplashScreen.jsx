import { motion } from "motion/react";
import Logo from "./Logo";

export default function SplashScreen({ children }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <motion.div
          animate={children ? {} : { scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Logo size={56} />
        </motion.div>
      </motion.div>
      {children}
    </div>
  );
}
