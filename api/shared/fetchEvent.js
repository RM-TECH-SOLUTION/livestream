const API_BASE_URL = process.env.LIVE_EVENT_API_BASE_URL || "https://api.rmtechsolution.com";
const THUMBNAIL_BASE_URL = `${API_BASE_URL}/uploads/thumbnails`;

function unwrapEvent(payload) {
  const event = Array.isArray(payload?.data) ? payload.data[0] : payload?.data || payload?.event || payload;
  return event && typeof event === "object" ? event : null;
}

export function resolveThumbnailUrl(thumbnail) {
  if (!thumbnail) return "";
  if (/^https?:\/\//i.test(thumbnail)) return thumbnail;
  if (thumbnail.startsWith("/")) return `${API_BASE_URL}${thumbnail}`;
  return `${THUMBNAIL_BASE_URL}/${String(thumbnail).replace(/^\/+/, "")}`;
}

export async function fetchEvent(eventId) {
  if (!/^\d+$/.test(String(eventId))) return null;

  const response = await fetch(`${API_BASE_URL}/fetchLiveEvent.php?id=${encodeURIComponent(eventId)}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) return null;
  return unwrapEvent(await response.json());
}
