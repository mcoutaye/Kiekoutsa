"use client";

import Image from "next/image";
import { useGame } from "@/contexts/GameContext";

export default function RevealPhase() {
  const { room, playerId, nextRound } = useGame();
  if (!room) return null;

  const last = room.roundResults[room.roundResults.length - 1];
  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const isOwner = last?.ownerId === playerId;
  const track = room.currentTrack;
  const hasMore = room.currentTrackIndex + 1 < room.totalTracks;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-2xl mx-auto w-full">
      {/* Who added it */}
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-3">
          C&apos;était le son de…
        </p>
        <div
          className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl mb-2"
          style={{
            background: "linear-gradient(135deg, #4c1d95, #831843)",
            border: "2px solid #a855f7",
          }}
        >
          <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-black uppercase text-white">
            {last?.ownerName[0]}
          </div>
          <div>
            <p className="text-3xl font-black text-white">{last?.ownerName}</p>
            {isOwner && (
              <p className="text-purple-300 text-sm">C&apos;est toi !</p>
            )}
          </div>
        </div>

        {track && (
          <div className="flex items-center justify-center gap-3 mt-4">
            {track.albumCover && (
              <Image
                src={track.albumCover}
                alt={track.name}
                width={48}
                height={48}
                className="rounded-lg"
              />
            )}
            <div className="text-left">
              <p className="font-bold">{track.name}</p>
              <p className="text-gray-400 text-sm">{track.artists}</p>
            </div>
          </div>
        )}
      </div>

      {/* Votes breakdown */}
      {last && (
        <div
          className="w-full rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">
            Les votes
          </h3>
          <div className="space-y-2">
            {last.votes.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-2">
                Personne n&apos;a voté
              </p>
            ) : (
              last.votes.map((v, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className={`font-semibold min-w-[100px] truncate ${
                      v.voterId === playerId ? "text-purple-300" : "text-gray-300"
                    }`}
                  >
                    {v.voterName}
                    {v.voterId === playerId && " (toi)"}
                  </span>
                  <span className="text-gray-600">→</span>
                  <span
                    className={`font-semibold flex-1 truncate ${
                      v.wasCorrect ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {v.suspectedName}
                  </span>
                  <span
                    className={`font-bold flex-shrink-0 ${
                      v.wasCorrect ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {v.wasCorrect ? "✓ +1" : "✗"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Points earned */}
      {last && Object.keys(last.pointsEarned).length > 0 && (
        <div
          className="w-full rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">
            Points gagnés ce round
          </h3>
          <div className="space-y-2">
            {room.players
              .map((p) => ({ player: p, pts: last.pointsEarned[p.id] ?? 0 }))
              .sort((a, b) => b.pts - a.pts)
              .map(({ player, pts }) => (
                <div key={player.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-800 flex items-center justify-center text-xs font-bold uppercase text-white flex-shrink-0">
                    {player.name[0]}
                  </div>
                  <span
                    className={`flex-1 text-sm font-medium ${
                      player.id === playerId ? "text-purple-300" : "text-gray-300"
                    }`}
                  >
                    {player.name}
                    {player.id === playerId && " (toi)"}
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      pts > 0 ? "text-yellow-400" : "text-gray-600"
                    }`}
                  >
                    {pts > 0 ? `+${pts}` : "–"}
                  </span>
                  <span className="text-gray-500 text-xs w-12 text-right">
                    {player.score} pts
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Next round button (host) */}
      {isHost && (
        <button
          onClick={nextRound}
          className="px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-95
            bg-purple-600 hover:bg-purple-500 text-white"
        >
          {hasMore ? "Musique suivante →" : "Voir les scores finaux →"}
        </button>
      )}
      {!isHost && (
        <p className="text-gray-500 text-sm">En attente du host…</p>
      )}
    </div>
  );
}
