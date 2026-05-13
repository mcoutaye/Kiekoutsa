"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Plus, Check, X, ArrowRight, Target, Music, RefreshCw, Loader2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import type { SpotifyTrack } from "@/types/game";

export default function Selection() {
  const { room, playerId, addTrack, removeTrack, setReady, startModeSelection, guesserPickTrack, error } = useGame();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Playlist mode state
  const [playlistProvider, setPlaylistProvider] = useState<"spotify" | "deezer" | null>(null);
  const [playlistToken, setPlaylistToken] = useState<string | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState("");
  const [swapsLeft, setSwapsLeft] = useState<number | null>(null);

  // Pick up OAuth token from URL after redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pt = params.get("pt");
    const pp = params.get("pp") as "spotify" | "deezer" | null;
    if (pt && pp) {
      sessionStorage.setItem("kiekoutsa_pt", pt);
      sessionStorage.setItem("kiekoutsa_pp", pp);
      // Clean URL
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
    const storedPt = sessionStorage.getItem("kiekoutsa_pt");
    const storedPp = sessionStorage.getItem("kiekoutsa_pp") as "spotify" | "deezer" | null;
    if (storedPt && storedPp) {
      setPlaylistToken(storedPt);
      setPlaylistProvider(storedPp);
    }
  }, []);

  if (!room) return null;
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const myTracks = room.myTracks ?? [];
  const allReady = room.players.every((p) => p.isReady);
  const { minTracks, maxTracks } = room.settings;
  const isGuesser = room.myRole === "guesser";
  const guesserPickDone = !!room.guesserPickId;
  const isCible = room.settings.gameMode === "cible";
  const isPlaylist = room.settings.gameMode === "playlist";
  const myTarget = isCible && room.myTargetId
    ? room.players.find((p) => p.id === room.myTargetId)
    : null;

  const swapsAllowed = room.settings.playlistSwapsAllowed ?? 2;
  const showPlaylistTracks = room.settings.showPlaylistTracks ?? true;

  // Fetch liked tracks and auto-add them to the room
  const fetchAndAddLikedTracks = useCallback(async (token: string, provider: "spotify" | "deezer") => {
    setPlaylistLoading(true);
    setPlaylistError("");
    try {
      const res = await fetch(`/api/playlist/liked?provider=${provider}&token=${encodeURIComponent(token)}&count=${maxTracks}`);
      const data = await res.json();
      if (data.error === "no_liked_tracks") {
        setPlaylistError("Aucune musique likée trouvée sur ton compte.");
        return;
      }
      if (!data.tracks?.length) {
        setPlaylistError("Impossible de récupérer tes musiques. Réessaie.");
        return;
      }
      // Remove any previously added tracks first
      for (const t of myTracks) await removeTrack(t.id);
      // Add fetched tracks
      for (const t of data.tracks.slice(0, maxTracks)) {
        await addTrack({ id: t.id, name: t.name, artists: t.artists, albumCover: t.albumCover, previewUrl: t.previewUrl });
      }
      setSwapsLeft(swapsAllowed);
      // Auto-ready if no swaps and not showing tracks
      if (swapsAllowed === 0 && !showPlaylistTracks) {
        setReady(true);
      }
    } catch {
      setPlaylistError("Erreur lors de la récupération de tes musiques.");
    } finally {
      setPlaylistLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxTracks, swapsAllowed, showPlaylistTracks]);

  // Swap one track with a new random one from liked pool (or re-fetch if pool exhausted)
  const swapTrack = async (trackId: string) => {
    if (swapsLeft === null || swapsLeft <= 0 || !playlistToken || !playlistProvider) return;
    setPlaylistLoading(true);
    try {
      // Get fresh batch from API to pick from (avoid same tracks)
      const res = await fetch(`/api/playlist/liked?provider=${playlistProvider}&token=${encodeURIComponent(playlistToken)}&count=${maxTracks * 3}`);
      const data = await res.json();
      const pool: SpotifyTrack[] = data.tracks ?? [];
      const currentIds = new Set(myTracks.filter((t) => t.id !== trackId).map((t) => t.id));
      const candidate = pool.find((t) => !currentIds.has(t.id) && t.id !== trackId);
      if (candidate) {
        await removeTrack(trackId);
        await addTrack({ id: candidate.id, name: candidate.name, artists: candidate.artists, albumCover: candidate.albumCover, previewUrl: candidate.previewUrl });
        setSwapsLeft((s) => (s ?? 1) - 1);
      }
    } catch {
      // silent
    } finally {
      setPlaylistLoading(false);
    }
  };

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

  // ── Playlist mode full render ──────────────────────────────────────────────
  if (isPlaylist) {
    const connected = !!playlistToken && !!playlistProvider;
    const tracksReady = myTracks.length >= minTracks;
    const autoReady = swapsAllowed === 0 && !showPlaylistTracks;

    return (
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-6 gap-6">
        {/* Left: connect + tracks */}
        <div className="flex-1 flex flex-col min-w-0 gap-5">
          <div>
            <h2 className="font-bold text-xl mb-1 flex items-center gap-2">
              <Music size={18} className="text-green-400" /> Mode Liké
            </h2>
            <p className="text-gray-400 text-sm">
              {!connected
                ? "Connecte ton compte pour que Kiekoutsa pioche dans tes musiques likées."
                : autoReady
                ? "Tes musiques ont été piochées automatiquement."
                : `${myTracks.length} musique${myTracks.length > 1 ? "s" : ""} piochée${myTracks.length > 1 ? "s" : ""} · ${swapsLeft ?? swapsAllowed} swap${(swapsLeft ?? swapsAllowed) > 1 ? "s" : ""} restant${(swapsLeft ?? swapsAllowed) > 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Connect buttons */}
          {!connected && (
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`/api/auth/spotify?roomCode=${room.code}&playerId=${playerId}`}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: "#1DB954", color: "#000" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.87 7.077-.496 9.712 1.115a.623.623 0 01.207.857zm1.224-2.723a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.519-.972c3.632-1.102 8.147-.568 11.234 1.328a.78.78 0 01.257 1.072zm.105-2.835C14.692 9.15 9.375 8.977 6.297 9.92a.937.937 0 11-.543-1.794c3.532-1.072 9.404-.865 13.115 1.338a.937.937 0 01-.954 1.402z"/></svg>
                Connecter Spotify
              </a>
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm opacity-30 cursor-not-allowed"
                style={{ background: "#A238FF", color: "#fff" }}
                title="Deezer temporairement indisponible"
              >
                <Music size={16} /> Deezer (bientôt)
              </button>
            </div>
          )}

          {/* Fetch button (connected but no tracks yet) */}
          {connected && myTracks.length === 0 && !playlistLoading && (
            <button
              onClick={() => fetchAndAddLikedTracks(playlistToken!, playlistProvider!)}
              className="w-full py-3 rounded-xl font-bold text-sm bg-green-700 hover:bg-green-600 text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Music size={15} /> Piocher mes musiques
            </button>
          )}

          {playlistLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </div>
          )}

          {playlistError && (
            <p className="text-red-400 text-sm text-center">{playlistError}</p>
          )}

          {/* Piochées tracks — different display */}
          {connected && myTracks.length > 0 && (showPlaylistTracks || swapsAllowed > 0) && (
            <div className="space-y-2">
              {myTracks.map((t) => (
                <div key={t.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {t.albumCover
                    ? <img src={t.albumCover} alt={t.name} width={48} height={48} className="rounded-lg flex-shrink-0 object-cover" />
                    : <div className="w-12 h-12 rounded-lg bg-gray-800 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                    <p className="text-gray-400 text-xs truncate">{t.artists}</p>
                  </div>
                  {swapsLeft !== null && swapsLeft > 0 && !me?.isReady && (
                    <button
                      onClick={() => swapTrack(t.id)}
                      disabled={playlistLoading}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-900/40 border border-green-700 text-green-300 hover:bg-green-800/50 transition-all disabled:opacity-40"
                    >
                      <RefreshCw size={12} /> Swap
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Auto-ready message */}
          {connected && autoReady && myTracks.length >= minTracks && (
            <div className="flex items-center justify-center gap-2 py-4 text-green-400 text-sm font-semibold">
              <Check size={14} /> Musiques piochées — en attente des autres joueurs
            </div>
          )}
        </div>

        {/* Right: status + ready */}
        <div className="lg:w-80 flex flex-col gap-4">
          {connected && myTracks.length > 0 && !autoReady && (
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-gray-400">
                Sélection ({myTracks.length}/{maxTracks})
              </h3>
              {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
              <button
                onClick={() => setReady(!me?.isReady)}
                disabled={!me?.isReady && !tracksReady}
                className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 text-sm
                  ${me?.isReady ? "bg-green-700 hover:bg-green-600 text-white" : tracksReady ? "bg-green-700 hover:bg-green-600 text-white" : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}
              >
                {me?.isReady ? "Prêt — annuler" : tracksReady ? "Je suis prêt !" : `En attente (${myTracks.length}/${minTracks} min)`}
              </button>
            </div>
          )}

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

  // ── Normal mode render ──────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-6 gap-6">
      {/* Left: search */}
      <div className="flex-1 flex flex-col min-w-0">
        {isCible && myTarget && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-pink-500 bg-pink-900/20">
            <Target size={16} className="text-pink-400 flex-shrink-0" />
            <span className="text-sm text-pink-300 font-semibold">Ta cible :</span>
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
              {myTarget.avatar ? <img src={myTarget.avatar} alt={myTarget.name} className="w-full h-full object-cover" /> : null}
            </div>
            <span className="font-bold text-white text-sm">{myTarget.name}</span>
          </div>
        )}
        <h2 className="font-bold text-xl mb-1">Choisis tes musiques</h2>
        <p className="text-gray-400 text-sm mb-4">
          {isCible
            ? `${myTracks.length === 0 ? "Aucune" : myTracks.length} musique sélectionnée — choisis 1 son pour ta cible`
            : `${myTracks.length} sélectionnée${myTracks.length !== 1 ? "s" : ""} — entre ${minTracks} et ${maxTracks}`}
        </p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={query} onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Recherche un titre, un artiste…"
            className="w-full pl-11 pr-12 py-3 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-purple-500"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setSearchError("");
                if (debounceRef.current) clearTimeout(debounceRef.current);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Effacer la recherche"
            >
              <X size={12} />
            </button>
          )}
          {searching && <span className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 text-xs">…</span>}
        </div>

        {searchError && <p className="text-red-400 text-sm mb-3">{searchError}</p>}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {results.length === 0 && query.length >= 2 && !searching && (
            <p className="text-gray-500 text-sm text-center py-8">Aucun résultat pour &quot;{query}&quot;</p>
          )}
          {results.map((track) => {
            const added = isAdded(track.id);
            const full = isCible ? myTracks.length >= 1 : myTracks.length >= maxTracks;
            return (
              <div key={track.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${added ? "opacity-50" : !full ? "cursor-pointer hover:bg-white/5" : ""}`}
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onClick={() => !added && !full && addTrack({ id: track.id, name: track.name, artists: track.artists, albumCover: track.albumCover, previewUrl: track.previewUrl })}>
                {track.albumCover ? (
                  <img src={track.albumCover} alt={track.name} width={48} height={48} className="rounded-lg flex-shrink-0" />
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
            {isCible ? `Ma sélection (${myTracks.length}/1)` : `Ma sélection (${myTracks.length}/${maxTracks})`}
          </h3>
          {myTracks.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">Aucune musique ajoutée</p>
          )}
          <div className="space-y-2">
            {myTracks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--bg)" }}>
                {t.albumCover && <img src={t.albumCover} alt={t.name} width={32} height={32} className="rounded flex-shrink-0" />}
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
            disabled={!me?.isReady && (isCible ? myTracks.length !== 1 : myTracks.length < minTracks)}
            className={`w-full mt-4 py-3 rounded-xl font-bold transition-all active:scale-95 text-sm
              ${me?.isReady ? "bg-green-700 hover:bg-green-600 text-white" : (isCible ? myTracks.length === 1 : myTracks.length >= minTracks) ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}>
            {me?.isReady ? "Prêt — annuler" : isCible ? (myTracks.length === 1 ? "Je suis prêt !" : "Sélectionne 1 musique") : `Prêt (${myTracks.length}/${minTracks} min)`}
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
