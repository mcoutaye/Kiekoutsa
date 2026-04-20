"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, Plus, Check, X, ArrowRight } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import type { SpotifyTrack } from "@/types/game";

export default function Selection() {
  const { room, playerId, addTrack, removeTrack, setReady, startModeSelection, guesserPickTrack, error } = useGame();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  if (!room) return null;
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const myTracks = room.myTracks ?? [];
  const allReady = room.players.every((p) => p.isReady);
  const { minTracks, maxTracks } = room.settings;
  const isGuesser = room.myRole === "guesser";
  const guesserPickDone = !!room.guesserPickId;

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true); setSearchError("");
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) setSearchError(data.error);
      else setResults(data.tracks ?? []);
    } catch { setSearchError("Erreur de recherche"); }
    finally { setSearching(false); }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const isAdded = (id: string) => myTracks.some((t) => t.id === id);

  return (
    <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-6 gap-6">
      {/* Left: search */}
      <div className="flex-1 flex flex-col min-w-0">
        <h2 className="font-bold text-xl mb-1">Choisis tes musiques</h2>
        <p className="text-gray-400 text-sm mb-4">
          {myTracks.length} sélectionnée{myTracks.length !== 1 ? "s" : ""} — entre {minTracks} et {maxTracks}
        </p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={query} onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Recherche un titre, un artiste…"
            className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-purple-500"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">…</span>}
        </div>

        {searchError && <p className="text-red-400 text-sm mb-3">{searchError}</p>}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {results.length === 0 && query.length >= 2 && !searching && (
            <p className="text-gray-500 text-sm text-center py-8">Aucun résultat pour &quot;{query}&quot;</p>
          )}
          {results.map((track) => {
            const added = isAdded(track.id);
            const full = myTracks.length >= maxTracks;
            return (
              <div key={track.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${added ? "opacity-50" : !full ? "cursor-pointer hover:bg-white/5" : ""}`}
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onClick={() => !added && !full && addTrack({ id: track.id, name: track.name, artists: track.artists, albumCover: track.albumCover, previewUrl: track.previewUrl })}>
                {track.albumCover ? (
                  <Image src={track.albumCover} alt={track.name} width={48} height={48} className="rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-800 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-white text-sm">{track.name}</p>
                  <p className="text-gray-400 text-xs truncate">{track.artists}</p>
                  {!track.previewUrl && <p className="text-orange-400 text-xs">Pas d&apos;extrait</p>}
                </div>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${added ? "bg-green-800 text-green-400" : full ? "bg-gray-700 text-gray-500" : "bg-purple-700 hover:bg-purple-600 text-white"}`}>
                  {added ? <Check size={14} /> : <Plus size={14} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right */}
      <div className="lg:w-80 flex flex-col gap-4">
        {/* My tracks */}
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-gray-400">
            Ma sélection ({myTracks.length}/{maxTracks})
          </h3>
          {myTracks.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">Aucune musique ajoutée</p>
          )}
          <div className="space-y-2">
            {myTracks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--bg)" }}>
                {t.albumCover && <Image src={t.albumCover} alt={t.name} width={32} height={32} className="rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-gray-500 truncate">{t.artists}</p>
                </div>
                {!me?.isReady && (
                  <button onClick={() => removeTrack(t.id)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <button onClick={() => setReady(!me?.isReady)}
            disabled={!me?.isReady && myTracks.length < minTracks}
            className={`w-full mt-4 py-3 rounded-xl font-bold transition-all active:scale-95 text-sm
              ${me?.isReady ? "bg-green-700 hover:bg-green-600 text-white" : myTracks.length >= minTracks ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}>
            {me?.isReady ? "Prêt — annuler" : `Prêt (${myTracks.length}/${minTracks} min)`}
          </button>
        </div>

        {/* Guesser pick */}
        {isGuesser && (
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid #4ade80" }}>
            <h3 className="font-bold mb-1 text-sm uppercase tracking-wider text-green-400">Rôle : Guesser</h3>
            <p className="text-xs text-gray-400 mb-3">Choisis un son que tu penses qu&apos;un autre joueur va ajouter. Si tu as raison → +10 pts et le round saute le vote !</p>
            {guesserPickDone && room.guesserPick ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--bg)" }}>
                {room.guesserPick.albumCover ? (
                  <img src={room.guesserPick.albumCover} alt="" className="w-10 h-10 rounded flex-shrink-0 object-cover" />
                ) : <div className="w-10 h-10 rounded bg-gray-800 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-green-400 mb-0.5">✓ Prédiction</p>
                  <p className="text-sm font-medium truncate text-white">{room.guesserPick.name}</p>
                  <p className="text-xs text-gray-500 truncate">{room.guesserPick.artists}</p>
                </div>
              </div>
            ) : guesserPickDone ? (
              <p className="text-green-400 text-sm font-semibold text-center py-2">✓ Prédiction enregistrée !</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-3">Cherche un son ci-contre puis clique dessus</p>
                ) : (
                  results.map((track) => (
                    <button key={track.id} onClick={() => guesserPickTrack({ id: track.id, name: track.name, artists: track.artists, albumCover: track.albumCover, previewUrl: track.previewUrl, addedBy: playerId })}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-900/30 transition-colors text-left text-xs border border-transparent hover:border-green-700">
                      {track.albumCover ? <img src={track.albumCover} alt="" className="w-8 h-8 rounded flex-shrink-0 object-cover" /> : <div className="w-8 h-8 rounded bg-gray-800 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-white">{track.name}</p>
                        <p className="text-gray-500 truncate">{track.artists}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Players status — sans afficher les trackCounts */}
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-gray-400">Statut</h3>
          <div className="space-y-2">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isReady ? "bg-green-500" : "bg-gray-600"}`} />
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                  {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : null}
                </div>
                <span className="text-sm flex-1 truncate text-gray-300">
                  {p.name}{p.id === playerId && <span className="text-gray-500 text-xs ml-1">(toi)</span>}
                </span>
                {p.isReady && <Check size={12} className="text-green-500 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {isHost && (
            <button onClick={startModeSelection} disabled={!allReady}
              className={`w-full mt-4 py-3 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2
                ${allReady ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}>
              {allReady ? <><span>Continuer</span><ArrowRight size={14} /></> : "Attendre tout le monde…"}
            </button>
          )}
          {!isHost && allReady && (
            <p className="text-center text-green-400 text-sm mt-3 flex items-center justify-center gap-1">
              <Check size={14} /> Tout le monde est prêt !
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
