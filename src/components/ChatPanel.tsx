"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import type { ChatMessage } from "@/types/chat";

const GIF_PREFIX = "gif::";

function isGif(text: string) {
  return text.startsWith(GIF_PREFIX);
}

function gifUrl(text: string) {
  return text.slice(GIF_PREFIX.length);
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function GifIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M10 12h-2v-2M10 14v-4M14 10v4M18 10h-2v2h2M18 14h-2" />
    </svg>
  );
}

interface GifResult { id: string; preview: string; url: string }

export default function ChatPanel({ className = "" }: { className?: string }) {
  const { room, playerId, sendChat } = useGame();
  const [text, setText] = useState("");
  const [showGif, setShowGif] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const gifDebounce = useRef<NodeJS.Timeout | null>(null);
  const gifPanelRef = useRef<HTMLDivElement>(null);

  if (!room) return null;

  const messages = (room.chatMessages ?? []) as ChatMessage[];
  const canSend = text.trim().length > 0;

  const lastId = useMemo(() => messages[messages.length - 1]?.id ?? "", [messages]);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [lastId]);

  // Close GIF panel on outside click
  useEffect(() => {
    if (!showGif) return;
    const handler = (e: MouseEvent) => {
      if (gifPanelRef.current && !gifPanelRef.current.contains(e.target as Node)) {
        setShowGif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showGif]);

  const searchGifs = useCallback(async (q: string) => {
    if (!q.trim()) { setGifResults([]); return; }
    setGifLoading(true);
    try {
      const res = await fetch(`/api/gif/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGifResults(data.results ?? []);
    } catch { setGifResults([]); }
    finally { setGifLoading(false); }
  }, []);

  const handleGifQuery = (val: string) => {
    setGifQuery(val);
    if (gifDebounce.current) clearTimeout(gifDebounce.current);
    gifDebounce.current = setTimeout(() => searchGifs(val), 400);
  };

  const sendGif = async (url: string) => {
    setShowGif(false);
    setGifQuery("");
    setGifResults([]);
    await sendChat(`${GIF_PREFIX}${url}`);
  };

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await sendChat(t);
  };

  return (
    <div
      className={`rounded-2xl flex flex-col ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Chat</p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Aucun message</p>
        ) : (
          messages.map((m) => {
            const mine = m.playerId === playerId;
            const gif = isGif(m.text);
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1">
                    {m.playerAvatar ? <img src={m.playerAvatar} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                )}
                <div className={`max-w-[80%] ${gif ? "" : "rounded-2xl px-3 py-2"} ${!gif && mine ? "bg-purple-700/60" : !gif ? "bg-white/5" : ""}`}
                  style={gif ? {} : { border: "1px solid var(--border)" }}>
                  {!mine && !gif && (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-gray-300 truncate">{m.playerName}</p>
                      <p className="text-[10px] text-gray-500 flex-shrink-0">{formatTime(m.createdAt)}</p>
                    </div>
                  )}
                  {gif ? (
                    <div>
                      {!mine && <p className="text-xs font-bold text-gray-300 mb-1">{m.playerName}</p>}
                      <img src={gifUrl(m.text)} alt="gif" className="rounded-xl max-w-[200px] max-h-[160px] object-contain" />
                      <p className="text-[10px] text-gray-500 mt-0.5 text-right">{formatTime(m.createdAt)}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-100 whitespace-pre-wrap break-words">{m.text}</p>
                      {mine && <p className="text-[10px] text-gray-300/70 text-right mt-1">{formatTime(m.createdAt)}</p>}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t relative" style={{ borderColor: "var(--border)" }}>
        {/* GIF picker panel — floats above the input bar */}
        {showGif && (
          <div ref={gifPanelRef} className="absolute bottom-full left-0 right-0 mb-1 mx-3 rounded-2xl p-3 flex flex-col gap-2 z-10"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <input
              autoFocus
              value={gifQuery}
              onChange={(e) => handleGifQuery(e.target.value)}
              placeholder="Chercher un GIF…"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none text-white placeholder-gray-600"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            />
            {gifLoading && <p className="text-xs text-gray-500 text-center">Chargement…</p>}
            {!gifLoading && gifResults.length === 0 && gifQuery.trim() && (
              <p className="text-xs text-gray-600 text-center">Aucun résultat</p>
            )}
            {!gifLoading && gifResults.length === 0 && !gifQuery.trim() && (
              <p className="text-xs text-gray-600 text-center">Tape pour chercher</p>
            )}
            {gifResults.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
                {gifResults.map((g) => (
                  <button key={g.id} onClick={() => sendGif(g.url)}
                    className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity aspect-square bg-gray-800">
                    <img src={g.preview} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGif((v) => !v)}
            className={`px-2.5 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0 ${showGif ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
            style={showGif ? {} : { background: "var(--bg)", border: "1px solid var(--border)" }}
            title="GIF"
          >
            <GifIcon />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Écrire un message…"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none text-white placeholder-gray-600"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          />
          <button onClick={submit} disabled={!canSend}
            className="px-3 py-2.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Envoyer">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
