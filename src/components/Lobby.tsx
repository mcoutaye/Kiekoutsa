"use client";

import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Crown, Settings, ChevronDown, ChevronUp, Users, Eye, EyeOff, Copy, Check, UserX } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-purple-600" : "bg-gray-700"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

export default function Lobby() {
  const { room, playerId, startSelection, setSettings, kickPlayer, error } = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!room) return null;
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const canStart = room.players.length >= 3;
  const s = room.settings;

  // Chat should be visible from lobby and throughout the game (except selection)
  const showChat = true;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-sm mx-auto w-full">
      {/* Room code */}
      <div className="text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Code du salon</p>
        <div
          className="text-5xl font-black tracking-widest text-purple-300 font-mono cursor-pointer select-none transition-all duration-300 mb-2"
          style={{ filter: codeVisible ? "none" : "blur(10px)" }}
          onClick={() => setCodeVisible((v) => !v)}
          title={codeVisible ? "Masquer" : "Révéler le code"}
        >
          {room.code}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setCodeVisible((v) => !v)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {codeVisible ? <EyeOff size={12} /> : <Eye size={12} />}
            {codeVisible ? "Masquer" : "Révéler"}
          </button>
          <span className="text-gray-700">·</span>
          <button onClick={copyCode} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
      </div>

      {/* Players */}
      <div className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-gray-500" />
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest">
            Joueurs ({room.players.length}/10)
          </h2>
        </div>
        <div className="space-y-2">
          {room.players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white uppercase">
                    {p.name[0]}
                  </div>
                )}
              </div>
              <span className="flex-1 font-medium text-white text-sm">{p.name}</span>
              {p.isHost && <Crown size={14} className="text-yellow-400 flex-shrink-0" />}
              {p.id === playerId && <span className="text-xs text-gray-500">(toi)</span>}
              {isHost && !p.isHost && p.id !== playerId && (
                <button onClick={() => kickPlayer(p.id)} className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0" title="Exclure">
                  <UserX size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {room.players.length < 3 && (
          <p className="text-center text-gray-500 text-xs mt-3">
            Besoin de {3 - room.players.length} joueur{3 - room.players.length > 1 ? "s" : ""} de plus…
          </p>
        )}
      </div>

      {/* Host settings */}
      {isHost && (
        <div className="w-full rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center gap-2">
              <Settings size={14} />
              Paramètres de la partie
            </div>
            {settingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {settingsOpen && (
            <div className="px-4 pb-4 pt-2 space-y-4" style={{ background: "var(--surface)" }}>
              {/* Track range */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">
                  Musiques par joueur : {s.minTracks} – {s.maxTracks}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Min</label>
                    <input type="range" min={1} max={5} value={s.minTracks}
                      onChange={(e) => setSettings({ minTracks: Number(e.target.value) })}
                      className="w-full accent-purple-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Max</label>
                    <input type="range" min={s.minTracks} max={10} value={s.maxTracks}
                      onChange={(e) => setSettings({ maxTracks: Number(e.target.value) })}
                      className="w-full accent-purple-500" />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              {[
                { key: "autoReveal", label: "Révéler auto quand tout le monde a voté" },
                { key: "autoPlay", label: "Lancer la musique automatiquement" },
                { key: "allowSelfVote", label: "Voter pour soi-même" },
                { key: "anonymousVotes", label: "Votes anonymes (cache qui a voté pour qui)" },
                { key: "showVoteCounts", label: "Montrer les compteurs de votes pendant le vote" },
                { key: "showAllTracksEnd", label: "Montrer toutes les musiques à la fin" },
                { key: "taupeMode", label: "Mode Taupe (joueur IA mystère)" },
                { key: "rolesEnabled", label: "Rôles secrets (Fou, Policier, Guesser)" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-300">{label}</span>
                  <Toggle
                    checked={s[key as keyof typeof s] as boolean}
                    onChange={(v) => setSettings({ [key]: v })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="w-full px-4 py-3 rounded-xl bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {isHost ? (
        <button onClick={startSelection} disabled={!canStart}
          className="w-full py-4 rounded-xl font-bold text-lg transition-all bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white">
          Lancer la sélection
        </button>
      ) : (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <p className="text-sm">En attente du host…</p>
        </div>
      )}

      {showChat && (
        <div className="w-full">
          <ChatPanel className="h-72" />
        </div>
      )}
    </div>
  );
}
