import { APP_NAME } from "../../lib/constants";

// Two chat bubbles joined by a thread line, drawn in the accent color.
export default function Logo({ size = 32, withName = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="var(--accent)" />
        <path
          d="M11 13.5a4.5 4.5 0 0 1 4.5-4.5h9a4.5 4.5 0 0 1 0 9H17l-3.5 3v-3.2A4.5 4.5 0 0 1 11 13.5Z"
          fill="var(--accent-foreground)"
        />
        <path
          d="M29 26.5a4.5 4.5 0 0 0-4.5-4.5h-7a4.5 4.5 0 0 0 0 9H23l3.5 2.8v-3a4.5 4.5 0 0 0 2.5-4.3Z"
          fill="var(--accent-foreground)"
          opacity="0.55"
        />
      </svg>
      {withName && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">{APP_NAME}</span>
      )}
    </span>
  );
}
