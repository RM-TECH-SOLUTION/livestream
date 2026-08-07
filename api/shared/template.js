export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// JSON embedded in a script must not be able to close that script tag.
export function serializeEvent(event) {
  return JSON.stringify(event ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function applyTemplate(template, values) {
  return Object.entries(values).reduce(
    (html, [key, value]) => html.replaceAll(`**${key}**`, String(value ?? "")),
    template
  );
}
