"use client";

import { useGame } from "@/contexts/GameContext";

export default function EndScreen() {
  const { room, playerId, playAgain } = useGame();
  if (!room) return null;

  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">{medals[0]}</div>
        <h2 className="text-4xl font-black text-white mb-1">{winner.name}</h2>
        <p className="text-gray-400">
          {winner.score} point{winner.score !== 1 ? "s" : ""} — Vainqueur !
        </p>
        {winner.id === playerId && (
          <p className="text-yellow-400 font-bold mt-2">C&apos;est toi ! 🎉</p>
        )}
      </div>

      {/* Scoreboard */}
      <div
        className="w-full rounded-2xl overflow-hidden mb-8"
        style={{ border: "1px solid var(--border)" }}
      >
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-4 px-6 py-4 ${
              i < sorted.length - 1 ? "border-b" : ""
            } ${p.id === playerId ? "bg-purple-900/20" : ""}`}
            style={{
              borderColor: "var(--border)",
              background: p.id === playerId ? undefined : i === 0 ? "#1a1030" : "var(--surface)",
            }}
          >
            <span className="text-2xl w-8 text-center flex-shrink-0">
              {medals[i] ?? `${i + 1}.`}
            </span>
            <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center font-bold uppercase text-white flex-shrink-0">
              {p.name[0]}
            </div>
            <span
              className={`flex-1 font-semibold ${
                i === 0 ? "text-yellow-300" : "text-gray-200"
              }`}
            >
              {p.name}
              {p.id === playerId && (
                <span className="text-purple-400 text-sm ml-2">(toi)</span>
              )}
            </span>
            <span
              className={`font-black text-xl ${
                i === 0 ? "text-yellow-300" : "text-gray-300"
              }`}
            >
              {p.score}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-2xl font-black text-purple-400">
            {room.roundResults.length}
          </p>
          <p className="text-gray-500 text-sm">musiques jouées</p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-2xl font-black text-green-400">
            {room.roundResults.reduce(
              (acc, r) => acc + r.votes.filter((v) => v.wasCorrect).length,
              0
            )}
          </p>
          <p className="text-gray-500 text-sm">bonnes réponses</p>
        </div>
      </div>

      {isHost ? (
        <button
          onClick={playAgain}
          className="px-10 py-4 rounded-xl font-bold text-xl transition-all active:scale-95
            bg-purple-600 hover:bg-purple-500 text-white"
        >
          🔄 Rejouer !
        </button>
      ) : (
        <p className="text-gray-500 text-sm">En attente du host pour rejouer…</p>
      )}
    </div>
  );
}
