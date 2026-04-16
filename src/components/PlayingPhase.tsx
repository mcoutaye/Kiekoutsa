"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, Eye } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

export default function PlayingPhase() {
  const { room, playerId, audioSignal, castVote, forceReveal, hostStartMusic, transitionToVoting } = useGame();
  const audioElRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(100);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const hostTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pending vote (not yet confirmed to server)
  const [pendingVote, setPendingVote] = useState<string | null>(null);

  if (!room || !room.currentTrack) return null;

  const track = room.currentTrack;
  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const shouldPlayAudio =
    room.playbackMode === "sync" ||
    (room.playbackMode === "master" && isHost);
  const myVote = room.myVote;

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
      audio.play().then(() => setAudioPlaying(true)).catch(console.error);
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

  const pendingChanged = pendingVote !== null && pendingVote !== myVote;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-4xl mx-auto w-full">
      <audio ref={audioElRef} style={{ display: "none" }} />

      {/* Track info */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className={`w-44 h-44 rounded-full overflow-hidden border-4 border-purple-600 shadow-2xl shadow-purple-900/50 ${audioPlaying ? "vinyl-spin" : ""}`}>
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

      {/* Vote section */}
      <div className="w-full max-w-sm">
        <h3 className="text-center font-semibold text-gray-400 mb-3 text-xs uppercase tracking-wider">
          Qui a mis ce son ?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {room.players.map((p) => {
            const isSelf = p.id === playerId;
            const disabled = !room.settings.allowSelfVote && isSelf;
            const isPending = pendingVote === p.id;
            const isConfirmed = myVote === p.id;
            const voteCount = room.voteCounts[p.id] ?? 0;

            return (
              <button key={p.id} onClick={() => !disabled && handleVoteClick(p.id)}
                disabled={disabled}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border-2 transition-all
                  ${isPending ? "border-purple-500 bg-purple-900/40 text-purple-200" : isConfirmed && !isPending ? "border-green-600/50 bg-green-900/20 text-green-300" : disabled ? "border-transparent opacity-30 cursor-not-allowed" : "border-transparent hover:border-purple-500/50 cursor-pointer"}`}
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

        {/* Confirm button */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{room.votedPlayerIds.length}/{room.players.length} ont voté</span>
        </div>

        {pendingChanged && (
          <button onClick={confirmVote}
            className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 bg-purple-600 hover:bg-purple-500 text-white">
            {myVote ? "Modifier mon vote" : "Confirmer mon vote"}
          </button>
        )}
        {myVote && !pendingChanged && (
          <p className="text-center text-green-400 text-xs mt-3">Vote enregistré — tu peux le modifier</p>
        )}

        {isHost && (
          <button onClick={forceReveal}
            className="w-full mt-2 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
            <Eye size={12} /> Révéler maintenant
          </button>
        )}
      </div>
    </div>
  );
}
