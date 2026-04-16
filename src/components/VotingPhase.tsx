"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Eye, Check } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

export default function VotingPhase() {
  const { room, playerId, castVote, forceReveal } = useGame();
  const [pendingVote, setPendingVote] = useState<string | null>(null);

  if (!room || !room.currentTrack) return null;
  const track = room.currentTrack;
  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const myVote = room.myVote;

  // Sync pending with confirmed vote when it updates
  useEffect(() => {
    if (myVote && !pendingVote) setPendingVote(myVote);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myVote]);

  const pendingChanged = pendingVote !== null && pendingVote !== myVote;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-2xl mx-auto w-full">
      {/* Track summary */}
      <div className="w-full flex items-center gap-4 p-4 rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {track.albumCover ? (
          <Image src={track.albumCover} alt={track.name} width={56} height={56} className="rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-800 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-black text-lg truncate">{track.name}</p>
          <p className="text-gray-400 text-sm truncate">{track.artists}</p>
        </div>
        <p className="ml-auto text-xs text-gray-500 flex-shrink-0">Extrait terminé</p>
      </div>

      {/* Vote grid */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-black">Qui a mis ce son ?</h3>
          <span className="text-sm text-gray-400">{room.votedPlayerIds.length}/{room.players.length} votés</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {room.players.map((p) => {
            const isSelf = p.id === playerId;
            const locked = !!myVote; // vote is locked after confirmation
            const disabled = (!room.settings.allowSelfVote && isSelf) || locked;
            const isPending = !locked && pendingVote === p.id;
            const isConfirmed = myVote === p.id;
            const voteCount = room.voteCounts[p.id] ?? 0;
            const hasVoted = room.votedPlayerIds.includes(p.id);

            return (
              <button key={p.id} onClick={() => !disabled && setPendingVote(p.id)} disabled={disabled}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left
                  ${isPending ? "border-purple-500 bg-purple-900/40" : isConfirmed ? "border-green-500 bg-green-900/30" : disabled ? "border-transparent opacity-40 cursor-not-allowed" : "border-transparent hover:border-purple-500/50 cursor-pointer"}`}
                style={{ background: isPending || isConfirmed ? undefined : "var(--surface)" }}>
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                  {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{p.name}</span>
                  {isSelf && <span className="text-xs text-gray-500">c&apos;est moi</span>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {voteCount > 0 && (
                    <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs flex items-center justify-center font-bold">
                      {voteCount}
                    </span>
                  )}
                  {hasVoted && <div className="w-2 h-2 rounded-full bg-green-500" title="A voté" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm / locked */}
        <div className="mt-4">
          {myVote ? (
            <p className="text-center text-green-400 text-sm flex items-center justify-center gap-1.5">
              <Check size={14} /> Vote verrouillé
            </p>
          ) : pendingVote ? (
            <button onClick={() => castVote(pendingVote!)}
              className="w-full py-3 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-all active:scale-95 flex items-center justify-center gap-2">
              <Check size={15} /> Confirmer mon vote
            </button>
          ) : (
            <p className="text-center text-gray-500 text-sm">Clique sur un joueur pour voter</p>
          )}
        </div>
      </div>

      {isHost && (
        <button onClick={forceReveal}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-pink-700 hover:bg-pink-600 text-white transition-all active:scale-95">
          <Eye size={14} /> Révéler la réponse
        </button>
      )}
    </div>
  );
}
