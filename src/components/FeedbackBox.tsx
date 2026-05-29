"use client";

import { useState, useRef, useEffect } from "react";
import { Lightbulb, MessageSquare, X, Send } from "lucide-react";

type FeedbackType = "idea" | "feedback";

export default function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const close = () => {
    setOpen(false);
    setType(null);
    setMessage("");
    setName("");
    setEmail("");
    setSent(false);
  };

  const submit = async () => {
    if (!message.trim() || !type) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, name, email }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 left-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 z-50"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }}
      >
        <span>📬</span>
        <span>La boite à tout</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div ref={modalRef} className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">La boite</h2>
              <button onClick={close} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            {sent ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-white font-semibold">Merci !</p>
                <p className="text-gray-400 text-sm mt-1">Ton message a bien été envoyé.</p>
                <button onClick={close} className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">Fermer</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setType("idea")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${type === "idea" ? "border-yellow-500 bg-yellow-500/10" : "border-transparent hover:border-white/20"}`}
                    style={{ background: type === "idea" ? undefined : "var(--bg)" }}>
                    <Lightbulb size={22} className={type === "idea" ? "text-yellow-400" : "text-gray-400"} />
                    <span className={`text-sm font-semibold ${type === "idea" ? "text-yellow-300" : "text-gray-400"}`}>Donner une idée</span>
                  </button>
                  <button
                    onClick={() => setType("feedback")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${type === "feedback" ? "border-purple-500 bg-purple-500/10" : "border-transparent hover:border-white/20"}`}
                    style={{ background: type === "feedback" ? undefined : "var(--bg)" }}>
                    <MessageSquare size={22} className={type === "feedback" ? "text-purple-400" : "text-gray-400"} />
                    <span className={`text-sm font-semibold ${type === "feedback" ? "text-purple-300" : "text-gray-400"}`}>Donner un retour</span>
                  </button>
                </div>

                {type && (
                  <>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={type === "idea" ? "Décris ton idée…" : "Dis-nous ce que tu penses…"}
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ton pseudo (optionnel)"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ton email (optionnel, pour réponse)"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    />
                    <button
                      onClick={submit}
                      disabled={!message.trim() || sending}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      <Send size={14} />
                      {sending ? "Envoi…" : "Envoyer"}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
