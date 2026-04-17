"use client";

import Image from "next/image";
import { ArrowRight, Check, X } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import ChatPanel from "@/components/ChatPanel";

export default function RevealPhase() {
  const { room, playerId, nextRound } = useGame();
  if (!room) return null;

  const last = room.roundResults[room.roundResults.length - 1];
  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const track = room.currentTrack;
  const hasMore = room.currentTrackIndex + 1 < room.totalTracks;
  const isOwner = last?.ownerId === playerId;
  const anonymous = room.settings.anonymousVotes;

  const getPlayer = (id: string) => room.players.find((p) => p.id === id);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5 max-w-5xl mx-auto w-full">
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-5">
          {/* Owner reveal */}
          <div className="text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">C&apos;était le son de…</p>
            <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl"
              style={{ background: "linear-gradient(135deg,#4c1d95,#831843)", border: "2px solid #a855f7" }}>
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                {getPlayer(last?.ownerId)?.avatar ? (
                  <img src={getPlayer(last?.ownerId)!.avatar} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="text-left">
                <p className="text-3xl font-black text-white">{last?.ownerName}</p>
                {isOwner && <p className="text-purple-300 text-sm">C&apos;est toi !</p>}
              </div>
            </div>
            {track && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {track.albumCover && (
                  <Image src={track.albumCover} alt={track.name} width={40} height={40} className="rounded-lg" />
                )}
                <div className="text-left">
                  <p className="font-bold text-sm">{track.name}</p>
                  <p className="text-gray-400 text-xs">{track.artists}</p>
                </div>
              </div>
            )}
          </div>

          {/* Votes breakdown */}
          {last && (
            <div className="w-full rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">
                {anonymous ? "Résultats" : "Les votes"}
              </h3>
              {anonymous ? (
                // Anonymous: show only vote counts per player
                <div className="space-y-2">
                  {room.players
                    .map((p) => ({ player: p, count: last.votes.filter((v) => v.suspectedId === p.id).length }))
                    .sort((a, b) => b.count - a.count)
                    .map(({ player, count }) => (
                      <div key={player.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                          {player.avatar ? <img src={player.avatar} alt="" className="w-full h-full object-cover" /> : null}
                        </div>
                        <span className="flex-1 text-sm text-gray-300">{player.name}</span>
                        <div className="flex gap-1">
                          {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${player.id === last.ownerId ? "bg-red-500" : "bg-purple-500"}`} />
                          ))}
                        </div>
                        <span className="text-sm font-bold w-6 text-right text-gray-400">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                // Non-anonymous: show who voted for whom
                <div className="space-y-1.5">
                  {last.votes.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-2">Personne n&apos;a voté</p>
                  ) : (
                    last.votes.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                          {getPlayer(v.voterId)?.avatar ? <img src={getPlayer(v.voterId)!.avatar} alt="" className="w-full h-full object-cover" /> : null}
                        </div>
                        <span className={`font-medium min-w-0 truncate ${v.voterId === playerId ? "text-purple-300" : "text-gray-300"}`}>
                          {v.voterName}
                        </span>
                        <span className="text-gray-600 flex-shrink-0">→</span>
                        <span className={`font-medium flex-1 truncate ${v.wasCorrect ? "text-green-400" : "text-red-400"}`}>
                          {v.suspectedName}
                        </span>
                        {v.wasCorrect ? <Check size={13} className="text-green-400 flex-shrink-0" /> : <X size={13} className="text-red-400 flex-shrink-0" />}
                        <span className={`text-xs font-bold flex-shrink-0 ${v.wasCorrect ? "text-green-400" : "text-gray-600"}`}>
                          {v.wasCorrect ? "+1" : ""}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Points this round */}
          {last && Object.keys(last.pointsEarned).length > 0 && (
            <div className="w-full rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Points gagnés</h3>
              <div className="space-y-1.5">
                {room.players
                  .map((p) => ({ player: p, pts: last.pointsEarned[p.id] ?? 0 }))
                  .sort((a, b) => b.pts - a.pts)
                  .map(({ player, pts }) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                        {player.avatar ? <img src={player.avatar} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                      <span className={`flex-1 text-sm ${player.id === playerId ? "text-purple-300" : "text-gray-300"}`}>
                        {player.name}
                      </span>
                      <span className={`font-bold text-sm ${pts > 0 ? "text-yellow-400" : "text-gray-600"}`}>
                        {pts > 0 ? `+${pts}` : "–"}
                      </span>
                      <span className="text-gray-500 text-xs w-14 text-right">{player.score} pts</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {isHost ? (
            <button onClick={nextRound}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 bg-purple-600 hover:bg-purple-500 text-white">
              {hasMore ? "Musique suivante" : "Voir les scores"} <ArrowRight size={18} />
            </button>
          ) : (
            <p className="text-gray-500 text-sm">En attente du host…</p>
          )}
        </div>

        <ChatPanel className="h-[28rem]" />
      </div>
    </div>
  );
}
