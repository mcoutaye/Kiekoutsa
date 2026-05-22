"use client";

import { useState } from "react";
import { Send, CheckCircle2, Mic2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import ChatPanel from "@/components/ChatPanel";

export default function PromptWriting() {
  const { room, playerId, submitPrompt, forceStartPromptSubmission, error } = useGame();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const hasSubmitted = !!room.myPrompt;
  const submittedCount = room.promptWritingDoneIds.length;
  const totalCount = room.players.length;

  const handleSubmit = async () => {
    if (!text.trim() || submitting || hasSubmitted) return;
    setSubmitting(true);
    try {
      await submitPrompt(text.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
      <div className="flex-1 flex flex-col gap-5 max-w-lg mx-auto">
        <div className="text-center pt-4">
          <Mic2 size={36} className="text-blue-400 mx-auto mb-2" />
          <h2 className="text-2xl font-black text-white">Décris une situation</h2>
          <p className="text-gray-400 text-sm mt-1">Les autres joueurs vont trouver la musique parfaite</p>
        </div>

        {/* Who has submitted */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {room.players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                room.promptWritingDoneIds.includes(p.id)
                  ? "bg-green-900/30 border border-green-600 text-green-300"
                  : "border border-gray-700 text-gray-500"
              }`}
            >
              {room.promptWritingDoneIds.includes(p.id) && <CheckCircle2 size={11} />}
              <span>{p.name}</span>
            </div>
          ))}
        </div>

        {/* Input or confirmation */}
        {!hasSubmitted ? (
          <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 100))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ex: S'enfuir de prison, Une danse de victoire, Un film d'horreur…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{text.length}/100</span>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                <Send size={13} />
                {submitting ? "Envoi…" : "Valider"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <CheckCircle2 size={32} className="text-green-400 mx-auto mb-2" />
            <p className="text-white font-semibold">Prompt envoyé !</p>
            <p className="text-gray-400 text-sm mt-1 italic">"{room.myPrompt}"</p>
            <p className="text-gray-500 text-xs mt-3">En attente des autres… ({submittedCount}/{totalCount})</p>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-900/30 border border-red-700 text-red-300 text-sm">{error}</div>
        )}

        {isHost && (
          <button
            onClick={forceStartPromptSubmission}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            Lancer maintenant ({submittedCount}/{totalCount} prêts)
          </button>
        )}
      </div>
      <ChatPanel />
    </div>
  );
}
