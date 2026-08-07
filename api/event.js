import { fetchEvent, resolveThumbnailUrl } from "./shared/fetchEvent.js";
import { DEFAULT_META, renderHtml } from "./shared/renderHtml.js";

const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://livestream.storehub.co.in").replace(/\/$/, "");

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

export default async function handler(req, res) {
  const eventId = String(req.query.id || "");
  const slug = String(req.query.slug || "event");

  if (!/^\d+$/.test(eventId)) return res.status(404).send("Not found");

  const url = `${SITE_ORIGIN}/${eventId}/${encodeURIComponent(slug)}`;
  let event = null;

  try {
    event = await fetchEvent(eventId);
  } catch (error) {
    console.error(`Could not load live event ${eventId}:`, error);
  }

  // Keep the SPA usable even if the upstream API is temporarily unavailable.
  const title = firstText(event?.title, event?.event_title) || DEFAULT_META.title;
  const description = firstText(event?.description, event?.subtitle, event?.event_description) || DEFAULT_META.description;
  const image = resolveThumbnailUrl(firstText(event?.thumbnail, event?.thumbnailUrl)) || DEFAULT_META.image;
  const html = await renderHtml({ title, description, image, url, event });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).send(html);
}
