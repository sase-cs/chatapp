import { useEffect, useState } from "react";
import { useLocation, useOutlet } from "react-router";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Toast } from "@heroui/react";
import Sidebar from "../sidebar/Sidebar";
import SettingsOverlay from "../settings/SettingsOverlay";
import ProfileModal from "../profile/ProfileModal";
import MediaLightbox from "../chat/MediaLightbox";
import QuickSwitcher from "../sidebar/QuickSwitcher";
import { useUIStore } from "../../store/useUIStore";
import { useChatStore } from "../../store/useChatStore";
import { APP_NAME } from "../../lib/constants";

// Keeps the browser tab title in sync with the number of unread messages.
function useUnreadTitle() {
  const unread = useChatStore((s) => s.conversations.reduce((sum, c) => sum + c.unreadCount, 0));
  useEffect(() => {
    document.title = unread ? `(${unread}) ${APP_NAME}` : APP_NAME;
  }, [unread]);
}

export default function AppShell() {
  const outlet = useOutlet();
  const location = useLocation();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  useUnreadTitle();

  // close the mobile drawer whenever the page changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  // Ctrl/Cmd + K opens the quick switcher, like Discord and Slack
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSwitcherOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openSwitcher = () => setSwitcherOpen(true);

  return (
    <div className="flex h-full bg-background">
      {/* desktop sidebar */}
      <div className="hidden w-[300px] shrink-0 md:flex">
        {/* separate layout groups so the two sidebars' sliding pills don't animate into each other */}
        <LayoutGroup id="sidebar-desktop">
          <Sidebar onOpenSwitcher={openSwitcher} />
        </LayoutGroup>
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <LayoutGroup id="sidebar-mobile">
                <Sidebar onOpenSwitcher={openSwitcher} />
              </LayoutGroup>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* page area: pages cross-fade with a small slide when you switch between them */}
      <main className="relative min-w-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={location.pathname}
            className="absolute inset-0 flex"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <QuickSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <SettingsOverlay />
      <ProfileModal />
      <MediaLightbox />
      <Toast.Provider placement="bottom end" />
    </div>
  );
}
