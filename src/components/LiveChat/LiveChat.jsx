import { useEffect, useState } from "react";
import useWebSocket from "../../hooks/useWebSocket";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import JoinForm from "./JoinForm";

export default function LiveChat({ streamId }) {
  const chat = useWebSocket(streamId);
  const [draftUsername, setDraftUsername] = useState("");
  const [joinError, setJoinError] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    setHasJoined(false);
    setDraftUsername("");
    setJoinError("");
    setIsJoining(false);
  }, [streamId]);

  const handleJoin = () => {
    const username = draftUsername.trim();

    if (!username) {
      setJoinError("Please enter a username to join the chat.");
      return;
    }

    setJoinError("");
    setIsJoining(true);

    const result = chat.join(username);

    if (!result.ok) {
      setIsJoining(false);
      setJoinError(result.error || "Unable to join live chat.");
      return;
    }

    setHasJoined(true);
    setIsJoining(false);
  };

  return (
    <section className="live-chat-shell" aria-label="Live chat">
      {!hasJoined ? (
        <JoinForm
          username={draftUsername}
          onUsernameChange={(value) => {
            setDraftUsername(value);
            if (joinError) {
              setJoinError("");
            }
          }}
          onJoin={handleJoin}
          errorMessage={joinError}
          isJoining={isJoining}
        />
      ) : (
        <div className="live-chat-panel">
          <ChatHeader status={chat.status} onlineCount={chat.onlineCount} />
          <ChatMessages messages={chat.messages} />
          <ChatInput disabled={chat.status !== "connected"} onSend={chat.sendMessage} />
        </div>
      )}
    </section>
  );
}