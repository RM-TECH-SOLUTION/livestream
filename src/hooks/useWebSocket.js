import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOutgoingChatMessage, createChatWebSocketUrl } from "../services/websocket";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_RETRIES = 10;
const CONNECTION_TIMEOUT_MS = 10000;
const SEND_DEDUPE_WINDOW_MS = 600;

function createMessageRecord(message) {
  return {
    id: message.id,
    kind: message.kind,
    username: message.username ?? "",
    text: message.text ?? "",
    timestamp: message.timestamp ?? new Date().toISOString(),
    isSelf: Boolean(message.isSelf)
  };
}

function parseMessageTimestamp(value) {
  const parsed = new Date(value ?? "");
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getOnlineCount(payload) {
  if (typeof payload?.onlineUsers === "number") {
    return payload.onlineUsers;
  }

  if (Array.isArray(payload?.onlineUsers)) {
    return payload.onlineUsers.length;
  }

  if (typeof payload?.count === "number") {
    return payload.count;
  }

  return 0;
}

export default function useWebSocket(streamId) {
  const [status, setStatus] = useState("disconnected");
  const [onlineCount, setOnlineCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const reconnectScheduledRef = useRef(false);
  const streamIdRef = useRef(String(streamId ?? ""));
  const usernameRef = useRef("");
  const shouldReconnectRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const messageIdCounterRef = useRef(0);
  const messageKeySetRef = useRef(new Set());
  const connectionAttemptRef = useRef(0);
  const lastSentRef = useRef({ key: "", sentAtMs: 0 });

  useEffect(() => {
    streamIdRef.current = String(streamId ?? "");
  }, [streamId]);

  const appendMessage = useCallback((nextMessage) => {
    const messageText = String(nextMessage.text ?? "").trim();
    const parsedDate = parseMessageTimestamp(nextMessage.timestamp);
    const timestamp = parsedDate.toISOString();
    const messageUsername = String(nextMessage.username ?? "").trim();
    const dedupeKey = String(nextMessage.key || `${nextMessage.kind}|${messageUsername}|${messageText}|${timestamp}`);

    if (!messageText || messageKeySetRef.current.has(dedupeKey)) {
      return;
    }

    messageKeySetRef.current.add(dedupeKey);
    messageIdCounterRef.current += 1;

    setMessages((current) => {
      const next = [
        ...current,
        createMessageRecord({
        id: `${timestamp}-${messageIdCounterRef.current}`,
        kind: nextMessage.kind,
        username: messageUsername,
        text: messageText,
        timestamp,
        isSelf: nextMessage.isSelf
        })
      ];

      next.sort((a, b) => {
        const left = parseMessageTimestamp(a.timestamp).getTime();
        const right = parseMessageTimestamp(b.timestamp).getTime();

        if (left === right) {
          return a.id.localeCompare(b.id);
        }

        return left - right;
      });

      return next;
    });
  }, []);

  const appendSystemMessage = useCallback((text) => {
    appendMessage({
      kind: "system",
      text,
      timestamp: new Date().toISOString(),
      key: `system|${String(text || "").trim()}`
    });
  }, [appendMessage]);

  const cleanupSocket = useCallback((shouldClose = false) => {
    if (connectionTimeoutRef.current) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      reconnectScheduledRef.current = false;
    }

    const socket = socketRef.current;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (shouldClose && socket.readyState !== WebSocket.CLOSED) {
        intentionalCloseRef.current = true;
        socket.close(1000, "Client closed the chat socket");
      }
    }

    socketRef.current = null;
  }, []);

  const connect = useCallback((reason = "initial") => {
    const resolvedStreamId = String(streamIdRef.current || "").trim();
    const resolvedUsername = String(usernameRef.current || "").trim();

    if (!resolvedStreamId || !resolvedUsername) {
      return;
    }

    const existingSocket = socketRef.current;
    if (existingSocket && (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    reconnectScheduledRef.current = false;
    intentionalCloseRef.current = false;
    cleanupSocket(false);

    let socket;
    connectionAttemptRef.current += 1;
    const currentAttemptId = connectionAttemptRef.current;

    try {
      socket = new WebSocket(createChatWebSocketUrl(resolvedStreamId, resolvedUsername));
    } catch (error) {
      setStatus("failed");
      appendSystemMessage(error instanceof Error ? `Unable to connect: ${error.message}` : "Unable to connect to live chat.");
      return;
    }

    socketRef.current = socket;
    setStatus(reason === "reconnect" ? "reconnecting" : "connecting");

    connectionTimeoutRef.current = window.setTimeout(() => {
      if (socketRef.current === socket && socket.readyState === WebSocket.CONNECTING) {
        appendSystemMessage("Connection timed out. Retrying...");
        socket.close(4000, "Connection timeout");
      }
    }, CONNECTION_TIMEOUT_MS);

    socket.onopen = () => {
      if (currentAttemptId !== connectionAttemptRef.current) {
        socket.close();
        return;
      }

      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      reconnectAttemptsRef.current = 0;
      setStatus("connected");

      if (reason === "reconnect") {
        appendSystemMessage("Reconnected.");
      }
    };

    socket.onmessage = (event) => {
      let parsedMessage;

      try {
        parsedMessage = JSON.parse(event.data);
      } catch {
        appendSystemMessage("Received invalid data from chat server.");
        return;
      }

      if (!parsedMessage || typeof parsedMessage !== "object") {
        return;
      }

      const type = String(parsedMessage.type || "").trim();
      const eventTimestamp = parsedMessage.timestamp || parsedMessage.createdAt || new Date().toISOString();

      if (type === "history") {
        const historyMessages = Array.isArray(parsedMessage.messages)
          ? parsedMessage.messages
          : Array.isArray(parsedMessage.history)
            ? parsedMessage.history
            : [];

        const normalizedHistory = historyMessages
          .map((item) => {
            const rawText = String(item?.message ?? item?.text ?? "").trim();
            if (!rawText) {
              return null;
            }

            const createdAt = item?.timestamp || item?.createdAt || new Date().toISOString();
            const parsedDate = parseMessageTimestamp(createdAt);
            const author = String(item?.username || item?.author || "Guest").trim() || "Guest";

            return {
              kind: "message",
              username: author,
              text: rawText,
              timestamp: parsedDate.toISOString(),
              isSelf: author.toLowerCase() === resolvedUsername.toLowerCase(),
              key: `chat|${author}|${rawText}|${parsedDate.toISOString()}`,
              sortMs: parsedDate.getTime()
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.sortMs - b.sortMs);

        normalizedHistory.forEach((item) => {
          appendMessage(item);
        });
        return;
      }

        if (type === "onlineUsers" || type === "online") {
        setOnlineCount(getOnlineCount(parsedMessage));
        return;
      }

        if (type === "chat" || type === "message") {
        const rawText = String(parsedMessage.message ?? parsedMessage.text ?? "").trim();
        if (!rawText) {
          return;
        }

        const author = String(parsedMessage.username || parsedMessage.author || "Guest").trim() || "Guest";
        appendMessage({
          kind: "message",
          username: author,
          text: rawText,
          timestamp: eventTimestamp,
          isSelf: author.toLowerCase() === resolvedUsername.toLowerCase(),
          key: `chat|${author}|${rawText}|${parseMessageTimestamp(eventTimestamp).toISOString()}`
        });
        return;
      }

      if (type === "system" || type === "join") {
        const rawText = String(parsedMessage.message ?? parsedMessage.text ?? "").trim();
        if (!rawText) {
          return;
        }

        appendMessage({
          kind: "system",
          text: rawText,
          timestamp: eventTimestamp,
          key: `system|${rawText}|${parseMessageTimestamp(eventTimestamp).toISOString()}`
        });
      }

      // Ignore unknown message types safely.
    };

    socket.onerror = () => {
      appendSystemMessage("Connection error. Retrying if possible...");
    };

    socket.onclose = () => {
      if (currentAttemptId !== connectionAttemptRef.current) {
        return;
      }

      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      socketRef.current = null;

      if (intentionalCloseRef.current || !shouldReconnectRef.current) {
        setStatus("disconnected");
        return;
      }

      if (reconnectAttemptsRef.current >= MAX_RECONNECT_RETRIES) {
        setStatus("failed");
        appendSystemMessage("Unable to reconnect. Please try joining again.");
        return;
      }

      setStatus("reconnecting");
      appendSystemMessage("Reconnecting...");

      if (reconnectScheduledRef.current) {
        return;
      }

      reconnectScheduledRef.current = true;
      reconnectAttemptsRef.current += 1;

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        reconnectScheduledRef.current = false;
        connect("reconnect");
      }, RECONNECT_DELAY_MS);
    };
  }, [appendMessage, appendSystemMessage, cleanupSocket]);

  const join = useCallback((nextUsername) => {
    const trimmedUsername = String(nextUsername || "").trim();
    const resolvedStreamId = String(streamIdRef.current || "").trim();

    if (!trimmedUsername) {
      return { ok: false, error: "Username is required." };
    }

    if (!resolvedStreamId) {
      return { ok: false, error: "Stream is not available yet." };
    }

    cleanupSocket(true);
    setMessages([]);
    messageKeySetRef.current = new Set();
    setOnlineCount(0);
    reconnectAttemptsRef.current = 0;
    usernameRef.current = trimmedUsername;
    setUsername(trimmedUsername);
    shouldReconnectRef.current = true;
    intentionalCloseRef.current = false;
    appendSystemMessage("Connecting to live chat...");
    connect("initial");

    return { ok: true };
  }, [appendSystemMessage, cleanupSocket, connect]);

  const sendMessage = useCallback((nextMessage) => {
    const text = String(nextMessage || "").trim();

    if (!text) {
      return false;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      appendSystemMessage("You are offline. Please wait for reconnection.");
      return false;
    }

    const nowMs = Date.now();
    const dedupeKey = `${usernameRef.current}|${text}`;
    if (lastSentRef.current.key === dedupeKey && nowMs - lastSentRef.current.sentAtMs < SEND_DEDUPE_WINDOW_MS) {
      return false;
    }

    try {
      socket.send(buildOutgoingChatMessage(text));
      lastSentRef.current = {
        key: dedupeKey,
        sentAtMs: nowMs
      };
    } catch {
      appendSystemMessage("Message could not be sent. Please try again.");
      return false;
    }

    return true;
  }, [appendSystemMessage]);

  useEffect(() => () => {
    shouldReconnectRef.current = false;
    intentionalCloseRef.current = true;
    cleanupSocket(true);
  }, [cleanupSocket]);

  useEffect(() => {
    if (!usernameRef.current) {
      return;
    }

    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    connect("initial");
  }, [connect, streamId]);

  return useMemo(() => ({
    join,
    sendMessage,
    status,
    onlineCount,
    messages,
    username
  }), [join, messages, onlineCount, sendMessage, status, username]);
}