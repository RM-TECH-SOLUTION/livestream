import { Suspense, lazy, useEffect, useRef, useState } from "react";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

export default function ChatInput({ disabled, onSend }) {
  const [message, setMessage] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const inputRef = useRef(null);
  const emojiContainerRef = useRef(null);

  useEffect(() => {
    if (!isEmojiOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!emojiContainerRef.current?.contains(event.target)) {
        setIsEmojiOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsEmojiOpen(false);
        window.requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isEmojiOpen]);

  useEffect(() => {
    if (disabled && isEmojiOpen) {
      setIsEmojiOpen(false);
    }
  }, [disabled, isEmojiOpen]);

  const sendDraft = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) {
      return false;
    }

    const wasSent = onSend(trimmedMessage);

    if (wasSent) {
      setMessage("");
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }

    return wasSent;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendDraft();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendDraft();
    }
  };

  const handleEmojiSelect = (emojiData) => {
    const emoji = String(emojiData?.emoji ?? "");
    if (!emoji) {
      return;
    }

    const textarea = inputRef.current;
    const selectionStart = textarea?.selectionStart ?? message.length;
    const selectionEnd = textarea?.selectionEnd ?? message.length;
    const nextMessage = `${message.slice(0, selectionStart)}${emoji}${message.slice(selectionEnd)}`;
    const nextCaret = selectionStart + emoji.length;

    setMessage(nextMessage);
    setIsEmojiOpen(false);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  return (
    <form className="live-chat-input-row" onSubmit={handleSubmit}>
      <textarea
        ref={inputRef}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Chat is disconnected" : "Write a message"}
        disabled={disabled}
        aria-label="Type a chat message"
        rows={1}
      />

      <div className="live-chat-emoji" ref={emojiContainerRef}>
        <button
          type="button"
          className="live-chat-emoji-button"
          onClick={() => {
            setIsEmojiOpen((current) => !current);
            window.requestAnimationFrame(() => {
              inputRef.current?.focus();
            });
          }}
          disabled={disabled}
          aria-label="Open emoji picker"
          aria-expanded={isEmojiOpen}
          aria-controls="live-chat-emoji-picker"
        >
          😊
        </button>

        {isEmojiOpen ? (
          <div className="live-chat-emoji-popover" id="live-chat-emoji-picker" role="dialog" aria-label="Emoji picker">
            <Suspense fallback={<div className="live-chat-emoji-loading">Loading emojis...</div>}>
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                autoFocusSearch={false}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
                searchDisabled={false}
                skinTonesDisabled
              />
            </Suspense>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        className="live-chat-primary-button"
        disabled={disabled || !message.trim()}
        aria-label="Send message"
      >
        Send
      </button>
    </form>
  );
}