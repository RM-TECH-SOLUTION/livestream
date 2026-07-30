const STATUS_LABELS = {
  connecting: "🟡 Connecting",
  connected: "🟢 Connected",
  reconnecting: "🟠 Reconnecting",
  disconnected: "🔴 Disconnected",
  failed: "🔴 Disconnected"
};

export default function ChatHeader({ status, onlineCount }) {
  return (
    <header className="live-chat-header">
      <div>
        <h2>Live Chat</h2>
        <p className="live-chat-status-line" role="status" aria-live="polite">
          <span className={`live-chat-status-dot ${status}`} />
          {STATUS_LABELS[status] || STATUS_LABELS.disconnected}
        </p>
      </div>

      <div className="live-chat-online-count">
        <strong>{onlineCount}</strong>
        <span>Online</span>
      </div>
    </header>
  );
}