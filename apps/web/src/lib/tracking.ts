import type { TrackingIds } from "@primegear/shared";
import { uuid } from "./utils";

// ───────────── Attribution capture ─────────────
// fbclid / ttclid arrive on the landing URL; the pixels set _fbp / _fbc / _ttp / _ga cookies.
// All of it is saved on the Order at checkout so the server-side events can be matched.

const STORE_KEY = "pg_attribution";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

type Stored = { fbclid?: string; ttclid?: string; at: number };

const readStored = (): Stored | null => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const v = raw ? (JSON.parse(raw) as Stored) : null;
    return v && Date.now() - v.at < TTL_MS ? v : null;
  } catch {
    return null;
  }
};

/** Call once per page load: remembers click ids from the landing URL. */
export function captureAttribution() {
  try {
    const q = new URLSearchParams(location.search);
    const fbclid = q.get("fbclid") ?? undefined;
    const ttclid = q.get("ttclid") ?? undefined;
    if (!fbclid && !ttclid) return;
    const prev = readStored();
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        fbclid: fbclid ?? prev?.fbclid,
        ttclid: ttclid ?? prev?.ttclid,
        at: Date.now(),
      }),
    );
  } catch {
    /* storage blocked: attribution is best-effort */
  }
}

const cookie = (name: string) => {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
};

/** Everything the Order stores for ad-platform matching. Missing values stay undefined (never ""). */
export function getTrackingIds(): TrackingIds {
  const stored = readStored();
  const fbclid = stored?.fbclid;
  const fbp = cookie("_fbp");
  // _fbc is derived from fbclid when the pixel hasn't set the cookie yet
  const fbc = cookie("_fbc") ?? (fbclid ? `fb.1.${stored!.at}.${fbclid}` : undefined);
  // _ga looks like GA1.1.1234567890.1700000000: the client id is the last two parts
  const ga = cookie("_ga")?.split(".").slice(-2).join(".");
  return {
    fbclid,
    fbp,
    fbc,
    ttclid: stored?.ttclid,
    ttp: cookie("_ttp"),
    gaClientId: ga || undefined,
  };
}

// ───────────── dataLayer ─────────────

type DataLayerWindow = Window & { dataLayer?: unknown[] };

/** Recursively drops undefined, null and empty strings: tracking payloads never carry empty values. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, clean(v)]),
    ) as T;
  }
  return value;
}

export const newEventId = (prefix: string) => `${prefix}_${uuid()}`;

/**
 * The one tracking helper: pushes a GA4-style event to window.dataLayer (GTM -> Cloudflare server-side
 * tracking does the rest). Pass `eventId` when the server also reports the event, so platforms dedupe.
 */
export function track(event: string, payload: Record<string, unknown> = {}, eventId?: string) {
  const w = window as DataLayerWindow;
  const id = eventId ?? newEventId(event);
  (w.dataLayer ??= []).push(clean({ event, event_id: id, ...payload }));
  return id;
}
