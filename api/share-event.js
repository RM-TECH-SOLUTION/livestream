import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../src/utils/share.js";

const API_BASE_URL = "https://api.rmtechsolution.com";
const INDEX_HTML_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../index.html");

function getFirstPopulatedValue(values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function resolveImageUrl(imageUrl, baseUrl) {
  if (!imageUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `${baseUrl}${imageUrl}`;
  }

  return `${baseUrl}/${String(imageUrl).replace(/^\/+/, "")}`;
}

function normalizeEventPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const thumbnail = getFirstPopulatedValue([
    payload.thumbnail,
    payload.thumbnailUrl,
    payload.image,
    payload.image_url,
    payload.imageUrl,
    payload.cover,
    payload.cover_image
  ]);

  return {
    id: payload.id ?? payload.apiId ?? "",
    title: payload.title ?? "Live Event",
    subtitle: payload.subtitle ?? payload.description ?? "Join this live event",
    event_date: payload.event_date ?? payload.eventDate ?? "",
    event_time: payload.event_time ?? payload.eventTime ?? "",
    thumbnail,
    template: payload.template ?? payload.event_type ?? payload.type ?? "Live Event"
  };
}

function getBaseUrl(request) {
  const host = request.headers?.host || "localhost:5173";
  const protocol = request.headers?.["x-forwarded-proto"] || request.headers?.["x-forwarded-protocol"] || "https";
  return `${protocol}://${host}`.replace(/\/$/, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildMetaTags({ title, description, image, url, siteName }) {
  return `
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
  `;
}

function injectMetaIntoHtml(html, metaTags, title) {
  const htmlWithTitle = html.replace(/<title>.*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  const headCloseIndex = htmlWithTitle.indexOf("</head>");

  if (headCloseIndex === -1) {
    return htmlWithTitle;
  }

  return `${htmlWithTitle.slice(0, headCloseIndex)}${metaTags}${htmlWithTitle.slice(headCloseIndex)}`;
}

export default async function handler(request, response) {
  const eventId = request.query?.eventId || request.query?.id || "";
  const baseUrl = getBaseUrl(request);
  let eventDetails = {};
  let shareUrl = `${baseUrl}/share`;
  let pageTitle = "Livestream";
  let pageDescription = "Join this live event.";
  let pageImage = "";
  let siteName = baseUrl.replace(/^https?:\/\//, "");

  if (eventId) {
    try {
      const fetchResponse = await fetch(`${API_BASE_URL}/fetchLiveEvent.php?id=${encodeURIComponent(eventId)}`);
      const text = await fetchResponse.text();
      let data = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      const payload = Array.isArray(data?.data) ? data.data[0] : data?.data || data?.event || data;
      eventDetails = normalizeEventPayload(payload);
    } catch {
      eventDetails = {};
    }

    const eventSlug = slugify(`${eventId}-${eventDetails.title || "event"}`);
    shareUrl = `${baseUrl}/share/${eventSlug}`;
    pageTitle = eventDetails.title || pageTitle;
    pageDescription = eventDetails.subtitle
      ? `${eventDetails.subtitle} — ${eventDetails.event_date || ""} ${eventDetails.event_time || ""}`.trim()
      : `Join this live event on ${eventDetails.event_date || ""} at ${eventDetails.event_time || ""}`.trim();
    pageImage = `${baseUrl}/Template1Mobile.png`;
  }

  let html = "";

  try {
    const rawHtml = fs.readFileSync(INDEX_HTML_PATH, "utf8");
    const metaTags = buildMetaTags({
      title: pageTitle,
      description: pageDescription,
      image: pageImage,
      url: shareUrl,
      siteName
    });
    html = injectMetaIntoHtml(rawHtml, metaTags, pageTitle);
  } catch {
    const fallbackMeta = buildMetaTags({
      title: pageTitle,
      description: pageDescription,
      image: pageImage,
      url: shareUrl,
      siteName
    });
    html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />${fallbackMeta}<title>${escapeHtml(pageTitle)}</title></head><body><div id="root"></div></body></html>`;
  }

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.status(200).send(html);
}
