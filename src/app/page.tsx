"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/contexts/GameContext";
import AvatarPicker from "@/components/AvatarPicker";
import { Disc3, Clock } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { createRoom, joinRoom, error, clearError, disconnectedReason, clearDisconnectedReason } = useGame();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (error) setLoading(false); }, [error]);

  const handleCreate = async () => {
    if (!name.trim() || !avatar) return;
    setLoading(true);
    clearError();
    const roomCode = await createRoom(name.trim(), avatar);
    if (roomCode) router.push("/room");
    else setLoading(false);
  };

  const handleJoin = async () => {
    if (!name.trim() || !avatar || code.length < 4) return;
    setLoading(true);
    clearError();
    const roomCode = await joinRoom(code.trim(), name.trim(), avatar);
    if (roomCode) router.push("/room");
    else setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <a
        href="https://ko-fi.com/mathcou"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 z-50"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400 flex-shrink-0">
          <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.37-1.502 3.505-.585 1.723.754 2.097 2.54.686 3.933zm6.325.048c-.744.313-1.834.313-1.834.313l.061-3.999s1.725.063 2.374 1.173c.549.964.143 2.18-.601 2.513z"/>
        </svg>
        <span>Achète-moi un café</span>
      </a>
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Disc3 className="text-purple-400" size={40} />
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kiekoutsa
          </h1>
        </div>
        <p className="text-gray-400 text-lg">Qui a mis ce son ?</p>
      </div>

      {disconnectedReason === "inactivity" && (
        <div className="w-full max-w-lg mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-900/30 border border-amber-600 text-amber-300 text-sm">
          <Clock size={16} className="flex-shrink-0" />
          <span className="flex-1">Le salon a été fermé pour inactivité.</span>
          <button onClick={clearDisconnectedReason} className="text-amber-500 hover:text-amber-300 transition-colors flex-shrink-0 text-lg leading-none">×</button>
        </div>
      )}

      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex rounded-xl overflow-hidden mb-6" style={{ background: "var(--bg)" }}>
          {(["create", "join"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); clearError(); }}
              className={`flex-1 py-3 font-semibold transition-colors text-sm ${tab === t ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {t === "create" ? "Créer un salon" : "Rejoindre"}
            </button>
          ))}
        </div>

        <div className="mb-5">
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">{error}</div>
        )}

        <label className="block mb-2 text-sm font-medium text-gray-400">Pseudo</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") tab === "create" ? handleCreate() : handleJoin(); }}
          placeholder="Ex: DamiDams" maxLength={20}
          className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none mb-4 focus:ring-2 focus:ring-purple-500"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }} />

        {tab === "join" && (
          <>
            <label className="block mb-2 text-sm font-medium text-gray-400">Code du salon</label>
            <input type="text" value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              placeholder="ABCD" maxLength={4}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none mb-4 focus:ring-2 focus:ring-purple-500 text-2xl font-mono tracking-widest text-center"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }} />
          </>
        )}

        <button onClick={tab === "create" ? handleCreate : handleJoin}
          disabled={loading || !name.trim() || !avatar || (tab === "join" && code.length < 4)}
          className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
          {loading ? "Connexion…" : tab === "create" ? "Créer le salon" : "Rejoindre"}
        </button>

        {!avatar && (
          <p className="text-center text-xs text-gray-500 mt-3">Choisis un avatar pour continuer</p>
        )}
      </div>
    </div>
  );
}
