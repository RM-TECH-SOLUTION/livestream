const API_BASE_URL = "https://api.rmtechsolution.com";
const THUMBNAIL_BASE_URL = `${API_BASE_URL}/uploads/thumbnails`;
const DEFAULT_IMAGE_URL = `${API_BASE_URL}/uploads/cms/merchantId_2/1785527012_cms_6a6cfae478fd8.jpeg`;
const SITE_ORIGIN = "https://livestream.storehub.co.in";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFirstString(values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function resolveThumbnailUrl(assetPath) {
  if (!assetPath) {
    return DEFAULT_IMAGE_URL;
  }

  if (assetPath.startsWith("http")) {
    return assetPath;
  }

  if (assetPath.startsWith("/")) {
    return `${API_BASE_URL}${assetPath}`;
  }

  return `${THUMBNAIL_BASE_URL}/${String(assetPath).replace(/^\/+/, "")}`;
}

function normalizeEventPayload(payload) {
  const event = Array.isArray(payload?.data) ? payload.data[0] : payload?.data || payload?.event || payload;

  if (!event || typeof event !== "object") {
    return null;
  }

  const title = getFirstString([event.title, event.event_title]) || "Livestream Event";
  const subtitle = getFirstString([event.subtitle, event.description, event.event_description]);
  const date = getFirstString([event.event_date, event.eventDate]);
  const time = getFirstString([event.event_time, event.eventTime]);
  const description = subtitle || [date, time].filter(Boolean).join(" ") || "Join our live event";

  return {
    title,
    description,
    thumbnailUrl: resolveThumbnailUrl(getFirstString([event.thumbnail, event.thumbnailUrl]))
  };
}

export default async function handler(req, res) {
  const pathname = req.url.split("?")[0];
  const match = pathname.match(/^\/(?:api\/)?(\d+)\/([^/]+)\/?$/);

  if (!match) {
    return res.status(404).json({ error: "Not found" });
  }

  const [, eventId, slug] = match;

  try {
    const response = await fetch(`${API_BASE_URL}/fetchLiveEvent.php?id=${eventId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Event request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const event = normalizeEventPayload(payload);

    if (!event) {
      throw new Error("Event payload was empty.");
    }

    const eventTitle = escapeHtml(event.title);
    const eventDescription = escapeHtml(event.description);
    const thumbnailUrl = escapeHtml(event.thumbnailUrl);
    const eventUrl = escapeHtml(`${SITE_ORIGIN}/${eventId}/${slug}`);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/livestream.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${eventDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${eventTitle}" />
    <meta property="og:description" content="${eventDescription}" />
    <meta property="og:image" content="${thumbnailUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${eventUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${eventTitle}" />
    <meta name="twitter:description" content="${eventDescription}" />
    <meta name="twitter:image" content="${thumbnailUrl}" />
    <link rel="apple-touch-icon" href="/livestream.png" />
    <title>${eventTitle}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"><\/script>
  </body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Error fetching event:", error);
    return res.status(500).json({ error: "Failed to generate preview" });
  }
}
