"use client";

import { Monitor, Volume2, Check, Play } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

const MODES = [
  {
    id: "master" as const,
    Icon: Monitor,
    title: "Maître du jeu",
    subtitle: "Style Jackbox",
    description:
      "Le son sort UNIQUEMENT sur l'appareil du Host. Parfait pour partager son écran via Discord.",
    color: "from-blue-800 to-indigo-900",
    border: "border-blue-600",
    glow: "shadow-blue-900/50",
  },
  {
    id: "sync" as const,
    Icon: Volume2,
    title: "Mode Synchronisé",
    subtitle: "Son chez tout le monde",
    description:
      "Chaque joueur entend la musique directement dans son navigateur, en simultané.",
    color: "from-purple-800 to-pink-900",
    border: "border-purple-600",
    glow: "shadow-purple-900/50",
  },
];

export default function ModeSelection() {
  const { room, playerId, setPlaybackMode, startGame } = useGame();
  if (!room) return null;

  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const selected = room.playbackMode;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
      <h2 className="text-3xl font-black mb-2">Mode d&apos;écoute</h2>
      {isHost ? (
        <p className="text-gray-400 mb-8">Choisis comment la musique sera diffusée</p>
      ) : (
        <p className="text-gray-400 mb-8">Le host choisit le mode d&apos;écoute…</p>
      )}

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {MODES.map((mode) => {
          const { Icon } = mode;
          return (
            <button
              key={mode.id}
              onClick={() => isHost && setPlaybackMode(mode.id)}
              disabled={!isHost}
              className={`relative p-6 rounded-2xl text-left transition-all card-hover
                bg-gradient-to-br ${mode.color}
                border-2 ${
                  selected === mode.id
                    ? mode.border + " shadow-xl " + mode.glow
                    : "border-transparent"
                }
                ${isHost ? "cursor-pointer" : "cursor-default opacity-80"}`}
            >
              {selected === mode.id && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <Check size={14} className="text-gray-900" />
                </div>
              )}
              <Icon size={36} className="mb-3 text-white/90" />
              <h3 className="font-black text-xl text-white mb-0.5">{mode.title}</h3>
              <p className="text-sm text-white/60 mb-3">{mode.subtitle}</p>
              <p className="text-sm text-white/80 leading-relaxed">{mode.description}</p>
            </button>
          );
        })}
      </div>

      {isHost && (
        <button
          onClick={startGame}
          disabled={!selected}
          className="flex items-center gap-2 px-12 py-4 rounded-xl font-bold text-xl transition-all active:scale-95
            bg-green-600 hover:bg-green-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play size={20} /> Lancer la partie !
        </button>
      )}
      {!isHost && selected && (
        <p className="text-gray-400 text-sm">
          Mode sélectionné :{" "}
          <strong className="text-white">
            {selected === "master" ? "Maître du jeu" : "Synchronisé"}
          </strong>
        </p>
      )}
    </div>
  );
}
