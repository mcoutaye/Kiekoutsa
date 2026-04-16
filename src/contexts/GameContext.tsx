"use client";

import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import type { ClientRoom, PlaybackMode, Track, RoomSettings } from "@/types/game";

interface GameContextType {
  socket: Socket | null;
  room: ClientRoom | null;
  playerId: string | null;
  error: string | null;
  audioSignal: number; // increments when host triggers audio start
  clearError: () => void;
  createRoom: (playerName: string, avatar: string) => void;
  joinRoom: (roomCode: string, playerName: string, avatar: string) => void;
  addTrack: (track: Omit<Track, "addedBy">) => void;
  removeTrack: (trackId: string) => void;
  setReady: (ready: boolean) => void;
  startSelection: () => void;
  startModeSelection: () => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  setSettings: (settings: Partial<RoomSettings>) => void;
  startGame: () => void;
  hostStartMusic: () => void;
  castVote: (suspectedPlayerId: string) => void;
  forceReveal: () => void;
  nextRound: () => void;
  playAgain: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

let globalSocket: Socket | null = null;
function getSocket(): Socket {
  if (!globalSocket) globalSocket = io({ reconnectionAttempts: 5 });
  return globalSocket;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioSignal, setAudioSignal] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    const onConnect = () => setPlayerId(s.id ?? null);
    const onRoomUpdated = ({ room }: { room: ClientRoom }) => setRoom(room);
    const onError = ({ message }: { message: string }) => setError(message);
    const onStartAudio = () => setAudioSignal((n) => n + 1);

    s.on("connect", onConnect);
    s.on("room-updated", onRoomUpdated);
    s.on("error", onError);
    s.on("start-audio", onStartAudio);

    if (s.connected) setPlayerId(s.id ?? null);

    return () => {
      s.off("connect", onConnect);
      s.off("room-updated", onRoomUpdated);
      s.off("error", onError);
      s.off("start-audio", onStartAudio);
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => socketRef.current?.emit(event, data), []);

  const createRoom = useCallback((playerName: string, avatar: string) => emit("create-room", { playerName, avatar }), [emit]);
  const joinRoom = useCallback((roomCode: string, playerName: string, avatar: string) => emit("join-room", { roomCode, playerName, avatar }), [emit]);
  const addTrack = useCallback((track: Omit<Track, "addedBy">) => emit("add-track", track), [emit]);
  const removeTrack = useCallback((trackId: string) => emit("remove-track", { trackId }), [emit]);
  const setReady = useCallback((ready: boolean) => emit("set-ready", { ready }), [emit]);
  const startSelection = useCallback(() => emit("start-selection"), [emit]);
  const startModeSelection = useCallback(() => emit("start-mode-selection"), [emit]);
  const setPlaybackMode = useCallback((mode: PlaybackMode) => emit("set-playback-mode", { mode }), [emit]);
  const setSettings = useCallback((settings: Partial<RoomSettings>) => emit("set-settings", settings), [emit]);
  const startGame = useCallback(() => emit("start-game"), [emit]);
  const hostStartMusic = useCallback(() => emit("host-start-music"), [emit]);
  const castVote = useCallback((suspectedPlayerId: string) => emit("cast-vote", { suspectedPlayerId }), [emit]);
  const forceReveal = useCallback(() => emit("force-reveal"), [emit]);
  const nextRound = useCallback(() => emit("next-round"), [emit]);
  const playAgain = useCallback(() => emit("play-again"), [emit]);
  const clearError = useCallback(() => setError(null), []);

  return (
    <GameContext.Provider value={{
      socket: socketRef.current, room, playerId, error, audioSignal,
      clearError, createRoom, joinRoom, addTrack, removeTrack, setReady,
      startSelection, startModeSelection, setPlaybackMode, setSettings,
      startGame, hostStartMusic, castVote, forceReveal, nextRound, playAgain,
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
