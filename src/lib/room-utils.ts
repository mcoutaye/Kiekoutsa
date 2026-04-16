import type {
  GamePhase, PlaybackMode, RoomSettings, Track,
  ClientRoom, ClientTrack, VoteResult, RoundResult,
} from "@/types/game";
import { DEFAULT_SETTINGS } from "@/types/game";

// ─── DB shape (snake_case, stored in Supabase) ─────────────────────────────
export interface PlayerDB {
  id: string;
  name: string;
  avatar: string;
  is_host: boolean;
  is_ready: boolean;
  score: number;
  tracks: Track[];
}

export interface RoomDB {
  code: string;
  phase: GamePhase;
  playback_mode: PlaybackMode | null;
  settings: RoomSettings;
  players: PlayerDB[];
  track_queue: Track[];
  current_track_index: number;
  current_track: Track | null;
  votes: Record<string, string>;
  round_results: RoundResult[];
  playing_started_at: string | null;
  updated_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function generateCode(existing: Set<string>): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return existing.has(code) ? generateCode(existing) : code;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function computeVoteCounts(
  votes: Record<string, string>,
  playerIds: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  playerIds.forEach((id) => (counts[id] = 0));
  Object.values(votes).forEach((sid) => {
    if (counts[sid] !== undefined) counts[sid]++;
  });
  return counts;
}

// ─── Client-side sanitization ───────────────────────────────────────────────
export function sanitizeRoom(room: RoomDB, myPlayerId: string): ClientRoom {
  const isReveal = room.phase === "reveal" || room.phase === "end";
  const me = room.players.find((p) => p.id === myPlayerId);
  const playerIds = room.players.map((p) => p.id);

  const currentTrack: ClientTrack | null = room.current_track
    ? {
        id: room.current_track.id,
        name: room.current_track.name,
        artists: room.current_track.artists,
        albumCover: room.current_track.albumCover,
        previewUrl: room.current_track.previewUrl,
        addedBy: isReveal ? room.current_track.addedBy : null,
        addedByName: isReveal
          ? (room.players.find((p) => p.id === room.current_track!.addedBy)
              ?.name ?? "Inconnu")
          : null,
      }
    : null;

  return {
    code: room.code,
    phase: room.phase,
    playbackMode: room.playback_mode,
    settings: room.settings ?? DEFAULT_SETTINGS,
    currentTrack,
    currentTrackIndex: room.current_track_index,
    totalTracks: room.track_queue.length,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.is_host,
      isReady: p.is_ready,
      score: p.score,
    })),
    myTracks: me?.tracks ?? [],
    votedPlayerIds: Object.keys(room.votes),
    voteCounts: computeVoteCounts(room.votes, playerIds),
    myVote: room.votes[myPlayerId] ?? null,
    roundResults: room.round_results ?? [],
    playingStartedAt: room.playing_started_at ?? null,
  };
}

