"use client";

import React, { useState } from "react";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame } from "@/contexts/GameContext";
import Lobby from "@/components/Lobby";
import Selection from "@/components/Selection";
import ModeSelection from "@/components/ModeSelection";
import PlayingPhase from "@/components/PlayingPhase";
import VotingPhase from "@/components/VotingPhase";
import RevealPhase from "@/components/RevealPhase";
import EndScreen from "@/components/EndScreen";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { room, playerId, error } = useGame();
  const code = (params.code as string).toUpperCase();
  const [isRevealed, setIsRevealed] = useState(false);

  // Redirect home if socket error that implies we left the room
  useEffect(() => {
    if (error === "Salon introuvable" || error === "La partie a déjà commencé") {
      router.push("/");
    }
  }, [error, router]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 vinyl-spin inline-block">💿</div>
          <p className="text-gray-400">Connexion au salon {code}…</p>
        </div>
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">💿</span>
          <span className="font-black text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kiekoutsa
          </span>
        </div>
        <div className="flex items-center gap-4">
          {room.phase !== "lobby" && room.totalTracks > 0 && (
            <span className="text-sm text-gray-400">
              🎵 {room.currentTrackIndex + 1} / {room.totalTracks}
            </span>
          )}
          <button
            onClick={() => setIsRevealed(!isRevealed)}
            className="px-3 py-1.5 rounded-lg font-mono font-bold text-purple-300 text-sm transition-all duration-300 cursor-pointer hover:border-purple-500/50 active:scale-95"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            title={isRevealed ? "Cacher le code" : "Afficher le code"}
          >
            <span className={`transition-all duration-300 ${!isRevealed ? 'blur-[4px] select-none' : 'blur-0'}`}>
              {room.code}
            </span>
          </button>
          {isHost && (
            <span className="px-2 py-1 rounded-md bg-yellow-900/40 text-yellow-400 text-xs font-medium">
              Host
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {room.phase === "lobby" && <Lobby />}
        {room.phase === "selection" && <Selection />}
        {room.phase === "mode-selection" && <ModeSelection />}
        {room.phase === "playing" && <PlayingPhase />}
        {room.phase === "voting" && <VotingPhase />}
        {room.phase === "reveal" && <RevealPhase />}
        {room.phase === "end" && <EndScreen />}
      </div>
    </div>
  );
}
