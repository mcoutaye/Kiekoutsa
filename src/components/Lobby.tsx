"use client";

import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Crown, Settings, ChevronDown, ChevronUp, Users, Eye, EyeOff, Copy, Check, UserX, Zap, Shield, Search, type LucideIcon } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import type { RoleName } from "@/types/game";

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-purple-600" : "bg-gray-700"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

const ROLES: { key: RoleName; Icon: LucideIcon; iconClass: string; label: string; desc: string }[] = [
  { key: "fou", Icon: Zap, iconClass: "text-yellow-400", label: "Le Fou", desc: "Veut se faire voter. Active son pouvoir pour +1 pt par vote reçu ce round." },
  { key: "policier", Icon: Shield, iconClass: "text-blue-400", label: "Le Policier", desc: "Peut bloquer un joueur pour l'empêcher de voter (nombre limité par partie)." },
  { key: "guesser", Icon: Search, iconClass: "text-green-400", label: "Le Guesser", desc: "Prédit un son qu'un autre joueur va ajouter. Bonne prédiction = +10 pts, vote annulé." },
];

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

  // Clear cached role when back in lobby (play-again or new game)
  if (typeof window !== "undefined") sessionStorage.removeItem("kiekoutsa_my_role");

  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const canStart = room.players.length >= 3;
  const s = room.settings;

  const toggleRole = (role: RoleName) => {
    if (!isHost) return;
    const current = s.enabledRoles ?? [];
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setSettings({ enabledRoles: next });
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 max-w-5xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Mode de jeu ── */}
        <div className="order-1 flex flex-col gap-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest">Mode de jeu</h2>
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {(["basique", "taupe"] as const).map((mode) => {
              const active = s.gameMode === mode;
              return (
                <button key={mode}
                  onClick={() => isHost && setSettings({ gameMode: mode })}
                  disabled={!isHost}
                  className={`w-full flex flex-col items-start px-4 py-3 rounded-xl border-2 transition-all text-left
                    ${active ? "border-purple-500 bg-purple-900/30" : "border-transparent hover:border-purple-500/30"}
                    ${!isHost ? "cursor-default" : "cursor-pointer"}`}
                  style={{ background: active ? undefined : "var(--bg)" }}>
                  <span className="font-bold text-sm text-white">
                    {mode === "basique" ? "Basique" : <span className="flex items-center gap-1.5"><Search size={13} className="text-purple-400" /> Mode Taupe</span>}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">
                    {mode === "basique"
                      ? "Partie classique, devinez qui a mis chaque son."
                      : "Un joueur IA s'infiltre. Trouvez la Taupe !"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Paramètres / code / joueurs ── */}
        <div className="order-2 flex flex-col gap-4 max-w-sm w-full mx-auto lg:mx-0">
          {/* Room code */}
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Code du salon</p>
            <div
              className="text-4xl font-black tracking-widest text-purple-300 font-mono cursor-pointer select-none transition-all duration-300 mb-2"
              style={{ filter: codeVisible ? "none" : "blur(10px)" }}
              onClick={() => setCodeVisible((v) => !v)}
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
          <div>
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
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
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
                  {[
                    { key: "autoReveal", label: "Révéler auto quand tout le monde a voté" },
                    { key: "autoPlay", label: "Lancer la musique automatiquement" },
                    { key: "allowSelfVote", label: "Voter pour soi-même" },
                    { key: "anonymousVotes", label: "Votes anonymes (cache qui a voté pour qui)" },
                    { key: "showVoteCounts", label: "Montrer les compteurs de votes pendant le vote" },
                    { key: "showAllTracksEnd", label: "Montrer toutes les musiques à la fin" },
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
            <div className="px-4 py-3 rounded-xl bg-red-900/30 border border-red-700 text-red-300 text-sm">
              {error}
            </div>
          )}

          {isHost ? (
            <button onClick={startSelection} disabled={!canStart}
              className="w-full py-4 rounded-xl font-bold text-lg transition-all bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white">
              Lancer la sélection
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <p className="text-sm">En attente du host…</p>
            </div>
          )}
        </div>

        {/* ── Rôles ── */}
        <div className="order-3 flex flex-col gap-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest">Rôles secrets</h2>
          <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {ROLES.map(({ key, Icon, iconClass, label, desc }) => {
              const enabled = (s.enabledRoles ?? []).includes(key);
              return (
                <div key={key} className="flex items-start gap-3">
                  <Toggle checked={enabled} onChange={() => toggleRole(key)} disabled={!isHost} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white flex items-center gap-1.5"><Icon size={13} className={iconClass} /> {label}</p>
                    <p className="text-xs text-gray-500 leading-snug mt-0.5">{desc}</p>
                  </div>
                </div>
              );
            })}

            {(s.enabledRoles ?? []).includes("policier") && (
              <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs text-gray-400 mb-1">
                  Blocages du Policier par partie : <span className="text-white font-bold">{s.policeBlocksPerGame}</span>
                </p>
                <input type="range" min={1} max={5} value={s.policeBlocksPerGame}
                  disabled={!isHost}
                  onChange={(e) => isHost && setSettings({ policeBlocksPerGame: Number(e.target.value) })}
                  className="w-full accent-blue-500 disabled:opacity-40" />
              </div>
            )}
            {(s.enabledRoles ?? []).includes("fou") && (
              <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs text-gray-400 mb-1">
                  Activations du Fou par partie : <span className="text-white font-bold">{s.fouActivationsPerGame}</span>
                </p>
                <input type="range" min={1} max={5} value={s.fouActivationsPerGame}
                  disabled={!isHost}
                  onChange={(e) => isHost && setSettings({ fouActivationsPerGame: Number(e.target.value) })}
                  className="w-full accent-yellow-500 disabled:opacity-40" />
              </div>
            )}

            {!isHost && (s.enabledRoles ?? []).length === 0 && (
              <p className="text-xs text-gray-600 text-center">Aucun rôle activé</p>
            )}
          </div>
        </div>

      </div>

      {/* Chat */}
      <div className="w-full max-w-sm lg:max-w-none mx-auto lg:mx-0">
        <ChatPanel className="h-64" />
      </div>
    </div>
  );
}