// ─── Game logic (used by API routes) ────────────────────────────────────────
export function applyAction(
  room: RoomDB,
  action: string,
  playerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
): { update: Partial<RoomDB>; error?: string } | { error: string } {
  const player = room.players.find((p) => p.id === playerId);
  const isHost = player?.is_host ?? false;
  const now = new Date().toISOString();

  switch (action) {
    case "join-room": {
      if (room.phase !== "lobby") return { error: "La partie a déjà commencé" };
      if (room.players.length >= 10) return { error: "Le salon est plein" };
      if (room.players.find((p) => p.id === playerId)) return { update: {} }; // already in
      const newPlayers: PlayerDB[] = [
        ...room.players,
        {
          id: playerId,
          name: String(payload.playerName ?? "").trim().slice(0, 20),
          avatar: payload.avatar ?? "",
          is_host: false, is_ready: false, score: 0, tracks: [],
        },
      ];
      return { update: { players: newPlayers, updated_at: now } };
    }

    case "set-settings": {
      if (!isHost || room.phase !== "lobby") return { error: "Non autorisé" };
      const s = { ...room.settings, ...payload } as RoomSettings;
      s.minTracks = Math.max(1, Math.min(5, s.minTracks));
      s.maxTracks = Math.max(s.minTracks, Math.min(10, s.maxTracks));
      return { update: { settings: s, updated_at: now } };
    }

    case "add-track": {
      if (room.phase !== "selection" || !player) return { error: "Non autorisé" };
      if (player.tracks.length >= room.settings.maxTracks)
        return { error: `Maximum ${room.settings.maxTracks} musiques` };
      if (player.tracks.find((t) => t.id === payload.id)) return { update: {} };
      player.tracks.push({ ...payload, addedBy: playerId });
      return { update: { players: [...room.players], updated_at: now } };
    }

    case "remove-track": {
      if (room.phase !== "selection" || !player) return { error: "Non autorisé" };
      player.tracks = player.tracks.filter((t) => t.id !== payload.trackId);
      player.is_ready = false;
      return { update: { players: [...room.players], updated_at: now } };
    }

    case "set-ready": {
      if (room.phase !== "selection" || !player) return { error: "Non autorisé" };
      if (payload.ready && player.tracks.length < room.settings.minTracks)
        return { error: `Sélectionne au moins ${room.settings.minTracks} musiques` };
      player.is_ready = payload.ready;
      return { update: { players: [...room.players], updated_at: now } };
    }

    case "start-selection": {
      if (!isHost) return { error: "Non autorisé" };
      if (room.players.length < 3) return { error: "Il faut au moins 3 joueurs" };
      const reset = room.players.map((p) => ({ ...p, is_ready: false, tracks: [] }));
      return { update: { phase: "selection", players: reset, updated_at: now } };
    }

    case "start-mode-selection": {
      if (!isHost) return { error: "Non autorisé" };
      if (!room.players.every((p) => p.is_ready))
        return { error: "Tous les joueurs doivent être prêts" };
      return { update: { phase: "mode-selection", updated_at: now } };
    }

    case "set-playback-mode": {
      if (!isHost) return { error: "Non autorisé" };
      return { update: { playback_mode: payload.mode, updated_at: now } };
    }

    case "start-game": {
      if (!isHost || !room.playback_mode) return { error: "Non autorisé" };
      const allTracks = room.players.flatMap((p) => p.tracks);
      const queue = shuffleArray(allTracks);
      const firstTrack = queue[0] ?? null;
      const startedAt = room.settings.autoPlay ? now : null;
      return {
        update: {
          track_queue: queue,
          current_track_index: 0,
          current_track: firstTrack,
          phase: "playing",
          votes: {},
          round_results: [],
          playing_started_at: startedAt,
          updated_at: now,
        },
      };
    }

    case "host-start-music": {
      if (!isHost || room.phase !== "playing") return { error: "Non autorisé" };
      return { update: { playing_started_at: now, updated_at: now } };
    }

    case "transition-to-voting": {
      if (!isHost || room.phase !== "playing") return { update: {} };
      return { update: { phase: "voting", updated_at: now } };
    }

    case "cast-vote": {
      if (room.phase !== "playing" && room.phase !== "voting")
        return { error: "Vote pas ouvert" };
      if (!player) return { error: "Joueur introuvable" };
      if (!room.settings.allowSelfVote && payload.suspectedPlayerId === playerId)
        return { error: "Tu ne peux pas voter pour toi-même" };
      if (!room.players.find((p) => p.id === payload.suspectedPlayerId))
        return { error: "Joueur cible introuvable" };

      const newVotes = { ...room.votes, [playerId]: payload.suspectedPlayerId };
      const allVoted = Object.keys(newVotes).length >= room.players.length;

      if (allVoted && room.settings.autoReveal) {
        // Inline reveal
        return { update: { votes: newVotes, ...computeReveal(room, newVotes), updated_at: now } };
      }
      return { update: { votes: newVotes, updated_at: now } };
    }

    case "force-reveal": {
      if (!isHost) return { error: "Non autorisé" };
      return { update: { ...computeReveal(room, room.votes), updated_at: now } };
    }

    case "next-round": {
      if (!isHost || room.phase !== "reveal") return { error: "Non autorisé" };
      const nextIdx = room.current_track_index + 1;
      if (nextIdx >= room.track_queue.length) {
        return { update: { phase: "end", updated_at: now } };
      }
      const nextTrack = room.track_queue[nextIdx];
      const startedAt = room.settings.autoPlay ? now : null;
      return {
        update: {
          phase: "playing",
          current_track_index: nextIdx,
          current_track: nextTrack,
          votes: {},
          playing_started_at: startedAt,
          updated_at: now,
        },
      };
    }

    case "play-again": {
      if (!isHost || room.phase !== "end") return { error: "Non autorisé" };
      const reset = room.players.map((p) => ({ ...p, score: 0, is_ready: false, tracks: [] }));
      return {
        update: {
          phase: "lobby", playback_mode: null, players: reset,
          track_queue: [], current_track_index: -1, current_track: null,
          votes: {}, round_results: [], playing_started_at: null, updated_at: now,
        },
      };
    }

    default:
      return { error: `Action inconnue: ${action}` };
  }
}

function computeReveal(room: RoomDB, votes: Record<string, string>): Partial<RoomDB> {
  if (!room.current_track) return { phase: "reveal" };

  const track = room.current_track;
  const ownerId = track.addedBy;
  const owner = room.players.find((p) => p.id === ownerId);

  const voteResults: VoteResult[] = Object.entries(votes).map(([vid, sid]) => ({
    voterId: vid,
    voterName: room.players.find((p) => p.id === vid)?.name ?? "Inconnu",
    suspectedId: sid,
    suspectedName: room.players.find((p) => p.id === sid)?.name ?? "Inconnu",
    wasCorrect: sid === ownerId,
  }));

  const pointsEarned: Record<string, number> = {};
  for (const vr of voteResults) {
    if (vr.wasCorrect) pointsEarned[vr.voterId] = (pointsEarned[vr.voterId] ?? 0) + 1;
    else if (ownerId) pointsEarned[ownerId] = (pointsEarned[ownerId] ?? 0) + 1;
  }

  const updatedPlayers = room.players.map((p) => ({
    ...p,
    score: p.score + (pointsEarned[p.id] ?? 0),
  }));

  const roundResult: RoundResult = {
    track: {
      id: track.id, name: track.name, artists: track.artists,
      albumCover: track.albumCover, previewUrl: track.previewUrl,
      addedBy: track.addedBy, addedByName: owner?.name ?? "Inconnu",
    },
    ownerId, ownerName: owner?.name ?? "Inconnu",
    votes: voteResults, pointsEarned,
  };

  return {
    phase: "reveal",
    players: updatedPlayers,
    round_results: [...room.round_results, roundResult],
  };
}
