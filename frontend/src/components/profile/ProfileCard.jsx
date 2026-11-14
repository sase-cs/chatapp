import { CalendarDays } from "lucide-react";
import UserAvatar from "../common/UserAvatar";
import { formatMonthYear, hueFor } from "../../lib/format";
import { useIsOnline } from "../../store/useSocketStore";
import { useUIStore } from "../../store/useUIStore";

// Banner color is derived from the user id, so every profile looks a little different.
function Banner({ userId, height = 96 }) {
  const hue = hueFor(userId);
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height,
        background: `linear-gradient(135deg, oklch(0.7 0.13 ${hue}), oklch(0.55 0.15 ${hue + 40}))`,
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1.5px)",
          backgroundSize: "14px 14px",
        }}
      />
    </div>
  );
}

export default function ProfileCard({ user, actions, ringColor = "var(--overlay)", children }) {
  const online = useIsOnline(user._id);
  const openProfile = useUIStore((s) => s.openProfile);

  return (
    <div>
      <Banner userId={user._id} />
      <div className="relative px-5">
        <div className="-mt-11 flex items-end justify-between">
          <span className="rounded-full p-1.5" style={{ background: ringColor }}>
            <UserAvatar user={user} size={80} showStatus ringColor={ringColor} />
          </span>
          {actions && <div className="mb-1 flex gap-2">{actions}</div>}
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-semibold tracking-tight">{user.fullName}</h2>
          <p className="text-sm text-muted">
            @{user.username}
            <span className={`ml-2 ${online ? "text-success" : ""}`}>· {online ? "Online" : "Offline"}</span>
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-surface-secondary p-4">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">About me</h3>
          <p className={`mt-1.5 text-sm whitespace-pre-wrap ${user.bio ? "" : "text-muted italic"}`}>
            {user.bio || "No bio yet."}
          </p>
          {user.createdAt && (
            <>
              <h3 className="mt-4 text-[11px] font-semibold tracking-wider text-muted uppercase">Member since</h3>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm">
                <CalendarDays size={14} className="text-muted" />
                {formatMonthYear(user.createdAt)}
              </p>
            </>
          )}
          {user.mutualFriendCount > 0 && (
            <>
              <h3 className="mt-4 text-[11px] font-semibold tracking-wider text-muted uppercase">
                {user.mutualFriendCount} mutual {user.mutualFriendCount === 1 ? "friend" : "friends"}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.mutualFriends.map((f) => (
                  <button
                    key={f._id}
                    type="button"
                    title={f.fullName}
                    onClick={() => openProfile(f._id)}
                    className="rounded-full transition-transform hover:scale-110"
                  >
                    <UserAvatar user={f} size={28} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
