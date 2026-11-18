import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PieceColor } from '../types/chess';
import { MessageSquare, Send, Smile } from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  myColor?: PieceColor | 'spectator';
}

const QUICK_EMOJIS = ['♟️', '🤝', '👏', '🔥', '⚔️', '👑', '😮', '😅', '☕'];

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, myColor }) => {
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    setShowEmojis(false);
  };

  const handleSendEmoji = (emoji: string) => {
    onSendMessage(emoji);
    setShowEmojis(false);
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col h-full max-h-[300px] lg:max-h-[360px] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-xs sm:text-sm text-zinc-100">Match Chat</h3>
        </div>
        <span className="text-[11px] text-zinc-500">Live 1v1</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 italic text-center py-6">
            Say hello to your opponent or send a reaction!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex flex-col space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-semibold text-[11px] ${
                    msg.color === 'w'
                      ? 'text-zinc-300'
                      : msg.color === 'b'
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {msg.sender}
                </span>
                <span className="text-[9px] text-zinc-600">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="bg-zinc-800/70 border border-zinc-700/50 rounded-xl px-2.5 py-1 text-zinc-200 break-words self-start max-w-[85%]">
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick emoji bar popup */}
      {showEmojis && (
        <div className="p-2 border-t border-zinc-800 bg-zinc-800/90 flex items-center gap-2 overflow-x-auto">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => handleSendEmoji(e)}
              className="text-base p-1 hover:bg-zinc-700 rounded transition transform hover:scale-125"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-1.5 text-zinc-400 hover:text-amber-400 transition"
          title="Quick Reaction"
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message..."
          maxLength={150}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 rounded-lg transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
