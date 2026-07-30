function getDefaultChatUrl() {
  if (import.meta.env.DEV) {
    return "ws://localhost:8787/ws";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function normalizeWebSocketUrl(value) {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) {
    return getDefaultChatUrl();
  }

  if (trimmedValue.startsWith("http://")) {
    return `ws://${trimmedValue.slice("http://".length)}`;
  }

  if (trimmedValue.startsWith("https://")) {
    return `wss://${trimmedValue.slice("https://".length)}`;
  }

  return trimmedValue;
}

export function createChatWebSocketUrl(streamId, username) {
  const resolvedStreamId = String(streamId ?? "").trim();
  const resolvedUsername = String(username ?? "").trim();

  if (!resolvedStreamId) {
    throw new Error("A streamId is required to open chat.");
  }

  if (!resolvedUsername) {
    throw new Error("A username is required to open chat.");
  }

  const url = new URL(normalizeWebSocketUrl(import.meta.env.VITE_CHAT_WS_URL));
  url.searchParams.set("streamId", resolvedStreamId);
  url.searchParams.set("username", resolvedUsername);

  return url.toString();
}

export function buildOutgoingChatMessage(message) {
  return JSON.stringify({
    type: "chat",
    message: String(message)
  });
}