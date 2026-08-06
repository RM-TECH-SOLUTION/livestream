const API_BASE_URL = "https://api.rmtechsolution.com";
const THUMBNAIL_BASE_URL = `${API_BASE_URL}/uploads/thumbnails`;
const DEFAULT_IMAGE_URL = `${API_BASE_URL}/uploads/cms/merchantId_2/1785527012_cms_6a6cfae478fd8.jpeg`;
const DEFAULT_TITLE = "Livestream Event";
const DEFAULT_DESCRIPTION = "Join our live event";
const SITE_ORIGIN = "https://livestream.storehub.co.in";

const CRAWLER_USER_AGENT_PATTERN =/(facebookexternalhit|Facebot|WhatsApp|Twitterbot|Xbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|SkypeUriPreview|Googlebot|bingbot|DuckDuckBot|Yahoo! Slurp|embedly|quora link preview|pinterest|vkShare|W3C_Validator|Meta-ExternalAgent|meta-externalagent|facebookcatalog)/i;
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

  const title = getFirstString([event.title, event.event_title]) || DEFAULT_TITLE;
  const subtitle = getFirstString([event.subtitle, event.description, event.event_description]);
  const eventDate = getFirstString([event.event_date, event.eventDate]);
  const eventTime = getFirstString([event.event_time, event.eventTime]);
  const description = subtitle || [eventDate, eventTime].filter(Boolean).join(" ") || DEFAULT_DESCRIPTION;

  return {
    title,
    description,
    thumbnailUrl: resolveThumbnailUrl(getFirstString([event.thumbnail, event.thumbnailUrl]))
  };
}

function isCrawlerRequest(req) {
  const userAgent = String(req.headers["user-agent"] || "");
  return CRAWLER_USER_AGENT_PATTERN.test(userAgent);
}


function buildMetaHtml({ title, description, image, url }) {
  const safeTitle = escapeHtml(title || DEFAULT_TITLE);
  const safeDescription = escapeHtml(description || DEFAULT_DESCRIPTION);
  const safeImage = escapeHtml(image || DEFAULT_IMAGE_URL);
  const safeUrl = escapeHtml(url || SITE_ORIGIN);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#000000" />
<meta name="description" content="${safeDescription}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:image" content="${safeImage}" />
<meta property="og:image:secure_url" content="${safeImage}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${safeUrl}" />
<meta property="og:site_name" content="Livestream" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
<meta name="twitter:image" content="${safeImage}" />
    <title>${safeTitle}</title>
  </head>
  <body>
    <noscript>Open this page in a browser to continue.</noscript>
  </body>
</html>`;
}


export default async function handler(req, res) {
  const eventId = String(req.query.eventId || "");
const eventSlug = String(req.query.slug || "event");

  if (!/^\d+$/.test(eventId)) {
    return res.status(404).send("Not found");
  }

  const spaEventUrl = `${SITE_ORIGIN}/${eventId}/${encodeURIComponent(eventSlug)}`;

  // If a browser directly hits this function route, serve the SPA HTML directly
  // (redirecting back to spaEventUrl would cause an infinite loop via Vercel rewrites).
  const previewMode = req.query.preview === "1";

if (!isCrawlerRequest(req) && !previewMode) {
  try {
    const spaRes = await fetch(`${SITE_ORIGIN}/`);
    const html = await spaRes.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(html);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, spaEventUrl);
  }
}

  let meta = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE_URL,
    url: spaEventUrl
  };

  try {
    const response = await fetch(`${API_BASE_URL}/fetchLiveEvent.php?id=${eventId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (response.ok) {
      const payload = await response.json();
      const event = normalizeEventPayload(payload);

      if (event) {
        meta = {
          title: event.title,
          description: event.description,
          image: event.thumbnailUrl,
          url: spaEventUrl
        };
      }
    }
  } catch (error) {
    console.error("Dynamic meta fetch failed:", error);
  }
res.setHeader("Content-Type", "text/html; charset=utf-8");
res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=3600");
  return res.status(200).send(buildMetaHtml(meta));
}
