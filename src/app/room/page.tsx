"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/contexts/GameContext";
import { Copy, Check, Disc3, Music, LogOut } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import Lobby from "@/components/Lobby";
import RoleReveal from "@/components/RoleReveal";
import Selection from "@/components/Selection";
import ModeSelection from "@/components/ModeSelection";
import PlayingPhase from "@/components/PlayingPhase";
import VotingPhase from "@/components/VotingPhase";
import RevealPhase from "@/components/RevealPhase";
import EndScreen from "@/components/EndScreen";

export default function RoomPage() {
  const router = useRouter();
  const { room, playerId, roomCode, error, leaveRoom } = useGame();
  const [codeBlurred, setCodeBlurred] = useState(true);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Auto-blur code when game leaves lobby
  useEffect(() => {
    if (room && room.phase !== "lobby") setCodeBlurred(true);
  }, [room?.phase]);

  // Redirect if no room (direct navigation or session lost)
  // Redirect if kicked (roomCode cleared by GameContext) or no session
  useEffect(() => {
    if (!roomCode) router.replace("/");
  }, [roomCode, router]);

  useEffect(() => {
    if (error === "Salon introuvable") router.push("/");
  }, [error, router]);

  const copyCode = useCallback(() => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [room?.code]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Disc3 className="text-purple-400 animate-spin mx-auto mb-4" size={40} />
          <p className="text-gray-400">Connexion au salon…</p>
        </div>
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center gap-2">
          <Disc3 className="text-purple-400" size={20} />
          <span className="font-black text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kiekoutsa
          </span>
        </div>

        <div className="flex items-center gap-3">
          {room.phase !== "lobby" && room.totalTracks > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Music size={14} />
              <span>{room.currentTrackIndex + 1} / {room.totalTracks}</span>
            </div>
          )}

          {/* Room code (blurred) + copy */}
          <div className="flex items-center gap-1">
            <div
              className="px-3 py-1.5 rounded-lg font-mono font-bold text-purple-300 text-sm cursor-pointer"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              onClick={() => setCodeBlurred((b) => !b)}
              title={codeBlurred ? "Afficher le code" : "Masquer le code"}
            >
              <span className={`transition-all duration-300 select-none ${codeBlurred ? "blur-sm" : ""}`}>
                {room.code}
              </span>
            </div>
            <button
              onClick={copyCode}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              title="Copier le code"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>

          {isHost && (
            <span className="px-2 py-1 rounded-md bg-yellow-900/40 text-yellow-400 text-xs font-medium border border-yellow-700/30">
              Host
            </span>
          )}

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={leaving}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            title="Quitter le salon"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Quitter le salon ?"
        message="Tu vas être retiré du salon. Si tu es host, le rôle sera transféré à un autre joueur."
        confirmText="Quitter"
        cancelText="Rester"
        destructive
        loading={leaving}
        onCancel={() => !leaving && setConfirmOpen(false)}
        onConfirm={async () => {
          if (leaving) return;
          setLeaving(true);
          try {
            await leaveRoom();
            router.push("/");
          } finally {
            setLeaving(false);
            setConfirmOpen(false);
          }
        }}
      />

      {/* Phase content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {room.phase === "lobby" && <Lobby />}
        {room.phase === "role-reveal" && <RoleReveal />}
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
