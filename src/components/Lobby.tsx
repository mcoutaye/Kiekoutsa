"use client";

import React, { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Eye, EyeOff, Copy, Check } from 'lucide-react';

export default function Lobby() {
  const { room, playerId, startSelection, error } = useGame();
  
  // États pour la visibilité et la copie
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const canStart = room.players.length >= 3;

  // Fonction pour copier le code
  const handleCopy = () => {
    if (room.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset l'icône après 2s
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      {/* Room code section */}
      <div className="mb-10 text-center">
        <p className="text-gray-400 text-sm mb-2 uppercase tracking-widest">
          Code du salon
        </p>

        <div className="relative group max-w-xs mx-auto flex items-center justify-center">
          {/* Container du code */}
          <div
            className={`text-6xl font-black font-mono tracking-widest text-white px-8 py-6 rounded-2xl transition-all duration-300 border-2 ${
              isRevealed ? 'border-purple-600' : 'border-gray-700'
            }`}
            style={{ background: "var(--surface)" }}
          >
            <span className={`transition-all duration-500 ${!isRevealed ? 'blur-xl select-none' : 'blur-0'}`}>
              {room.code}
            </span>
          </div>

          {/* Boutons d'actions à droite */}
          <div className="absolute -right-14 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            {/* Bouton Voir/Cacher */}
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors border border-gray-700"
              title={isRevealed ? "Cacher" : "Afficher"}
            >
              {isRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>

            {/* Bouton Copier */}
            <button
              onClick={handleCopy}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors border border-gray-700"
              title="Copier le code"
            >
              {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        <p className={`text-sm mt-4 transition-colors ${copied ? "text-green-400 font-medium" : "text-gray-500"}`}>
          {copied ? "Code copié !" : "Partage ce code à tes amis"}
        </p>
      </div>

      {/* Players List */}
      <div className="w-full max-w-sm mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4 text-center">
          Joueurs ({room.players.length})
        </h2>
        <div className="space-y-3">
          {room.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white uppercase">
                {p.name[0]}
              </div>
              <span className="flex-1 font-medium text-white">{p.name}</span>
              {p.isHost && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-yellow-900/40 text-yellow-400 border border-yellow-700/50">
                  Host
                </span>
              )}
              {p.id === playerId && (
                <span className="text-xs text-gray-500">(toi)</span>
              )}
            </div>
          ))}
        </div>

        {room.players.length < 3 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Besoin d&apos;au moins 3 joueurs pour lancer…
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Host start button */}
      {isHost ? (
        <button
          onClick={startSelection}
          disabled={!canStart}
          className="px-10 py-4 rounded-xl font-bold text-lg transition-all
            bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95 text-white shadow-lg shadow-purple-900/20"
        >
          Lancer la sélection
        </button>
      ) : (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <p className="text-sm italic">En attente du host…</p>
        </div>
      )}
    </div>
  );
}