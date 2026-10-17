// Admin date/time display, always on Bangladesh time whatever the device's zone.

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dateOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "17 Oct, 10:42 am" */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
/** "17 Oct 2026" */
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));
/** "10:42 am" */
export const formatTime = (iso: string) => timeOnly.format(new Date(iso));

/** "just now", "12 min ago", "3 h ago", "2 days ago". Pair with suppressHydrationWarning. */
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/** Whole days since `iso` */
export const daysSince = (iso: string, now = Date.now()) =>
  Math.floor((now - new Date(iso).getTime()) / 86_400_000);

export const orderHref = (id: string) => `/admin/orders/${id}/`;

/** tel: link with the country code, so it dials from any SIM */
export const telHref = (phone: string) => `tel:+88${phone}`;
