"use client";

import Image from "next/image";
import { useGame } from "@/contexts/GameContext";

export default function VotingPhase() {
  const { room, playerId, castVote, forceReveal } = useGame();
  if (!room || !room.currentTrack) return null;

  const track = room.currentTrack;
  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const myVote = room.myVote;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 max-w-2xl mx-auto w-full">
      {/* Track summary */}
      <div
        className="w-full flex items-center gap-4 p-4 rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {track.albumCover ? (
          <Image
            src={track.albumCover}
            alt={track.name}
            width={64}
            height={64}
            className="rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0">
            🎵
          </div>
        )}
        <div className="min-w-0">
          <p className="font-black text-xl truncate">{track.name}</p>
          <p className="text-gray-400 truncate">{track.artists}</p>
        </div>
        <div className="ml-auto flex-shrink-0 text-gray-500 text-sm">
          ⏹ Extrait terminé
        </div>
      </div>

      {/* Voting */}
      <div className="w-full">
        <h3 className="text-2xl font-black text-center mb-2">Qui a mis ce son ?</h3>
        <p className="text-gray-400 text-center text-sm mb-6">
          {room.votedPlayerIds.length}/{room.players.length} votes enregistrés
        </p>

        <div className="grid grid-cols-2 gap-3">
          {room.players.map((p) => {
            const hasVoted = room.votedPlayerIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => !myVote && castVote(p.id)}
                disabled={!!myVote}
                className={`relative flex items-center gap-3 px-4 py-4 rounded-xl font-semibold
                  transition-all active:scale-95 border-2 text-left
                  ${
                    myVote === p.id
                      ? "border-purple-500 bg-purple-900/40 text-purple-200"
                      : myVote
                      ? "border-transparent opacity-50 cursor-default"
                      : "border-transparent hover:border-purple-500 hover:bg-purple-900/20 cursor-pointer"
                  }`}
                style={{
                  background: myVote === p.id ? undefined : "var(--surface)",
                }}
              >
                <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold uppercase text-lg flex-shrink-0">
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{p.name}</span>
                  {p.id === playerId && (
                    <span className="text-xs text-gray-500">c&apos;est moi !</span>
                  )}
                </div>
                {hasVoted && (
                  <span className="text-green-500 text-sm flex-shrink-0">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {!myVote && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Clique sur un joueur pour voter
          </p>
        )}
        {myVote && (
          <p className="text-center text-purple-400 font-medium mt-4">
            ✓ Tu as voté — en attente des autres…
          </p>
        )}
      </div>

      {isHost && (
        <button
          onClick={forceReveal}
          className="px-8 py-3 rounded-xl font-bold transition-all active:scale-95
            bg-pink-700 hover:bg-pink-600 text-white"
        >
          Révéler la réponse →
        </button>
      )}
    </div>
  );
}
