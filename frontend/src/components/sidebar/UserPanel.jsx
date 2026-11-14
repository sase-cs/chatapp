import { useClerk } from "@clerk/react";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import UserAvatar from "../common/UserAvatar";
import IconButton from "../common/IconButton";
import { useAuthStore } from "../../store/useAuthStore";
import { useUIStore } from "../../store/useUIStore";
import { resolveColorMode } from "../../lib/theme";

// Discord-style panel at the bottom of the sidebar.
export default function UserPanel() {
  const me = useAuthStore((s) => s.me);
  const colorMode = useAuthStore((s) => s.preferences.colorMode);
  const updatePreferences = useAuthStore((s) => s.updatePreferences);
  const openProfile = useUIStore((s) => s.openProfile);
  const openSettings = useUIStore((s) => s.openSettings);
  const { signOut } = useClerk();

  const isDark = resolveColorMode(colorMode) === "dark";

  return (
    <div className="flex items-center gap-1 border-t border-subtle px-2.5 py-2.5">
      <button
        type="button"
        onClick={() => openProfile(me._id)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-default/60"
      >
        <UserAvatar user={me} size={36} showStatus />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{me.fullName}</span>
          <span className="block truncate text-xs text-muted">@{me.username}</span>
        </span>
      </button>
      <IconButton
        label={isDark ? "Light mode" : "Dark mode"}
        icon={isDark ? Sun : Moon}
        placement="top"
        onPress={() => updatePreferences({ colorMode: isDark ? "light" : "dark" }).catch(() => {})}
      />
      <IconButton label="Settings" icon={Settings} placement="top" onPress={() => openSettings("appearance")} />
      <IconButton label="Sign out" icon={LogOut} placement="top" onPress={() => signOut()} />
    </div>
  );
}
