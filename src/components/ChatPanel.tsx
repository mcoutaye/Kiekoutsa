"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Send } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import type { ChatMessage } from "@/types/chat";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatPanel({ className = "" }: { className?: string }) {
  const { room, playerId, sendChat } = useGame();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  if (!room) return null;

  // Chat should be visible throughout the game. Sending may still be restricted server-side.
  const enabled = true;
  const messages = (room.chatMessages ?? []) as ChatMessage[];

  const canSend = text.trim().length > 0;

  // Scroll to bottom on new messages
  const lastId = useMemo(() => messages[messages.length - 1]?.id ?? "", [messages]);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [lastId]);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await sendChat(t);
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Chat</p>
        {!enabled && (
          <p className="text-xs text-gray-500 mt-1">Le chat est désactivé.</p>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Aucun message</p>
        ) : (
          messages.map((m) => {
            const mine = m.playerId === playerId;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    {m.playerAvatar ? <img src={m.playerAvatar} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-purple-700/60" : "bg-white/5"}`}
                  style={{ border: "1px solid var(--border)" }}
                >
                  {!mine && (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-gray-300 truncate">{m.playerName}</p>
                      <p className="text-[10px] text-gray-500 flex-shrink-0">{formatTime(m.createdAt)}</p>
                    </div>
                  )}
                  <p className="text-sm text-gray-100 whitespace-pre-wrap break-words">{m.text}</p>
                  {mine && (
                    <p className="text-[10px] text-gray-300/70 text-right mt-1">{formatTime(m.createdAt)}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={!enabled}
            placeholder={enabled ? "Écrire un message…" : "Chat désactivé"}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none text-white placeholder-gray-600 disabled:opacity-50"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          />
          <button
            onClick={submit}
            disabled={!canSend}
            className="px-3 py-2.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Envoyer"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
