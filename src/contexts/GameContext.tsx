"use client";

import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeRoom } from "@/lib/room-utils";
import type { RoomDB } from "@/lib/room-utils";
import type { ClientRoom, PlaybackMode, Track, RoomSettings } from "@/types/game";

// ─── Client ID (persists for session) ──────────────────────────────────────
function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("kiekoutsa_client_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("kiekoutsa_client_id", id);
  }
  return id;
}

// ─── Context interface ───────────────────────────────────────────────────────
interface GameContextType {
  room: ClientRoom | null;
  playerId: string;
  roomCode: string | null;
  error: string | null;
  audioSignal: number;
  clearError: () => void;
  createRoom: (playerName: string, avatar: string) => Promise<string | null>;
  joinRoom: (roomCode: string, playerName: string, avatar: string) => Promise<string | null>;
  addTrack: (track: Omit<Track, "addedBy">) => void;
  removeTrack: (trackId: string) => void;
  setReady: (ready: boolean) => void;
  startSelection: () => void;
  startModeSelection: () => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  setSettings: (settings: Partial<RoomSettings>) => void;
  startGame: () => void;
  hostStartMusic: () => void;
  transitionToVoting: () => void;
  castVote: (suspectedPlayerId: string) => void;
  forceReveal: () => void;
  nextRound: () => void;
  playAgain: () => void;
  kickPlayer: (targetId: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

function getSavedRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("kiekoutsa_room_code");
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [roomCode, setRoomCodeState] = useState<string | null>(() => getSavedRoomCode());
  const [error, setError] = useState<string | null>(null);
  const [audioSignal, setAudioSignal] = useState(0);
  const playerId = useRef(getClientId()).current;
  const prevPlayingStartedAt = useRef<string | null>(null);

  const setRoomCode = useCallback((code: string | null) => {
    setRoomCodeState(code);
    if (typeof window !== "undefined") {
      if (code) sessionStorage.setItem("kiekoutsa_room_code", code);
      else sessionStorage.removeItem("kiekoutsa_room_code");
    }
  }, []);

  // ── Subscribe to Supabase Realtime + polling fallback ──────────────────
  useEffect(() => {
    if (!roomCode) return;

    const applyRoomDB = (newRoom: RoomDB) => {
      const sanitized = sanitizeRoom(newRoom, playerId);
      setRoom(sanitized);
      if (
        newRoom.playing_started_at &&
        newRoom.playing_started_at !== prevPlayingStartedAt.current
      ) {
        prevPlayingStartedAt.current = newRoom.playing_started_at;
        setAudioSignal((n) => n + 1);
      }
    };

    const fetchRoom = () =>
      fetch(`/api/rooms/${roomCode}?playerId=${encodeURIComponent(playerId)}`)
        .then((r) => r.json())
        .then(({ room: r }) => { if (r) setRoom(r); })
        .catch(() => {});

    // Initial fetch
    fetchRoom();

    // Realtime subscription
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        (payload) => applyRoomDB(payload.new as RoomDB)
      )
      .subscribe();

    // Polling fallback every 4s (catches Realtime misses)
    const poll = setInterval(fetchRoom, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [roomCode, playerId]);

  // ── Action helper ───────────────────────────────────────────────────────
  const action = useCallback(
    async (type: string, payload?: unknown) => {
      if (!roomCode) return;
      try {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: type, playerId, payload }),
        });
        const text = await res.text();
        let data: Record<string, unknown>;
        try { data = JSON.parse(text); }
        catch { setError(`Erreur serveur (${res.status})`); return; }
        if (data.error) setError(data.error as string);
        else if (data.room) setRoom(data.room as ClientRoom); // apply immediately
      } catch (e) {
        console.error("action error", e);
        setError("Erreur réseau");
      }
    },
    [roomCode, playerId]
  );

  // ── Create / Join ───────────────────────────────────────────────────────
  const createRoom = useCallback(
    async (playerName: string, avatar: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerName, avatar, playerId }),
        });
        const text = await res.text();
        let data: Record<string, unknown>;
        try { data = JSON.parse(text); }
        catch { setError(`Erreur serveur (${res.status}): ${text.slice(0, 100)}`); return null; }
        if (data.error) { setError(data.error as string); return null; }
        setRoomCode(data.roomCode as string);
        setRoom(data.room as ClientRoom);
        return data.roomCode as string;
      } catch (e) {
        setError("Impossible de contacter le serveur");
        console.error(e);
        return null;
      }
    },
    [playerId]
  );

  const joinRoom = useCallback(
    async (code: string, playerName: string, avatar: string): Promise<string | null> => {
      try {
        const upper = code.toUpperCase().trim();
        const res = await fetch(`/api/rooms/${upper}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join-room", playerId, payload: { playerName, avatar } }),
        });
        const text = await res.text();
        let data: Record<string, unknown>;
        try { data = JSON.parse(text); }
        catch { setError(`Erreur serveur (${res.status}): ${text.slice(0, 100)}`); return null; }
        if (data.error) { setError(data.error as string); return null; }
        setRoomCode(upper);
        setRoom(data.room as ClientRoom);
        return upper;
      } catch (e) {
        setError("Impossible de contacter le serveur");
        console.error(e);
        return null;
      }
    },
    [playerId]
  );

  // ── Game actions ────────────────────────────────────────────────────────
  const addTrack = useCallback((track: Omit<Track, "addedBy">) => action("add-track", track), [action]);
  const removeTrack = useCallback((trackId: string) => action("remove-track", { trackId }), [action]);
  const setReady = useCallback((ready: boolean) => action("set-ready", { ready }), [action]);
  const startSelection = useCallback(() => action("start-selection"), [action]);
  const startModeSelection = useCallback(() => action("start-mode-selection"), [action]);
  const setPlaybackMode = useCallback((mode: PlaybackMode) => action("set-playback-mode", { mode }), [action]);
  const setSettings = useCallback((settings: Partial<RoomSettings>) => action("set-settings", settings), [action]);
  const startGame = useCallback(() => action("start-game"), [action]);
  const hostStartMusic = useCallback(() => action("host-start-music"), [action]);
  const transitionToVoting = useCallback(() => action("transition-to-voting"), [action]);
  const castVote = useCallback((suspectedPlayerId: string) => action("cast-vote", { suspectedPlayerId }), [action]);
  const forceReveal = useCallback(() => action("force-reveal"), [action]);
  const nextRound = useCallback(() => action("next-round"), [action]);
  const playAgain = useCallback(() => action("play-again"), [action]);
  const kickPlayer = useCallback((targetId: string) => action("kick-player", { targetId }), [action]);
  const clearError = useCallback(() => setError(null), []);

  return (
    <GameContext.Provider value={{
      room, playerId, roomCode, error, audioSignal,
      clearError, createRoom, joinRoom, addTrack, removeTrack, setReady,
      startSelection, startModeSelection, setPlaybackMode, setSettings,
      startGame, hostStartMusic, transitionToVoting,
      castVote, forceReveal, nextRound, playAgain, kickPlayer,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be inside <GameProvider>");
  return ctx;
}
