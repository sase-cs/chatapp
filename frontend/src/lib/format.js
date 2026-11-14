const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const shortDateFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const longDateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const monthYearFmt = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysAgo(date) {
  return Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );
}

export const formatTime = (date) => timeFmt.format(new Date(date));

// sidebar timestamps: "4:12 PM", "Yesterday", "Tue", "Mar 3"
export function formatRelative(date) {
  const d = new Date(date);
  const days = daysAgo(d);
  if (days === 0) return timeFmt.format(d);
  if (days === 1) return "Yesterday";
  if (days < 7) return weekdayFmt.format(d);
  return shortDateFmt.format(d);
}

// day separators in the chat
export function formatDay(date) {
  const d = new Date(date);
  const days = daysAgo(d);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return longDateFmt.format(d);
}

export const formatMonthYear = (date) => monthYearFmt.format(new Date(date));

export function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function formatDuration(seconds = 0) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// one-line preview of a message for the sidebar
export function messagePreview(message) {
  if (!message) return "";
  if (message.text) return message.text;
  if (message.audio?.isVoiceNote) return "Voice message";
  if (message.audio?.url) return "Audio";
  if (message.image) return "Photo";
  if (message.video) return "Video";
  return "Attachment";
}

// stable hue per user, used for avatar fallbacks and profile banners
// (FNV-1a, so ids created a moment apart, which differ only in a few characters, still get different hues)
export function hueFor(id = "") {
  let hash = 0x811c9dc5;
  for (const char of String(id)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 360;
}
