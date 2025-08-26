import { useState } from 'react';

type ChatInputProps = {
  onSend: (msg: string) => void;
};

export default function ChatInput({ onSend }: ChatInputProps) {
  const [msg, setMsg] = useState('');

  const send = () => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMsg('');
  };

  return (
    <div className="chat-input">
      <input
        value={msg}
        onChange={e => setMsg(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        placeholder="Type message..."
      />
      <button onClick={send}>Send</button>
    </div>
  );
}


