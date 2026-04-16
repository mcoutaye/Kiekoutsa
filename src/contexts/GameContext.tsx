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
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioSignal, setAudioSignal] = useState(0);
  const playerId = useRef(getClientId()).current;
  const prevPlayingStartedAt = useRef<string | null>(null);

  // ── Subscribe to Supabase Realtime ─────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;

    // Initial fetch
    fetch(`/api/rooms/${roomCode}?playerId=${encodeURIComponent(playerId)}`)
      .then((r) => r.json())
      .then(({ room: r }) => { if (r) setRoom(r); });

    // Realtime subscription
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        (payload) => {
          const newRoom = payload.new as RoomDB;
          const sanitized = sanitizeRoom(newRoom, playerId);
          setRoom(sanitized);

          // Detect music start (playing_started_at set or changed)
          if (
            newRoom.playing_started_at &&
            newRoom.playing_started_at !== prevPlayingStartedAt.current
          ) {
            prevPlayingStartedAt.current = newRoom.playing_started_at;
            setAudioSignal((n) => n + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode, playerId]);

  // ── Action helper ───────────────────────────────────────────────────────
  const action = useCallback(
    async (type: string, payload?: unknown) => {
      if (!roomCode) return;
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type, playerId, payload }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
    },
    [roomCode, playerId]
  );

  // ── Create / Join ───────────────────────────────────────────────────────
  const createRoom = useCallback(
    async (playerName: string, avatar: string): Promise<string | null> => {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName, avatar, playerId }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return null; }
      setRoomCode(data.roomCode);
      setRoom(data.room);
      return data.roomCode;
    },
    [playerId]
  );

  const joinRoom = useCallback(
    async (code: string, playerName: string, avatar: string): Promise<string | null> => {
      const upper = code.toUpperCase().trim();
      const res = await fetch(`/api/rooms/${upper}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join-room", playerId, payload: { playerName, avatar } }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return null; }
      setRoomCode(upper);
      setRoom(data.room);
      return upper;
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
  const clearError = useCallback(() => setError(null), []);

  return (
    <GameContext.Provider value={{
      room, playerId, roomCode, error, audioSignal,
      clearError, createRoom, joinRoom, addTrack, removeTrack, setReady,
      startSelection, startModeSelection, setPlaybackMode, setSettings,
      startGame, hostStartMusic, transitionToVoting,
      castVote, forceReveal, nextRound, playAgain,
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
