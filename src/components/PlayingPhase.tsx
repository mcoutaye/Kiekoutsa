"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, Eye, Check, Shield, Zap } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import ChatPanel from "@/components/ChatPanel";
import type { RoleName } from "@/types/game";

export default function PlayingPhase() {
  const { room, playerId, audioSignal, castVote, forceReveal, hostStartMusic, transitionToVoting, policeBlock, fouActivate } = useGame();
  const audioElRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(100);
  const [, setAudioPlaying] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const hostTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [pendingVote, setPendingVote] = useState<string | null>(null);
  const [showPoliceSelect, setShowPoliceSelect] = useState(false);

  if (!room || !room.currentTrack) return null;

  const track = room.currentTrack;
  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const myVote = room.myVote ?? null;
  const shouldPlayAudio =
    room.playbackMode === "sync" ||
    (room.playbackMode === "master" && isHost);

  const cachedRole = typeof window !== "undefined"
    ? sessionStorage.getItem("kiekoutsa_my_role") as RoleName | null
    : null;
  const effectiveRole = room.myRole ?? cachedRole;
  const isPolicier = effectiveRole === "policier";
  const isFou = effectiveRole === "fou";
  const isBlocked = room.policeBlockedId === playerId;
  const blocksRemaining = (room.settings.policeBlocksPerGame ?? 1) - (room.policeBlocksUsed ?? 0);
  const canPoliceBlock = isPolicier && !room.policeBlockedId && blocksRemaining > 0;
  const fouActivationsRemaining = (room.settings.fouActivationsPerGame ?? 1) - (room.fouActivationsUsed ?? 0);
  const canFouActivate = isFou && !room.fouActivated && track.addedBy !== playerId && fouActivationsRemaining > 0;
  const chatEnabled = true;

  // Reset pending vote on new track
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { setPendingVote(null); }, [track.id]);

  // Start audio + progress when playing_started_at is set (audioSignal changes)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!room.playingStartedAt) return;

    setProgress(100);
    setAudioPlaying(false);
    if (progressRef.current) clearInterval(progressRef.current);
    if (hostTimerRef.current) clearTimeout(hostTimerRef.current);

    // Compute elapsed time already passed
    const elapsed = Math.max(0, (Date.now() - new Date(room.playingStartedAt).getTime()) / 1000);
    const remaining = Math.max(0, 30 - elapsed);
    setProgress((remaining / 30) * 100);

    // Audio
    if (shouldPlayAudio && track.previewUrl && audioElRef.current) {
      const audio = audioElRef.current;
      audio.src = track.previewUrl;
      audio.volume = 1.0;
      audio.currentTime = Math.min(elapsed, 29);
      audio.load();
      audio.play().then(() => setAudioPlaying(true)).catch(() => {});
    }

    // Progress bar tick
    let elapsed2 = elapsed;
    progressRef.current = setInterval(() => {
      elapsed2++;
      setProgress(Math.max(0, ((30 - elapsed2) / 30) * 100));
      if (elapsed2 >= 30 && progressRef.current) clearInterval(progressRef.current);
    }, 1000);

    // Host auto-transition after remaining time
    if (isHost && remaining > 0) {
      hostTimerRef.current = setTimeout(() => {
        transitionToVoting();
      }, remaining * 1000 + 500);
    }

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (hostTimerRef.current) clearTimeout(hostTimerRef.current);
      if (audioElRef.current) audioElRef.current.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSignal, room.playingStartedAt, track.id]);

  const handleVoteClick = (pid: string) => {
    if (!room.settings.allowSelfVote && pid === playerId) return;
    setPendingVote(pid);
  };

  const confirmVote = () => {
    if (pendingVote) castVote(pendingVote);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-5xl mx-auto w-full">
      <audio ref={audioElRef} style={{ display: "none" }} />

      {/* Track info */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className={`w-44 h-44 rounded-full overflow-hidden border-4 border-purple-600 shadow-2xl shadow-purple-900/50 ${room.playingStartedAt && progress > 0 ? "vinyl-spin" : ""}`}>
            {track.albumCover ? (
              <Image src={track.albumCover} alt={track.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-800" />
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-7 h-7 rounded-full bg-gray-900 border-2 border-gray-700" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-black text-white">{track.name}</h2>
          <p className="text-gray-400">{track.artists}</p>
        </div>

        {/* Host start music button (when autoPlay=false) */}
        {isHost && !room.playingStartedAt && !room.settings.autoPlay && (
          <button onClick={hostStartMusic}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500 text-white transition-all active:scale-95">
            <Play size={16} /> Lancer la musique
          </button>
        )}

        {/* Progress bar */}
        {room.playingStartedAt && (
          <div className="w-full max-w-xs">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full bg-purple-500 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {room.playbackMode === "master" && !isHost && (
          <p className="text-gray-500 text-sm">Le son joue chez le host</p>
        )}
        {!track.previewUrl && <p className="text-orange-400 text-sm">Pas d&apos;extrait disponible</p>}
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {/* Vote section */}
          <div className="w-full max-w-2xl">
            <h3 className="text-center font-semibold text-gray-400 mb-3 text-xs uppercase tracking-wider">
              Qui a mis ce son ?
            </h3>
            {isBlocked && (
              <div className="mb-3 px-4 py-2 rounded-xl bg-red-900/30 border border-red-600 text-red-300 text-sm text-center font-semibold">
                Tu as été bloqué par le Policier — tu ne peux pas voter ce round
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {room.players.map((p) => {
                const isSelf = p.id === playerId;
                const locked = !!myVote || isBlocked;
                const disabled = (!room.settings.allowSelfVote && isSelf) || locked;
                const isPending = !locked && pendingVote === p.id;
                const isConfirmed = myVote === p.id;
                const voteCount = room.voteCounts[p.id] ?? 0;

                return (
                  <button key={p.id} onClick={() => !disabled && handleVoteClick(p.id)}
                    disabled={disabled}
                    className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border-2 transition-all
                      ${isPending ? "border-purple-500 bg-purple-900/40 text-purple-200" : isConfirmed ? "border-green-500 bg-green-900/30 text-green-300" : disabled ? "border-transparent opacity-30 cursor-not-allowed" : "border-transparent hover:border-purple-500/50 cursor-pointer"}`}
                    style={{ background: isPending || isConfirmed ? undefined : "var(--surface)" }}>
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                      {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : null}
                    </div>
                    <span className="flex-1 truncate font-medium text-left">{p.name}</span>
                    {voteCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-700 text-white text-xs flex items-center justify-center font-bold">
                        {voteCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{room.votedPlayerIds.length}/{room.players.length} ont voté</span>
            </div>

            {myVote ? (
              <p className="text-center text-green-400 text-xs mt-3 flex items-center justify-center gap-1">
                <Check size={12} /> Vote verrouillé
              </p>
            ) : isBlocked ? null : pendingVote ? (
              <button onClick={confirmVote}
                className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 bg-purple-600 hover:bg-purple-500 text-white">
                Confirmer mon vote
              </button>
            ) : null}

            {isHost && (
              <button onClick={forceReveal}
                className="w-full mt-2 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
                <Eye size={12} /> Révéler maintenant
              </button>
            )}

            {/* Policier power */}
            {canPoliceBlock && (
              <div className="mt-3">
                {showPoliceSelect ? (
                  <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold text-blue-300 mb-2">Choisir un joueur à bloquer :</p>
                    <div className="space-y-1">
                      {room.players.filter((p) => p.id !== playerId && !room.votedPlayerIds.includes(p.id)).map((p) => (
                        <button key={p.id} onClick={() => { policeBlock(p.id); setShowPoliceSelect(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-xs">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                            {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : null}
                          </div>
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowPoliceSelect(false)} className="mt-1 text-xs text-gray-500 hover:text-gray-300">Annuler</button>
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
            {isPolicier && room.policeBlockedId && (
              <p className="text-xs text-blue-300 flex items-center gap-1.5 mt-2">
                <Shield size={12} /> Bloqué : {room.players.find((p) => p.id === room.policeBlockedId)?.name ?? "?"}
              </p>
            )}

            {/* Fou power */}
            {canFouActivate && (
              <button onClick={() => fouActivate()}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-yellow-800 hover:bg-yellow-700 text-yellow-200 transition-all active:scale-95">
                <Zap size={14} /> Activer mon pouvoir
              </button>
            )}
            {isFou && room.fouActivated && (
              <p className="text-xs text-yellow-300 flex items-center gap-1.5 mt-2">
                <Zap size={12} /> Ton pouvoir est actif ce round !
              </p>
            )}
          </div>
        </div>

        {chatEnabled && (
          <ChatPanel className="h-[28rem]" />
        )}
      </div>
    </div>
  );
}
