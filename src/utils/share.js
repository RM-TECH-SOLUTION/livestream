function normalizeShareText(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return String(value || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "event";
}

function buildShareMessage(eventDetails, shareUrl) {
  const title = normalizeShareText(eventDetails?.title) || "Live Event";
  return shareUrl ? `${title}\n${shareUrl}` : title;
}

function buildSharePageHtml(eventDetails, shareUrl) {
  const title = normalizeShareText(eventDetails?.title) || "Live Event";
  const description = normalizeShareText(eventDetails?.subtitle || eventDetails?.description || "Join this live event");
  const thumbnail = normalizeShareText(eventDetails?.thumbnail || eventDetails?.thumbnailUrl || eventDetails?.image || eventDetails?.image_url || eventDetails?.imageUrl);
  const eventType = normalizeShareText(eventDetails?.template || eventDetails?.event_type || eventDetails?.type || "Live Event");
  const eventDate = normalizeShareText(eventDetails?.event_date);
  const eventTime = normalizeShareText(eventDetails?.event_time);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="canonical" href="${shareUrl}" />
    <meta property="og:url" content="${shareUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="${thumbnail}" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="og:site_name" content="Livestream" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${thumbnail}" />
    <meta name="twitter:image:alt" content="${title}" />
    <meta name="event:type" content="${eventType}" />
  </head>
  <body>
    <article>
      <img src="${thumbnail}" alt="${title}" style="width:240px;height:auto;display:block;margin-bottom:16px;" />
      <h1>${title}</h1>
      <p>${description}</p>
      <p><strong>Date:</strong> ${eventDate}</p>
      <p><strong>Time:</strong> ${eventTime}</p>
      <p><strong>Link:</strong> <a href="${shareUrl}">${shareUrl}</a></p>
    </article>
  </body>
</html>`;
}

export { buildShareMessage, buildSharePageHtml, slugify };
