import { useState } from "react";
import { hueFor, initials } from "../../lib/format";
import { useIsOnline } from "../../store/useSocketStore";

/**
 * Round avatar with an initials fallback and an optional online dot.
 * `ringColor` is the color behind the dot, so it looks cut out of the avatar.
 */
export default function UserAvatar({
  user,
  size = 40,
  showStatus = false,
  ringColor = "var(--sidebar)",
  className = "",
}) {
  const [failed, setFailed] = useState(false);
  const online = useIsOnline(user?._id);
  const hue = hueFor(user?._id);
  const dot = Math.max(10, Math.round(size * 0.3));

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {user?.profilePicture && !failed ? (
        <img
          src={user.profilePicture}
          alt=""
          className="h-full w-full rounded-full object-cover"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, oklch(0.72 0.14 ${hue}), oklch(0.55 0.16 ${hue + 30}))`,
            fontSize: size * 0.38,
          }}
        >
          {initials(user?.fullName) || "?"}
        </span>
      )}
      {showStatus && (
        <span
          className="absolute -right-0.5 -bottom-0.5 rounded-full transition-colors duration-300"
          style={{
            width: dot,
            height: dot,
            border: `${Math.max(2, dot * 0.22)}px solid ${ringColor}`,
            background: online ? "var(--success)" : "var(--muted)",
          }}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}
