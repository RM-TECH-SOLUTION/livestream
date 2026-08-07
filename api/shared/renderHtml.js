import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { applyTemplate, escapeHtml, serializeEvent } from "./template.js";

const templatePromise = readFile(join(process.cwd(), "dist", "index.html"), "utf8");

export const DEFAULT_META = {
  title: "Live Streaming",
  description: "Join our Live Streaming Platform",
  image: "https://api.rmtechsolution.com/uploads/cms/merchantId_2/1785527012_cms_6a6cfae478fd8.jpeg"
};

export async function renderHtml({ title, description, image, url, event = null }) {
  const template = await templatePromise;
  const safeTitle = escapeHtml(title || DEFAULT_META.title);
  const safeDescription = escapeHtml(description || DEFAULT_META.description);
  const safeImage = escapeHtml(image || DEFAULT_META.image);
  const safeUrl = escapeHtml(url);

  return applyTemplate(template, {
    TITLE: safeTitle,
    DESCRIPTION: safeDescription,
    IMAGE: safeImage,
    URL: safeUrl,
    EVENT: `window.EVENT = ${serializeEvent(event)};`
  });
}
