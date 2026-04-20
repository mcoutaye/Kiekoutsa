"use client";

import { useState } from "react";
import { Zap, Shield, Search, Music, type LucideIcon } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import type { RoleName } from "@/types/game";

const ROLE_CONFIG: Record<RoleName, { Icon: LucideIcon; iconClass: string; label: string; color: string; border: string; desc: string }> = {
  fou: {
    Icon: Zap,
    iconClass: "text-yellow-400",
    label: "Le Fou",
    color: "from-yellow-900/60 to-amber-900/40",
    border: "border-yellow-600",
    desc: "Tu veux te faire voter ! Pendant un round, active ton pouvoir pour gagner +1 point pour chaque vote reçu ce round. À utiliser stratégiquement — pas sur ta propre musique.",
  },
  policier: {
    Icon: Shield,
    iconClass: "text-blue-400",
    label: "Le Policier",
    color: "from-blue-900/60 to-blue-900/40",
    border: "border-blue-600",
    desc: "Tu peux bloquer un joueur par round pour l'empêcher de voter. Attention, tu n'as qu'un nombre limité de blocages pour toute la partie. Utilise-les bien !",
  },
  guesser: {
    Icon: Search,
    iconClass: "text-green-400",
    label: "Le Guesser",
    color: "from-green-900/60 to-green-900/40",
    border: "border-green-600",
    desc: "Pendant la sélection, choisis un son que tu penses qu'un autre joueur va ajouter. Si tu as raison, tu gagnes +10 points et le round passe directement à la révélation, sans vote !",
  },
  none: {
    Icon: Music,
    iconClass: "text-gray-400",
    label: "Aucun rôle",
    color: "from-gray-800/60 to-gray-800/40",
    border: "border-gray-600",
    desc: "Tu n'as pas de rôle cette partie. Joue normalement et essaie de deviner qui a mis chaque musique !",
  },
};

export default function RoleReveal() {
  const { room, playerId, startSelectionConfirmed } = useGame();
  const [acknowledged, setAcknowledged] = useState(false);

  if (!room) return null;

  // Cache role in sessionStorage so VotingPhase can use it even if myRole becomes null
  if (typeof window !== "undefined" && room.myRole) {
    sessionStorage.setItem("kiekoutsa_my_role", room.myRole);
  }

  const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
  const myRole: RoleName = room.myRole ?? "none";
  const config = ROLE_CONFIG[myRole];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-sm mx-auto w-full">
      <div className="text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Ton rôle secret</p>
        <p className="text-gray-600 text-xs">(Garde-le pour toi !)</p>
      </div>

      <div className={`w-full rounded-2xl p-6 bg-gradient-to-br ${config.color} border-2 ${config.border} flex flex-col items-center gap-4 text-center`}>
        <config.Icon size={56} className={config.iconClass} />
        <h2 className="text-2xl font-black text-white">{config.label}</h2>
        <p className="text-gray-300 text-sm leading-relaxed">{config.desc}</p>
      </div>

      {!acknowledged ? (
        <button
          onClick={() => setAcknowledged(true)}
          className="w-full py-3 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-all active:scale-95"
        >
          J&apos;ai compris !
        </button>
      ) : isHost ? (
        <div className="w-full flex flex-col gap-3">
          <p className="text-center text-gray-500 text-xs">Attends que tout le monde ait lu son rôle, puis lance la sélection.</p>
          <button
            onClick={() => startSelectionConfirmed()}
            className="w-full py-3 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-all active:scale-95"
          >
            Lancer la sélection de musiques
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <p className="text-sm">En attente du host…</p>
        </div>
      )}
    </div>
  );
}
