import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const MAX_RENDERED_MESSAGES = 500;
const BOTTOM_STICKY_THRESHOLD_PX = 48;

function formatMessageTime(timestamp) {
  const value = new Date(timestamp);

  if (Number.isNaN(value.getTime())) {
    return "--:--";
  }

  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ChatMessages({ messages }) {
  const messagesContainerRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const previousScrollHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0);
  const previousMessageCountRef = useRef(0);
  const hasBootstrappedHistoryRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const renderedMessages = useMemo(
    () => (messages.length > MAX_RENDERED_MESSAGES ? messages.slice(-MAX_RENDERED_MESSAGES) : messages),
    [messages]
  );

  const handleScroll = useCallback(() => {
    const node = messagesContainerRef.current;
    if (!node) {
      return;
    }

    previousScrollHeightRef.current = node.scrollHeight;
    previousScrollTopRef.current = node.scrollTop;
    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
    const isNearBottom = remaining <= BOTTOM_STICKY_THRESHOLD_PX;
    shouldStickToBottomRef.current = isNearBottom;

    if (isNearBottom && unreadCount) {
      setUnreadCount(0);
    }
  }, [unreadCount]);

  const scrollToLatest = useCallback((behavior = "smooth") => {
    const node = messagesContainerRef.current;

    if (!node) {
      return;
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior
    });
  }, []);

  useLayoutEffect(() => {
    const node = messagesContainerRef.current;

    if (!node) {
      return;
    }

    const previousCount = previousMessageCountRef.current;
    const currentCount = renderedMessages.length;
    const addedCount = currentCount - previousCount;

    if (!hasBootstrappedHistoryRef.current && currentCount > 0) {
      hasBootstrappedHistoryRef.current = true;
      shouldStickToBottomRef.current = true;
      scrollToLatest("smooth");
      setUnreadCount(0);
    } else if (addedCount > 0 && shouldStickToBottomRef.current) {
      scrollToLatest("smooth");
      setUnreadCount(0);
    } else if (addedCount > 0 && !shouldStickToBottomRef.current) {
      const heightDelta = node.scrollHeight - previousScrollHeightRef.current;
      if (heightDelta > 0) {
        node.scrollTop = previousScrollTopRef.current + heightDelta;
      }
      setUnreadCount((current) => current + addedCount);
    } else {
      const heightDelta = node.scrollHeight - previousScrollHeightRef.current;
      if (heightDelta > 0) {
        node.scrollTop = previousScrollTopRef.current + heightDelta;
      }
    }

    previousScrollHeightRef.current = node.scrollHeight;
    previousScrollTopRef.current = node.scrollTop;
    previousMessageCountRef.current = currentCount;
  }, [renderedMessages, scrollToLatest]);

  useEffect(() => {
    const node = messagesContainerRef.current;

    if (!node) {
      return;
    }

    previousScrollHeightRef.current = node.scrollHeight;
    previousScrollTopRef.current = node.scrollTop;
    previousMessageCountRef.current = renderedMessages.length;
  }, []);

  return (
    <div
      ref={messagesContainerRef}
      className="live-chat-messages"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Chat messages"
      tabIndex={0}
      onScroll={handleScroll}
    >
      {renderedMessages.length ? (
        renderedMessages.map((message) => (
          <article key={message.id} className={`live-chat-message ${message.kind} ${message.isSelf ? "self" : ""}`}>
            <div className="live-chat-message-meta">
              <strong>{message.kind === "system" ? "System" : message.username}</strong>
              <time dateTime={message.timestamp}>{formatMessageTime(message.timestamp)}</time>
            </div>
            <p>{message.text}</p>
          </article>
        ))
      ) : (
        <div className="live-chat-empty-state">
          <p>No messages yet. Be the first to say hello.</p>
        </div>
      )}
      {messages.length > MAX_RENDERED_MESSAGES ? (
        <p className="live-chat-window-note" aria-live="off">
          Showing latest {MAX_RENDERED_MESSAGES} messages for performance.
        </p>
      ) : null}

      {unreadCount > 0 ? (
        <button
          type="button"
          className="live-chat-new-messages"
          onClick={() => {
            shouldStickToBottomRef.current = true;
            setUnreadCount(0);
            scrollToLatest("smooth");
          }}
          aria-label={`Jump to ${unreadCount} new messages`}
        >
          {unreadCount} new message{unreadCount > 1 ? "s" : ""}
        </button>
      ) : null}
    </div>
  );
}

export default memo(ChatMessages);