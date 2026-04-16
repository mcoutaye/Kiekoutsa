"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/contexts/GameContext";
import AvatarPicker from "@/components/AvatarPicker";
import { Disc3 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { createRoom, joinRoom, error, clearError } = useGame();
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
    if (roomCode) router.push(`/room/${roomCode}`);
    else setLoading(false);
  };

  const handleJoin = async () => {
    if (!name.trim() || !avatar || code.length < 4) return;
    setLoading(true);
    clearError();
    const roomCode = await joinRoom(code.trim(), name.trim(), avatar);
    if (roomCode) router.push(`/room/${roomCode}`);
    else setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Disc3 className="text-purple-400" size={40} />
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kiekoutsa
          </h1>
        </div>
        <p className="text-gray-400 text-lg">Qui a mis ce son ?</p>
      </div>

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
          placeholder="Ex: Romain" maxLength={20}
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
