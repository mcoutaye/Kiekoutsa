"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGame } from "@/contexts/GameContext";

export default function PlayingPhase() {
  const { room, playerId, castVote, forceReveal } = useGame();
  const audioElRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(100);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  if (!room || !room.currentTrack) return null;

  const track = room.currentTrack;
  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const shouldPlayAudio =
    room.playbackMode === "sync" ||
    (room.playbackMode === "master" && isHost);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setProgress(100);
    setAudioPlaying(false);
    if (progressRef.current) clearInterval(progressRef.current);

    const startProgress = () => {
      let elapsed = 0;
      progressRef.current = setInterval(() => {
        elapsed++;
        setProgress(Math.max(0, 100 - (elapsed / 30) * 100));
        if (elapsed >= 30 && progressRef.current) clearInterval(progressRef.current);
      }, 1000);
    };

    if (shouldPlayAudio && track.previewUrl && audioElRef.current) {
      const audio = audioElRef.current;
      audio.src = track.previewUrl;
      audio.volume = 1.0;
      audio.load();
      audio.play()
        .then(() => { setAudioPlaying(true); startProgress(); })
        .catch((e) => { console.error("play() error:", e); startProgress(); });
    } else {
      startProgress();
    }

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (audioElRef.current) {
        audioElRef.current.pause();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  const myVote = room.myVote;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 max-w-4xl mx-auto w-full">
      {/* Élément audio natif (caché) */}
      {shouldPlayAudio && track.previewUrl && (
        <audio ref={audioElRef} style={{ display: "none" }} />
      )}

      {/* Track info */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className={`w-52 h-52 rounded-full overflow-hidden border-4 border-purple-600 shadow-2xl shadow-purple-900/50 ${
              audioPlaying ? "vinyl-spin" : ""
            }`}
          >
            {track.albumCover ? (
              <Image src={track.albumCover} alt={track.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-6xl">🎵</div>
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-700" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-black text-white">{track.name}</h2>
          <p className="text-gray-400 text-lg">{track.artists}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0:00</span>
            <span>0:30</span>
          </div>
        </div>

        {room.playbackMode === "master" && !isHost && (
          <p className="text-gray-500 text-sm flex items-center gap-2">
            <span>📺</span> Le son joue chez le host
          </p>
        )}
        {!track.previewUrl && (
          <p className="text-orange-400 text-sm">⚠️ Pas d&apos;extrait disponible</p>
        )}
      </div>

      {/* Vote section */}
      <div className="w-full max-w-sm">
        <h3 className="text-center font-semibold text-gray-400 mb-4 text-sm uppercase tracking-wider">
          Qui a mis ce son ?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {room.players.map((p) => (
            <button
              key={p.id}
              onClick={() => !myVote && castVote(p.id)}
              disabled={!!myVote}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all active:scale-95
                text-sm border-2
                ${
                  myVote === p.id
                    ? "border-purple-500 bg-purple-900/40 text-purple-300"
                    : myVote
                    ? "border-transparent opacity-50 cursor-default"
                    : "border-transparent hover:border-purple-600 hover:bg-purple-900/20 cursor-pointer"
                }`}
              style={{ background: myVote === p.id ? undefined : "var(--surface)" }}
            >
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold uppercase flex-shrink-0">
                {p.name[0]}
              </div>
              <span className="truncate">{p.name}</span>
              {p.id === playerId && (
                <span className="text-gray-500 text-xs ml-auto">(moi)</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>{room.votedPlayerIds.length}/{room.players.length} ont voté</span>
          {myVote && <span className="text-purple-400">✓ Vote enregistré</span>}
        </div>

        {isHost && (
          <button
            onClick={forceReveal}
            className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium
              bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Révéler maintenant (host)
          </button>
        )}
      </div>
    </div>
  );
}
