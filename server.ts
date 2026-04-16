import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer, Socket } from "socket.io";
import type {
  Track,
  Player,
  GamePhase,
  PlaybackMode,
  VoteResult,
  RoundResult,
  ClientRoom,
  RoomSettings,
} from "./src/types/game";
import { DEFAULT_SETTINGS } from "./src/types/game";

// ─── Server-side room ───────────────────────────────────────────────────────
interface Room {
  code: string;
  players: Player[];
  phase: GamePhase;
  playbackMode: PlaybackMode | null;
  settings: RoomSettings;
  trackQueue: Track[];
  currentTrackIndex: number;
  currentTrack: Track | null;
  votes: Record<string, string>;
  roundResults: RoundResult[];
}

const rooms = new Map<string, Room>();
const playTimers = new Map<string, NodeJS.Timeout>();

// ─── Utilities ───────────────────────────────────────────────────────────────
function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateCode() : code;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function computeVoteCounts(
  votes: Record<string, string>,
  players: Player[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  players.forEach((p) => (counts[p.id] = 0));
  Object.values(votes).forEach((suspectedId) => {
    if (counts[suspectedId] !== undefined) counts[suspectedId]++;
  });
  return counts;
}

function sanitizeRoom(room: Room, forPlayerId: string): ClientRoom {
  const isReveal = room.phase === "reveal" || room.phase === "end";
  const player = room.players.find((p) => p.id === forPlayerId);

  return {
    code: room.code,
    phase: room.phase,
    playbackMode: room.playbackMode,
    settings: room.settings,
    currentTrackIndex: room.currentTrackIndex,
    totalTracks: room.trackQueue.length,
    currentTrack: room.currentTrack
      ? {
          id: room.currentTrack.id,
          name: room.currentTrack.name,
          artists: room.currentTrack.artists,
          albumCover: room.currentTrack.albumCover,
          previewUrl: room.currentTrack.previewUrl,
          addedBy: isReveal ? room.currentTrack.addedBy : null,
          addedByName: isReveal
            ? (room.players.find((p) => p.id === room.currentTrack!.addedBy)
                ?.name ?? "Inconnu")
            : null,
        }
      : null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      isReady: p.isReady,
      score: p.score,
    })),
    myTracks: player?.tracks ?? [],
    votedPlayerIds: Object.keys(room.votes),
    voteCounts: computeVoteCounts(room.votes, room.players),
    myVote: room.votes[forPlayerId] ?? null,
    roundResults: room.roundResults,
  };
}

function broadcastRoom(io: SocketIOServer, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  for (const player of room.players) {
    io.to(player.id).emit("room-updated", {
      room: sanitizeRoom(room, player.id),
    });
  }
}

function startPlayingPhase(io: SocketIOServer, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  if (room.currentTrackIndex + 1 >= room.trackQueue.length) {
    room.phase = "end";
    broadcastRoom(io, roomCode);
    return;
  }
  room.currentTrackIndex++;
  room.currentTrack = room.trackQueue[room.currentTrackIndex];
  room.phase = "playing";
  room.votes = {};
  broadcastRoom(io, roomCode);

  if (room.settings.autoPlay) {
    const timer = setTimeout(() => {
      const r = rooms.get(roomCode);
      if (r && r.phase === "playing") {
        r.phase = "voting";
        broadcastRoom(io, roomCode);
      }
    }, 33000);
    playTimers.set(roomCode, timer);
  }
}

