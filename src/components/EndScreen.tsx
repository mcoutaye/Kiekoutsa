"use client";

import Image from "next/image";
import { Trophy, Medal, RotateCcw } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import ChatPanel from "@/components/ChatPanel";

export default function EndScreen() {
  const { room, playerId, playAgain } = useGame();
  if (!room) return null;

  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full">
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className="text-center mb-8">
            <Trophy size={56} className="mx-auto mb-3 text-yellow-400" />
            <h2 className="text-4xl font-black text-white mb-1">{winner.name}</h2>
            <p className="text-gray-400">
              {winner.score} point{winner.score !== 1 ? "s" : ""} — Vainqueur !
            </p>
            {winner.id === playerId && (
              <p className="text-yellow-400 font-bold mt-2">C&apos;est toi !</p>
            )}
          </div>

          {/* Scoreboard */}
          <div className="w-full rounded-2xl overflow-hidden mb-8" style={{ border: "1px solid var(--border)" }}>
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-6 py-4 ${i < sorted.length - 1 ? "border-b" : ""}`}
                style={{
                  borderColor: "var(--border)",
                  background: p.id === playerId ? "rgba(124,58,237,0.15)" : i === 0 ? "#1a1030" : "var(--surface)",
                }}
              >
                {/* Rank */}
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {i === 0 ? (
                    <Trophy size={20} className="text-yellow-400" />
                  ) : i === 1 ? (
                    <Medal size={20} className="text-gray-400" />
                  ) : i === 2 ? (
                    <Medal size={20} className="text-amber-700" />
                  ) : (
                    <span className="text-gray-500 font-bold text-sm">{i + 1}.</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-700 flex-shrink-0 flex items-center justify-center font-bold uppercase text-white">
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    p.name[0]
                  )}
                </div>

                <span className={`flex-1 font-semibold ${i === 0 ? "text-yellow-300" : "text-gray-200"}`}>
                  {p.name}
                  {p.id === playerId && <span className="text-purple-400 text-sm ml-2">(toi)</span>}
                </span>
                <span className={`font-black text-xl ${i === 0 ? "text-yellow-300" : "text-gray-300"}`}>
                  {p.score}
                </span>
              </div>
            ))}
          </div>

          {/* All tracks reveal */}
          {room.settings.showAllTracksEnd && room.roundResults.length > 0 && (
            <div className="w-full rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Toutes les musiques</h3>
              <div className="space-y-2">
                {room.roundResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {r.track.albumCover ? (
                      <Image src={r.track.albumCover} alt={r.track.name} width={36} height={36} className="rounded flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded bg-gray-800 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-white">{r.track.name}</p>
                      <p className="text-xs text-gray-500 truncate">{r.track.artists}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{r.ownerName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role reveals */}
          {room.allRoles && (
            <div className="w-full rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Rôles secrets</h3>
              <div className="space-y-1.5">
                {room.players.map((p) => {
                  const role = room.allRoles![p.id];
                  if (!role || role === "none") return null;
                  const labels: Record<string, string> = { fou: "Le Fou 🃏", policier: "Le Policier 🛡", guesser: "Le Guesser 🔍" };
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                        {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                      <span className={`flex-1 ${p.id === playerId ? "text-purple-300" : "text-gray-300"}`}>{p.name}</span>
                      <span className="text-gray-400 text-xs">{labels[role] ?? role}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="w-full grid grid-cols-2 gap-3 mb-8">
            <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-2xl font-black text-purple-400">{room.roundResults.length}</p>
              <p className="text-gray-500 text-sm">musiques jouées</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-2xl font-black text-green-400">
                {room.roundResults.reduce((acc, r) => acc + r.votes.filter((v) => v.wasCorrect).length, 0)}
              </p>
              <p className="text-gray-500 text-sm">bonnes réponses</p>
            </div>
          </div>

          {isHost ? (
            <button
              onClick={playAgain}
              className="flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-xl transition-all active:scale-95 bg-purple-600 hover:bg-purple-500 text-white"
            >
              <RotateCcw size={20} /> Rejouer !
            </button>
          ) : (
            <p className="text-gray-500 text-sm">En attente du host pour rejouer…</p>
          )}
        </div>

        <ChatPanel className="h-[28rem]" />
      </div>
    </div>
  );
}
