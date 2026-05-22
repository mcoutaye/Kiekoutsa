"use client";

import { useState, useCallback, useRef } from "react";
import { Search, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import type { SpotifyTrack } from "@/types/game";
import ChatPanel from "@/components/ChatPanel";

export default function PromptSubmission() {
  const { room, playerId, submitPromptSong, error } = useGame();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  if (!room) return null;

  const isDone = room.myPromptProgress >= room.totalPromptAssignments;

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setResults(data.tracks ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleSearch = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  const handleSubmit = async (track: SpotifyTrack) => {
    if (!room.currentPromptOwnerId || submitting) return;
    setSubmitting(true);
    try {
      await submitPromptSong(room.currentPromptOwnerId, track);
      setQuery("");
      setResults([]);
    } finally {
      setSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 size={48} className="text-green-400 mx-auto mb-3" />
          <p className="text-white font-bold text-xl">C'est fait !</p>
          <p className="text-gray-400 text-sm mt-1">En attente que les autres terminent…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 max-w-lg mx-auto overflow-y-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Prompt {room.myPromptProgress + 1} / {room.totalPromptAssignments}</span>
          <div className="flex gap-1.5">
            {Array.from({ length: room.totalPromptAssignments }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < room.myPromptProgress ? "bg-green-500" :
                  i === room.myPromptProgress ? "bg-blue-400" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Trouve la musique pour…</p>
          <p className="text-xl font-black text-white">"{room.currentPromptText}"</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Recherche une musique…"
            className="w-full pl-9 pr-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          />
          {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />}
        </div>

        {error && (
          <div className="px-3 py-2 rounded-xl bg-red-900/30 border border-red-700 text-red-300 text-xs">{error}</div>
        )}

        {/* Results */}
        <div className="flex flex-col gap-2 pb-4">
          {results.map((track) => (
            <button
              key={track.id}
              onClick={() => handleSubmit(track)}
              disabled={submitting}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:border-blue-500/50 disabled:opacity-50"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {track.albumCover && (
                <img src={track.albumCover} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{track.name}</p>
                <p className="text-gray-500 text-xs truncate">{track.artists}</p>
              </div>
              <Send size={14} className="text-blue-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
      <ChatPanel />
    </div>
  );
}
