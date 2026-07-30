const WS_BASE = import.meta.env.VITE_WS_URL;

function normalizeWebSocketBase(value) {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.startsWith("http://")) {
    return `ws://${trimmedValue.slice("http://".length)}`;
  }

  if (trimmedValue.startsWith("https://")) {
    return `wss://${trimmedValue.slice("https://".length)}`;
  }

  if (trimmedValue.startsWith("ws://") || trimmedValue.startsWith("wss://")) {
    return trimmedValue;
  }

  return `ws://${trimmedValue}`;
}

function buildSocketEndpoint() {
  const normalizedBase = normalizeWebSocketBase(WS_BASE);
  if (!normalizedBase) {
    throw new Error("VITE_WS_URL is not configured.");
  }

  const parsedBase = new URL(normalizedBase.replace(/\/+$/, ""));
  const pathname = parsedBase.pathname === "/" ? "/ws" : `${parsedBase.pathname.replace(/\/$/, "")}/ws`;
  parsedBase.pathname = pathname;
  return parsedBase.toString();
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

  const url = new URL(buildSocketEndpoint());
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