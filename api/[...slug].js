export default async function handler(req, res) {
  // This handles crawlers accessing /[eventId]/[slug]
  // Vercel will serve this instead of index.html for crawler requests
  
  const pathname = req.url.split('?')[0]; // Remove query params
  const match = pathname.match(/\/(\d+)\/(.+)$/);
  
  if (!match) {
    // Not an event page, fall back to index.html
    return res.status(404).json({ error: "Not found" });
  }

  const [, eventId, slug] = match;

  try {
    // Fetch event data
    const response = await fetch(
      `https://api.rmtechsolution.com/fetchLiveEvent.php?id=${eventId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error("Event not found");
    }

    const data = response.json ? await response.json() : {};

    // Resolve thumbnail URL
    const THUMBNAIL_BASE_URL = "https://api.rmtechsolution.com/uploads/thumbnails";
    let thumbnailUrl = data.thumbnail || "https://api.rmtechsolution.com/uploads/cms/merchantId_2/1785527012_cms_6a6cfae478fd8.jpeg";
    
    if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
      thumbnailUrl = `${THUMBNAIL_BASE_URL}/${thumbnailUrl}`;
    }

    const eventTitle = data.title || "Livestream Event";
    const eventDescription = data.description || "Join our live event";
    const eventUrl = `https://livestream.storehub.co.in/${eventId}/${slug}`;

    // Return HTML with dynamic meta tags for crawlers
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/livestream.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${eventDescription}" />

    <!-- Open Graph - Dynamic event thumbnail -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${eventTitle}" />
    <meta property="og:description" content="${eventDescription}" />
    <meta property="og:image" content="${thumbnailUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${eventUrl}" />

    <!-- Twitter Card -->
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
    <script>
      // Redirect client browsers to React app after meta tags are loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          // Already loaded via React module
        });
      }
    <\/script>
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
