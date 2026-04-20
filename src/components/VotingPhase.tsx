"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Eye, Check, Shield, Zap } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import ChatPanel from "@/components/ChatPanel";

export default function VotingPhase() {
  const { room, playerId, castVote, forceReveal, policeBlock, fouActivate, error, clearError } = useGame();
  const [pendingVote, setPendingVote] = useState<string | null>(null);
  const [showPoliceSelect, setShowPoliceSelect] = useState(false);

  if (!room || !room.currentTrack) return null;
  const track = room.currentTrack;
  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const myVote = room.myVote;
  const isBlocked = room.policeBlockedId === playerId;

  // Use sessionStorage cache as fallback if Realtime stripped the roles from the payload
  const cachedRole = typeof window !== "undefined"
    ? sessionStorage.getItem("kiekoutsa_my_role") as import("@/types/game").RoleName | null
    : null;
  const effectiveRole = room.myRole ?? cachedRole;

  const isPolicier = effectiveRole === "policier";
  const isFou = effectiveRole === "fou";
  const fouActivationsRemaining = (room.settings.fouActivationsPerGame ?? 1) - (room.fouActivationsUsed ?? 0);
  const canFouActivate = isFou && !room.fouActivated && room.currentTrack?.addedBy !== playerId && fouActivationsRemaining > 0;
  const blocksRemaining = (room.settings.policeBlocksPerGame ?? 1) - (room.policeBlocksUsed ?? 0);
  const canPoliceBlock = isPolicier && !room.policeBlockedId && blocksRemaining > 0;

  // Sync pending with confirmed vote when it updates
  useEffect(() => {
    if (myVote && !pendingVote) setPendingVote(myVote);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myVote]);

  const pendingChanged = pendingVote !== null && pendingVote !== myVote;
  void pendingChanged;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-5xl mx-auto w-full">
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-6">
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

          {/* Role banners */}
          {room.fouActivated && (
            <div className="w-full px-4 py-2 rounded-xl bg-yellow-900/30 border border-yellow-600 text-yellow-300 text-sm text-center font-semibold">
              Le Fou est actif ce round !
            </div>
          )}

          {isBlocked && (
            <div className="w-full px-4 py-2 rounded-xl bg-red-900/30 border border-red-600 text-red-300 text-sm text-center font-semibold">
              Tu es bloqué par le Policier ce round
            </div>
          )}

          {/* Vote grid */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-black">Qui a mis ce son ?</h3>
              <span className="text-sm text-gray-400">{room.votedPlayerIds.length}/{room.players.length} votés</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {room.players.map((p) => {
                const isSelf = p.id === playerId;
                const locked = !!myVote || isBlocked;
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
                      {room.settings.showVoteCounts && voteCount > 0 && (
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
              {isBlocked ? (
                <p className="text-center text-red-400 text-sm">Tu es bloqué — tu ne peux pas voter ce round</p>
              ) : myVote ? (
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

          {/* Police power */}
          {canPoliceBlock && (
            <div className="w-full">
              {showPoliceSelect ? (
                <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-sm font-semibold text-blue-300 mb-2">Choisir un joueur à bloquer :</p>
                  <div className="space-y-1">
                    {room.players.filter((p) => p.id !== playerId && !room.votedPlayerIds.includes(p.id)).map((p) => (
                      <button key={p.id} onClick={() => { policeBlock(p.id); setShowPoliceSelect(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                          {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : null}
                        </div>
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowPoliceSelect(false)} className="mt-2 text-xs text-gray-500 hover:text-gray-300">Annuler</button>
                </div>
              ) : (
                <button onClick={() => setShowPoliceSelect(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-blue-800 hover:bg-blue-700 text-blue-200 transition-all active:scale-95">
                  <Shield size={14} /> Bloquer un joueur
                  <span className="text-xs opacity-70">({blocksRemaining} restant{blocksRemaining > 1 ? "s" : ""})</span>
                </button>
              )}
            </div>
          )}
          {isPolicier && !canPoliceBlock && blocksRemaining === 0 && !room.policeBlockedId && (
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Shield size={13} /> Tu as épuisé tous tes blocages
            </p>
          )}
          {isPolicier && room.policeBlockedId && (
            <p className="text-sm text-blue-300 flex items-center gap-1.5">
              <Shield size={13} /> Joueur bloqué : {room.players.find((p) => p.id === room.policeBlockedId)?.name ?? "?"}
            </p>
          )}

          {/* Fou power */}
          {canFouActivate && (
            <button onClick={fouActivate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-yellow-800 hover:bg-yellow-700 text-yellow-200 transition-all active:scale-95">
              <Zap size={14} /> Activer mon pouvoir
            </button>
          )}
          {isFou && room.fouActivated && (
            <p className="text-sm text-yellow-300 flex items-center gap-1.5">
              <Zap size={13} /> Ton pouvoir est actif ce round !
            </p>
          )}

          {error && (
            <div onClick={clearError} className="w-full px-3 py-2 rounded-xl bg-red-900/30 border border-red-700 text-red-300 text-xs cursor-pointer text-center">
              {error}
            </div>
          )}

          {isHost && (
            <button onClick={forceReveal}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-pink-700 hover:bg-pink-600 text-white transition-all active:scale-95">
              <Eye size={14} /> Révéler la réponse
            </button>
          )}
        </div>

        <ChatPanel className="h-[28rem]" />
      </div>
    </div>
  );
}