function calculateAndReveal(io: SocketIOServer, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.currentTrack) return;

  const timer = playTimers.get(roomCode);
  if (timer) { clearTimeout(timer); playTimers.delete(roomCode); }

  const track = room.currentTrack;
  const ownerId = track.addedBy;
  const owner = room.players.find((p) => p.id === ownerId);

  const voteResults: VoteResult[] = Object.entries(room.votes).map(
    ([voterId, suspectedId]) => ({
      voterId,
      voterName: room.players.find((p) => p.id === voterId)?.name ?? "Inconnu",
      suspectedId,
      suspectedName: room.players.find((p) => p.id === suspectedId)?.name ?? "Inconnu",
      wasCorrect: suspectedId === ownerId,
    })
  );

  const pointsEarned: Record<string, number> = {};
  for (const vr of voteResults) {
    if (vr.wasCorrect) {
      pointsEarned[vr.voterId] = (pointsEarned[vr.voterId] ?? 0) + 1;
    } else if (ownerId) {
      pointsEarned[ownerId] = (pointsEarned[ownerId] ?? 0) + 1;
    }
  }
  for (const [pid, pts] of Object.entries(pointsEarned)) {
    const p = room.players.find((pl) => pl.id === pid);
    if (p) p.score += pts;
  }

  room.roundResults.push({
    track: {
      id: track.id, name: track.name, artists: track.artists,
      albumCover: track.albumCover, previewUrl: track.previewUrl,
      addedBy: track.addedBy,
      addedByName: owner?.name ?? "Inconnu",
    },
    ownerId,
    ownerName: owner?.name ?? "Inconnu",
    votes: voteResults,
    pointsEarned,
  });
  room.phase = "reveal";
  broadcastRoom(io, roomCode);
}

