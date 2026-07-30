export default function JoinForm({ username, onUsernameChange, onJoin, errorMessage, isJoining }) {
  return (
    <div className="live-chat-join-panel">
      <div className="live-chat-copy">
        <h2>Live Chat</h2>
        <p>Enter your name to join the live chat</p>
      </div>

      <form
        className="live-chat-join-form"
        onSubmit={(event) => {
          event.preventDefault();
          onJoin();
        }}
      >
        <label className="live-chat-field">
          <span>Name</span>
          <input
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
          />
        </label>

        {errorMessage ? <p className="live-chat-error" role="alert">{errorMessage}</p> : null}

        <button type="submit" className="live-chat-primary-button" disabled={isJoining}>
          {isJoining ? "Joining..." : "Join"}
        </button>
      </form>
    </div>
  );
}