import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Palette, UserRound, X } from "lucide-react";
import AppearanceSettings from "./AppearanceSettings";
import ProfileSettings from "./ProfileSettings";
import { useUIStore } from "../../store/useUIStore";

const SECTIONS = [
  { group: "User settings", items: [{ id: "profile", label: "My Profile", icon: UserRound }] },
  { group: "App settings", items: [{ id: "appearance", label: "Appearance", icon: Palette }] },
];

// Full-screen settings, like Discord: the app scales back while settings scale in.
export default function SettingsOverlay() {
  const open = useUIStore((s) => s.settingsOpen);
  const section = useUIStore((s) => s.settingsSection);
  const setSection = useUIStore((s) => s.setSettingsSection);
  const close = useUIStore((s) => s.closeSettings);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex bg-background"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          {/* section nav */}
          <nav className="hidden w-[min(34%,320px)] shrink-0 justify-end border-r border-subtle bg-sidebar py-14 pr-3 md:flex">
            <div className="w-52">
              {SECTIONS.map(({ group, items }) => (
                <div key={group} className="mb-5">
                  <h3 className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">{group}</h3>
                  {items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSection(id)}
                      className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        section === id ? "text-foreground" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {section === id && (
                        <motion.span
                          layoutId="settings-nav"
                          className="absolute inset-0 rounded-lg bg-default"
                          transition={{ type: "spring", stiffness: 500, damping: 38 }}
                        />
                      )}
                      <Icon size={16} className="relative" />
                      <span className="relative">{label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </nav>

          <div className="scrollbar-thin relative flex-1 overflow-y-auto">
            {/* mobile section switcher */}
            <div className="flex gap-2 px-4 pt-4 md:hidden">
              {SECTIONS.flatMap((s) => s.items).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${section === id ? "bg-default" : "text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-w-2xl px-4 py-8 md:px-10 md:py-14">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={section}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                >
                  {section === "profile" ? <ProfileSettings /> : <AppearanceSettings />}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="fixed top-4 right-4 flex flex-col items-center gap-1 md:top-14 md:right-10">
              <button
                type="button"
                onClick={close}
                aria-label="Close settings"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-subtle text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <X size={18} />
              </button>
              <span className="hidden text-[11px] font-semibold text-muted md:block">ESC</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