// ─── Server ─────────────────────────────────────────────────────────────────
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname: "localhost", port: 3000 });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const io = new SocketIOServer(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket: Socket) => {
    let currentRoomCode: string | null = null;

    socket.on(
      "create-room",
      ({ playerName, avatar }: { playerName: string; avatar: string }) => {
        const code = generateCode();
        const player: Player = {
          id: socket.id, name: playerName.trim().slice(0, 20),
          avatar: avatar || "", isHost: true, isReady: false, score: 0, tracks: [],
        };
        rooms.set(code, {
          code, players: [player], phase: "lobby", playbackMode: null,
          settings: { ...DEFAULT_SETTINGS },
          trackQueue: [], currentTrackIndex: -1, currentTrack: null,
          votes: {}, roundResults: [],
        });
        socket.join(code);
        currentRoomCode = code;
        socket.emit("joined", { roomCode: code });
        broadcastRoom(io, code);
      }
    );

    socket.on(
      "join-room",
      ({ roomCode, playerName, avatar }: { roomCode: string; playerName: string; avatar: string }) => {
        const code = roomCode.toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { socket.emit("error", { message: "Salon introuvable" }); return; }
        if (room.phase !== "lobby") { socket.emit("error", { message: "La partie a déjà commencé" }); return; }
        if (room.players.length >= 10) { socket.emit("error", { message: "Le salon est plein (max 10)" }); return; }
        room.players.push({
          id: socket.id, name: playerName.trim().slice(0, 20),
          avatar: avatar || "", isHost: false, isReady: false, score: 0, tracks: [],
        });
        socket.join(code);
        currentRoomCode = code;
        socket.emit("joined", { roomCode: code });
        broadcastRoom(io, code);
      }
    );

    socket.on("set-settings", (settings: Partial<RoomSettings>) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.phase !== "lobby") return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      room.settings = { ...room.settings, ...settings };
      // Clamp values
      room.settings.minTracks = Math.max(1, Math.min(5, room.settings.minTracks));
      room.settings.maxTracks = Math.max(room.settings.minTracks, Math.min(10, room.settings.maxTracks));
      broadcastRoom(io, currentRoomCode);
    });

    socket.on("add-track", (trackData: Omit<Track, "addedBy">) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.phase !== "selection") return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;
      if (player.tracks.length >= room.settings.maxTracks) {
        socket.emit("error", { message: `Maximum ${room.settings.maxTracks} musiques` });
        return;
      }
      if (player.tracks.find((t) => t.id === trackData.id)) return;
      player.tracks.push({ ...trackData, addedBy: socket.id });
      broadcastRoom(io, currentRoomCode);
    });

    socket.on("remove-track", ({ trackId }: { trackId: string }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.phase !== "selection") return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;
      player.tracks = player.tracks.filter((t) => t.id !== trackId);
      if (player.isReady) player.isReady = false;
      broadcastRoom(io, currentRoomCode);
    });

    socket.on("set-ready", ({ ready }: { ready: boolean }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.phase !== "selection") return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;
      if (ready && player.tracks.length < room.settings.minTracks) {
        socket.emit("error", { message: `Sélectionne au moins ${room.settings.minTracks} musiques` });
        return;
      }
      player.isReady = ready;
      broadcastRoom(io, currentRoomCode);
    });

    socket.on("start-selection", () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      if (room.players.length < 3) {
        socket.emit("error", { message: "Il faut au moins 3 joueurs" });
        return;
      }
      room.phase = "selection";
      room.players.forEach((p) => { p.isReady = false; p.tracks = []; });
      broadcastRoom(io, currentRoomCode);
    });

    socket.on("start-mode-selection", () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      if (!room.players.every((p) => p.isReady)) {
        socket.emit("error", { message: "Tous les joueurs doivent être prêts" });
        return;
      }
      room.phase = "mode-selection";
      broadcastRoom(io, currentRoomCode);
    });

    socket.on("set-playback-mode", ({ mode }: { mode: PlaybackMode }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      room.playbackMode = mode;
      broadcastRoom(io, currentRoomCode);
    });

    socket.on("start-game", () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || !room.playbackMode) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      room.trackQueue = shuffleArray(room.players.flatMap((p) => p.tracks));
      room.currentTrackIndex = -1;
      room.roundResults = [];
      startPlayingPhase(io, currentRoomCode);
    });

    // Host: manually start music (when autoPlay = false)
    socket.on("host-start-music", () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.phase !== "playing") return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      // Start 33s timer
      const timer = setTimeout(() => {
        const r = rooms.get(currentRoomCode!);
        if (r && r.phase === "playing") {
          r.phase = "voting";
          broadcastRoom(io, currentRoomCode!);
        }
      }, 33000);
      playTimers.set(currentRoomCode, timer);
      // Notify all clients to start audio
      io.to(currentRoomCode).emit("start-audio");
    });

    socket.on(
      "cast-vote",
      ({ suspectedPlayerId }: { suspectedPlayerId: string }) => {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room || (room.phase !== "playing" && room.phase !== "voting")) return;
        if (!room.players.find((p) => p.id === socket.id)) return;
        if (!room.players.find((p) => p.id === suspectedPlayerId)) return;
        // Block self-vote if disabled
        if (!room.settings.allowSelfVote && suspectedPlayerId === socket.id) {
          socket.emit("error", { message: "Tu ne peux pas voter pour toi-même" });
          return;
        }
        room.votes[socket.id] = suspectedPlayerId;
        // Auto-reveal if enabled and all voted
        if (
          room.settings.autoReveal &&
          Object.keys(room.votes).length >= room.players.length
        ) {
          calculateAndReveal(io, currentRoomCode);
        } else {
          broadcastRoom(io, currentRoomCode);
        }
      }
    );

    socket.on("force-reveal", () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      calculateAndReveal(io, currentRoomCode);
    });

    socket.on("next-round", () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.phase !== "reveal") return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      startPlayingPhase(io, currentRoomCode);
    });

    socket.on("play-again", () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.phase !== "end") return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      room.phase = "lobby";
      room.players.forEach((p) => { p.score = 0; p.isReady = false; p.tracks = []; });
      room.trackQueue = []; room.currentTrackIndex = -1; room.currentTrack = null;
      room.votes = {}; room.roundResults = []; room.playbackMode = null;
      broadcastRoom(io, currentRoomCode);
    });

    socket.on("disconnect", () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx === -1) return;
      const wasHost = room.players[idx].isHost;
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        const t = playTimers.get(currentRoomCode);
        if (t) clearTimeout(t);
        rooms.delete(currentRoomCode);
        return;
      }
      if (wasHost) room.players[0].isHost = true;
      broadcastRoom(io, currentRoomCode);
    });
  });

  httpServer.listen(3000, () => {
    console.log("  Kiekoutsa ready on http://localhost:3000");
  });
});
