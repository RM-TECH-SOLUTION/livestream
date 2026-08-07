import { DEFAULT_META, renderHtml } from "./shared/renderHtml.js";

const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://livestream.storehub.co.in";

export default async function handler(_req, res) {
  const html = await renderHtml({ ...DEFAULT_META, url: SITE_ORIGIN });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
