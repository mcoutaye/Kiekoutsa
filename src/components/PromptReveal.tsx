"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, SkipForward, ArrowRight, CheckCircle2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import ChatPanel from "@/components/ChatPanel";

export default function PromptReveal() {
  const { room, playerId, castPromptVote, forceRevealPrompt, nextPrompt } = useGame();

  // Listening phase state
  const [listeningDone, setListeningDone] = useState(false);
  const [currentListenIdx, setCurrentListenIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPromptIndexRef = useRef<number>(-1);

  // Vote phase state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const voteAudioRef = useRef<HTMLAudioElement | null>(null);

  const submissions = room?.promptRevealSubmissions ?? [];
  const currentPromptIndex = room?.currentPromptIndex ?? 0;

  // Reset listening phase when prompt changes
  useEffect(() => {
    if (currentPromptIndex !== prevPromptIndexRef.current) {
      prevPromptIndexRef.current = currentPromptIndex;
      audioRef.current?.pause();
      audioRef.current = null;
      setListeningDone(false);
      setCurrentListenIdx(0);
      setIsPlaying(false);
      voteAudioRef.current?.pause();
      voteAudioRef.current = null;
      setPlayingId(null);
    }
  }, [currentPromptIndex]);

  // Auto-play current track during listening phase
  useEffect(() => {
    if (listeningDone || submissions.length === 0) return;
    const sub = submissions[currentListenIdx];
    if (!sub) return;

    audioRef.current?.pause();
    if (sub.track.previewUrl) {
      const audio = new Audio(sub.track.previewUrl);
      audio.play().catch(() => {});
      audio.onended = () => advanceListening();
      audioRef.current = audio;
      setIsPlaying(true);
    } else {
      // No preview: skip after 1s
      const t = setTimeout(() => advanceListening(), 1000);
      return () => clearTimeout(t);
    }

    return () => { audioRef.current?.pause(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListenIdx, listeningDone, currentPromptIndex]);

  const advanceListening = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setCurrentListenIdx((prev) => {
      const next = prev + 1;
      if (next >= submissions.length) {
        setListeningDone(true);
        return prev;
      }
      return next;
    });
  };

  const toggleVotePlay = (id: string, url: string | null) => {
    if (!url) return;
    if (playingId === id) {
      voteAudioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    voteAudioRef.current?.pause();
    const audio = new Audio(url);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingId(null);
    voteAudioRef.current = audio;
    setPlayingId(id);
  };

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const isRevealed = room.isCurrentPromptRevealed;
  const currentResult = room.promptResults[room.currentPromptIndex];
  const isLastPrompt = room.currentPromptIndex >= room.totalPrompts - 1;
  const voteCount = Object.keys(room.promptVotes ?? {}).length;
  const eligibleVotersCount = room.players.length;

  // ── Results view (after host reveals) ──────────────────────────────────────
  if (isRevealed && currentResult) {
    const maxVotes = Math.max(0, ...Object.values(currentResult.votesBySubmitter));
    const sorted = [...currentResult.submissions].sort(
      (a, b) => (currentResult.votesBySubmitter[b.submitterId] ?? 0) - (currentResult.votesBySubmitter[a.submitterId] ?? 0)
    );

    return (
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 max-w-lg mx-auto overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Prompt {room.currentPromptIndex + 1} / {room.totalPrompts}</span>
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Prompt de {currentResult.promptOwnerName}</p>
            <p className="text-lg font-black text-white">"{currentResult.promptText}"</p>
          </div>

          <div className="flex flex-col gap-3 pb-4">
            {sorted.map((sub) => {
              const votes = currentResult.votesBySubmitter[sub.submitterId] ?? 0;
              const pts = currentResult.pointsEarned[sub.submitterId] ?? 0;
              const isWinner = votes > 0 && votes === maxVotes;
              return (
                <div
                  key={sub.submitterId}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: "var(--surface)",
                    border: isWinner ? "2px solid rgb(234 179 8 / 0.6)" : "1px solid var(--border)",
                  }}
                >
                  <button
                    onClick={() => toggleVotePlay(sub.submitterId, sub.track.previewUrl)}
                    className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative"
                  >
                    {sub.track.albumCover && (
                      <img src={sub.track.albumCover} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      {playingId === sub.submitterId
                        ? <Pause size={14} className="text-white" />
                        : <Play size={14} className="text-white" />}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{sub.track.name}</p>
                    <p className="text-gray-500 text-xs truncate">{sub.track.artists}</p>
                    <p className="text-xs mt-0.5">
                      <span className="text-gray-500">par </span>
                      <span className="text-blue-300 font-medium">{sub.submitterName}</span>
                      {isWinner && <span className="ml-1">🏆</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold">{votes} vote{votes !== 1 ? "s" : ""}</p>
                    {pts > 0 && <p className="text-green-400 text-xs font-semibold">+{pts} pts</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {isHost ? (
            <button
              onClick={nextPrompt}
              className="w-full py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight size={16} />
              {isLastPrompt ? "Voir les scores finaux" : "Prompt suivant"}
            </button>
          ) : (
            <p className="text-center text-gray-500 text-sm">En attente du host…</p>
          )}
        </div>
        <ChatPanel />
      </div>
    );
  }

  // ── Listening phase ─────────────────────────────────────────────────────────
  if (!listeningDone) {
    const currentSub = submissions[currentListenIdx];
    return (
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-5 max-w-lg mx-auto">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Prompt {room.currentPromptIndex + 1} / {room.totalPrompts}</span>
            <span>Musique {currentListenIdx + 1} / {submissions.length}</span>
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Prompt de {room.currentPromptOwnerName}</p>
            <p className="text-lg font-black text-white">"{room.currentPromptText}"</p>
          </div>

          {/* Current playing track */}
          {currentSub && (
            <div className="rounded-2xl p-5 flex flex-col items-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {currentSub.track.albumCover && (
                <img
                  src={currentSub.track.albumCover}
                  alt=""
                  className="w-32 h-32 rounded-2xl object-cover shadow-lg"
                />
              )}
              <div className="text-center">
                <p className="text-white font-bold text-lg">{currentSub.track.name}</p>
                <p className="text-gray-400 text-sm">{currentSub.track.artists}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
                <span className="text-xs text-gray-500">{isPlaying ? "Lecture en cours…" : "Chargement…"}</span>
              </div>
            </div>
          )}

          {/* All tracks mini-list */}
          <div className="flex gap-2 flex-wrap justify-center">
            {submissions.map((sub, i) => (
              <div
                key={sub.submitterId}
                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  i < currentListenIdx ? "border-green-500 opacity-50" :
                  i === currentListenIdx ? "border-blue-400 scale-110" : "border-gray-700 opacity-40"
                }`}
              >
                {sub.track.albumCover && (
                  <img src={sub.track.albumCover} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={advanceListening}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <SkipForward size={14} />
            {currentListenIdx < submissions.length - 1 ? "Musique suivante" : "Passer au vote"}
          </button>
        </div>
        <ChatPanel />
      </div>
    );
  }

  // ── Voting phase ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 max-w-lg mx-auto overflow-y-auto">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Prompt {room.currentPromptIndex + 1} / {room.totalPrompts}</span>
          <span>{voteCount}/{eligibleVotersCount} votes</span>
        </div>

        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Prompt de {room.currentPromptOwnerName}</p>
          <p className="text-lg font-black text-white">"{room.currentPromptText}"</p>
        </div>

        <div className="flex flex-col gap-3 pb-4">
          {room.promptRevealSubmissions.map((sub, i) => {
            const hasVoted = room.myPromptVote === sub.submitterId;
            const isMe = sub.submitterId === playerId;
            return (
              <div
                key={sub.submitterId}
                className="rounded-xl p-3 flex items-center gap-3 transition-all"
                style={{
                  background: "var(--surface)",
                  border: hasVoted ? "2px solid rgb(147 51 234)" : "1px solid var(--border)",
                }}
              >
                <button
                  onClick={() => toggleVotePlay(sub.submitterId, sub.track.previewUrl)}
                  className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative"
                >
                  {sub.track.albumCover && (
                    <img src={sub.track.albumCover} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    {playingId === sub.submitterId
                      ? <Pause size={14} className="text-white" />
                      : <Play size={14} className="text-white" />}
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{sub.track.name}</p>
                  <p className="text-gray-500 text-xs truncate">{sub.track.artists}</p>
                  <p className="text-gray-500 text-xs">Musique {i + 1}</p>
                </div>
                {!isMe ? (
                  <button
                    onClick={() => !room.myPromptVote && castPromptVote(sub.submitterId)}
                    disabled={!!room.myPromptVote}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      hasVoted
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 hover:bg-purple-600 text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                  >
                    {hasVoted ? <CheckCircle2 size={13} /> : "Voter"}
                  </button>
                ) : (
                  <span className="text-xs text-gray-600 italic">(toi)</span>
                )}
              </div>
            );
          })}
        </div>

        {isHost && (
          <button
            onClick={forceRevealPrompt}
            className="w-full py-3 rounded-xl font-bold text-white bg-pink-700 hover:bg-pink-600 transition-colors"
          >
            Révéler les votes ({voteCount}/{eligibleVotersCount})
          </button>
        )}
        {!isHost && room.myPromptVote && (
          <p className="text-center text-gray-500 text-sm">Vote enregistré, en attente…</p>
        )}
      </div>
      <ChatPanel />
    </div>
  );
}
