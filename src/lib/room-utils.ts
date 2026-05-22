import type {
  GamePhase, PlaybackMode, RoomSettings, Track, RoleName,
  ClientRoom, ClientTrack, VoteResult, RoundResult, PromptResult, PromptSubmissionEntry,
} from "@/types/game";
import type { ChatMessage } from "@/types/chat";
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
  chat_messages?: ChatMessage[];
  playing_started_at: string | null;
  updated_at: string;
  taupe_player_id: string | null;
  guesser_pick: Track | null;
  police_blocked_id: string | null;
  police_blocks_used: number;
  fou_activated: boolean;
  fou_activations_used: number;
  roles: Record<string, string> | null;
  target_assignments: Record<string, string> | null;
  target_votes: Record<string, string>;
  current_round: number;
  // Prompt mode
  prompts: Record<string, string>;
  prompt_order: string[];
  prompt_submissions: Record<string, Record<string, { id: string; name: string; artists: string; albumCover: string; previewUrl: string | null }>>;
  prompt_votes: Record<string, Record<string, string>>;
  player_prompt_progress: Record<string, number>;
  current_prompt_index: number;
  prompt_results: PromptResult[];
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

export function generateDerangement(ids: string[]): string[] {
  if (ids.length < 2) return [...ids];
  let result: string[];
  do {
    result = shuffleArray(ids);
  } while (result.some((v, i) => v === ids[i]));
  return result;
}

function assignCibleTargets(ids: string[]): Record<string, string> {
  const others = (id: string) => ids.filter((x) => x !== id);
  return Object.fromEntries(
    ids.map((id) => {
      const pool = others(id);
      return [id, pool[Math.floor(Math.random() * pool.length)]];
    })
  );
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
  const players = Array.isArray((room as any).players) ? (room as any).players : [];
  const trackQueue = Array.isArray((room as any).track_queue) ? (room as any).track_queue : [];
  const votes = (room as any).votes && typeof (room as any).votes === "object" ? (room as any).votes : {};
  const roundResults = Array.isArray((room as any).round_results) ? (room as any).round_results : [];
  const chatMessages = Array.isArray((room as any).chat_messages) ? (room as any).chat_messages : [];

  const me = players.find((p: any) => p.id === myPlayerId);
  const playerIds = players.map((p: any) => p.id);

  const currentTrack: ClientTrack | null = room.current_track
    ? {
        id: room.current_track.id,
        name: room.current_track.name,
        artists: room.current_track.artists,
        albumCover: room.current_track.albumCover,
        previewUrl: room.current_track.previewUrl,
        addedBy: isReveal ? room.current_track.addedBy : null,
        addedByName: isReveal
          ? (players.find((p: any) => p.id === room.current_track!.addedBy)
              ?.name ?? "Inconnu")
          : null,
      }
    : null;

  const roles = (room as any).roles as Record<string, string> | null ?? null;
  const myRole = roles?.[myPlayerId] as RoleName ?? null;
  const guesserPick = (room as any).guesser_pick as Track | null ?? null;
  const targetAssignments = (room as any).target_assignments as Record<string, string> | null ?? null;
  const targetVotes = (room as any).target_votes as Record<string, string> ?? {};
  const myTargetId = targetAssignments?.[myPlayerId] ?? null;
  const myTargetName = myTargetId ? (players.find((p: any) => p.id === myTargetId)?.name ?? null) : null;
  const myTargetVote = targetVotes[myPlayerId] ?? null;
  const targetVotedPlayerIds = Object.keys(targetVotes);

  const canSeeGuesserPick = myRole === "guesser" || room.phase === "end" || room.phase === "reveal";
  const guesserPickId = canSeeGuesserPick ? guesserPick?.id ?? null : null;
  const guesserPickInfo = myRole === "guesser" && guesserPick
    ? { id: String(guesserPick.id), name: guesserPick.name, artists: guesserPick.artists, albumCover: guesserPick.albumCover ?? "" }
    : null;

  const allRoles: Record<string, RoleName> | null = room.phase === "end" && roles
    ? (roles as Record<string, RoleName>)
    : null;

  // ── Prompt mode fields ──────────────────────────────────────────────────
  const prompts = (room as any).prompts as Record<string, string> ?? {};
  const promptOrder = Array.isArray((room as any).prompt_order) ? (room as any).prompt_order as string[] : [];
  const playerPromptProgress = (room as any).player_prompt_progress as Record<string, number> ?? {};
  const promptSubmissions = (room as any).prompt_submissions as Record<string, Record<string, any>> ?? {};
  const promptVotesAll = (room as any).prompt_votes as Record<string, Record<string, string>> ?? {};
  const promptResults = Array.isArray((room as any).prompt_results) ? (room as any).prompt_results as PromptResult[] : [];
  const currentPromptIndex = (room as any).current_prompt_index as number ?? 0;

  const myPrompt = prompts[myPlayerId] ?? null;
  const promptWritingDoneIds = Object.keys(prompts);

  const N = promptOrder.length;
  const myIndexInOrder = promptOrder.indexOf(myPlayerId);
  const myProgress = playerPromptProgress[myPlayerId] ?? 0;
  const totalPromptAssignments = N > 1 ? N - 1 : 0;
  const isSubmissionDone = myIndexInOrder < 0 || myProgress >= totalPromptAssignments;

  // Current prompt owner: submission phase (per-player) or reveal phase (shared)
  let currentPromptOwnerId: string | null = null;
  if (room.phase === "prompt-submission" && !isSubmissionDone && N > 0) {
    currentPromptOwnerId = promptOrder[(myIndexInOrder + 1 + myProgress) % N];
  } else if (room.phase === "prompt-reveal") {
    currentPromptOwnerId = promptOrder[currentPromptIndex] ?? null;
  }
  const currentPromptText = currentPromptOwnerId ? (prompts[currentPromptOwnerId] ?? null) : null;
  const currentPromptOwnerName = currentPromptOwnerId
    ? (players.find((p: any) => p.id === currentPromptOwnerId)?.name ?? null)
    : null;

  // Reveal phase: submissions (anonymous) + votes
  const promptRevealSubmissions: PromptSubmissionEntry[] = room.phase === "prompt-reveal" && currentPromptOwnerId
    ? Object.entries(promptSubmissions[currentPromptOwnerId] ?? {}).map(([sid, track]) => ({
        submitterId: sid,
        track: { id: track.id, name: track.name, artists: track.artists, albumCover: track.albumCover, previewUrl: track.previewUrl ?? null },
      }))
    : [];
  const currentPromptVotes: Record<string, string> = room.phase === "prompt-reveal" && currentPromptOwnerId
    ? (promptVotesAll[currentPromptOwnerId] ?? {})
    : {};
  const myPromptVote = currentPromptVotes[myPlayerId] ?? null;
  const isCurrentPromptRevealed = promptResults.length > currentPromptIndex;

  return {
    code: room.code,
    phase: room.phase,
    playbackMode: room.playback_mode,
    settings: { ...DEFAULT_SETTINGS, ...(room.settings ?? {}) },
    currentTrack,
    currentTrackIndex: room.current_track_index,
    totalTracks: trackQueue.length,
    players: players.map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.is_host,
      isReady: p.is_ready,
      score: p.score,
    })),
    myTracks: me?.tracks ?? [],
    votedPlayerIds: Object.keys(votes),
    voteCounts: computeVoteCounts(votes, playerIds),
    myVote: votes[myPlayerId] ?? null,
    roundResults: roundResults ?? [],
    playingStartedAt: room.playing_started_at ?? null,
    chatMessages: chatMessages ?? [],
    taupePlayerId: (room as any).taupe_player_id ?? null,
    isGuesserRound: !!(guesserPick && room.current_track?.id === guesserPick.id),
    myRole,
    policeBlockedId: (room as any).police_blocked_id ?? null,
    fouActivated: (room as any).fou_activated ?? false,
    guesserPickId,
    allRoles,
    policeBlocksUsed: (room as any).police_blocks_used ?? 0,
    fouActivationsUsed: (room as any).fou_activations_used ?? 0,
    updatedAt: room.updated_at ?? "",
    guesserPick: guesserPickInfo,
    myTargetId,
    myTargetName,
    myTargetVote,
    targetVotedPlayerIds,
    currentRound: (room as any).current_round ?? 1,
    myPrompt,
    promptWritingDoneIds,
    currentPromptOwnerId,
    currentPromptOwnerName,
    currentPromptText,
    myPromptProgress: myProgress,
    totalPromptAssignments,
    promptRevealSubmissions,
    promptVotes: currentPromptVotes,
    myPromptVote,
    promptResults,
    currentPromptIndex,
    totalPrompts: N,
    isCurrentPromptRevealed,
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
    case "send-chat": {
      if (!player) return { error: "Non autorisé" };
      const raw = String(payload?.text ?? "");
      const text = raw.trim().slice(0, 300);
      if (!text) return { error: "Message vide" };

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        playerId,
        playerName: player.name,
        playerAvatar: player.avatar,
        text,
        createdAt: now,
      };

      const prev = room.chat_messages ?? [];
      const next = [...prev, msg].slice(-200);
      return { update: { chat_messages: next, updated_at: now } };
    }

    case "heartbeat": {
      return { update: { updated_at: now } };
    }

    case "leave-room": {
      if (!player) return { update: {} };

      const remaining = room.players.filter((p) => p.id !== playerId);

      const newVotes: Record<string, string> = {};
      for (const [voterId, suspectedId] of Object.entries(room.votes ?? {})) {
        if (voterId === playerId) continue;
        if (suspectedId === playerId) continue;
        newVotes[voterId] = suspectedId;
      }

      if (isHost && remaining.length > 0) {
        remaining[0] = { ...remaining[0], is_host: true };
      }

      const nextChat = (room.chat_messages ?? []).filter((m) => m.playerId !== playerId);

      return { update: { players: remaining, votes: newVotes, chat_messages: nextChat, updated_at: now } };
    }

    case "join-room": {
      if (room.phase !== "lobby") return { error: "La partie a déjà commencé" };
      if (room.players.length >= 10) return { error: "Le salon est plein" };
      if (room.players.find((p) => p.id === playerId)) return { update: {} };
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
      const s = { ...DEFAULT_SETTINGS, ...room.settings, ...payload } as RoomSettings;
      s.minTracks = Math.max(1, Math.min(5, s.minTracks));
      s.maxTracks = Math.max(s.minTracks, Math.min(10, s.maxTracks));
      if (!Array.isArray(s.enabledRoles)) s.enabledRoles = [];
      s.policeBlocksPerGame = Math.max(1, Math.min(5, s.policeBlocksPerGame ?? 1));
      s.fouActivationsPerGame = Math.max(1, Math.min(5, s.fouActivationsPerGame ?? 1));
      s.numberOfRounds = Math.max(1, Math.min(10, s.numberOfRounds ?? 3));
      s.playlistSwapsAllowed = Math.max(0, Math.min(s.maxTracks, s.playlistSwapsAllowed ?? 2));
      if (s.roleCounts && typeof s.roleCounts === "object") {
        const cleaned: Partial<Record<string, number>> = {};
        for (const [k, v] of Object.entries(s.roleCounts)) {
          cleaned[k] = Math.max(1, Math.min(10, Number(v) || 1));
        }
        s.roleCounts = cleaned;
      }
      return { update: { settings: s, updated_at: now } };
    }

    case "add-track": {
      if (room.phase !== "selection" || !player) return { error: "Non autorisé" };
      const isCible = room.settings.gameMode === "cible";
      const effectiveMax = isCible ? 1 : room.settings.maxTracks;
      if (player.tracks.length >= effectiveMax)
        return { error: isCible ? "1 musique max en Mode Cible" : `Maximum ${room.settings.maxTracks} musiques` };
      if (player.tracks.find((t) => t.id === payload.id)) return { update: {} };
      const guesserPick = (room as any).guesser_pick as Track | null ?? null;
      const roles = (room as any).roles as Record<string, string> | null ?? null;
      if (roles?.[playerId] === "guesser" && guesserPick && String(payload.id) === String(guesserPick.id))
        return { error: "Tu ne peux pas ajouter ta musique de prédiction à ta sélection" };
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
      const isCible = room.settings.gameMode === "cible";
      if (payload.ready) {
        if (isCible) {
          if (player.tracks.length !== 1)
            return { error: "Sélectionne 1 musique pour ta cible" };
        } else if (player.tracks.length < room.settings.minTracks) {
          return { error: `Sélectionne au moins ${room.settings.minTracks} musiques` };
        }
      }
      player.is_ready = payload.ready;
      return { update: { players: [...room.players], updated_at: now } };
    }

    case "kick-player": {
      if (!isHost || room.phase !== "lobby") return { error: "Non autorisé" };
      const targetId = payload.targetId as string;
      if (!targetId || targetId === playerId) return { error: "Cible invalide" };
      const remaining = room.players.filter((p) => p.id !== targetId);
      return { update: { players: remaining, updated_at: now } };
    }

    case "start-selection": {
      if (!isHost) return { error: "Non autorisé" };
      if (room.players.length < 3) return { error: "Il faut au moins 3 joueurs" };

      if (room.settings.gameMode === "prompt") {
        const reset = room.players.map((p) => ({ ...p, is_ready: false, tracks: [], score: p.score }));
        return {
          update: {
            phase: "prompt-writing" as GamePhase,
            players: reset,
            prompts: {},
            prompt_order: [],
            prompt_submissions: {},
            prompt_votes: {},
            player_prompt_progress: {},
            current_prompt_index: 0,
            prompt_results: [],
            round_results: [],
            updated_at: now,
          },
        };
      }

      const reset = room.players.map((p) => ({ ...p, is_ready: false, tracks: [] }));

      const enabledRoles = room.settings.enabledRoles ?? [];
      const roleCounts = (room.settings as any).roleCounts ?? {};
      let roles: Record<string, string> | null = null;
      if (enabledRoles.length > 0) {
        const playerIds = shuffleArray(room.players.map((p) => p.id));
        const expandedRoles: string[] = [];
        enabledRoles.forEach((roleName) => {
          const count = Math.max(1, Math.min(playerIds.length, roleCounts[roleName] ?? 1));
          for (let i = 0; i < count; i++) expandedRoles.push(roleName);
        });
        roles = {};
        expandedRoles.slice(0, playerIds.length).forEach((roleName, idx) => {
          roles![playerIds[idx]] = roleName;
        });
        playerIds.slice(expandedRoles.length).forEach((pid) => {
          roles![pid] = "none";
        });
      }

      const nextPhase: GamePhase = enabledRoles.length > 0 ? "role-reveal" : "selection";

      let target_assignments: Record<string, string> | null = null;
      if (room.settings.gameMode === "cible" && room.players.length >= 2) {
        const pids = room.players.map((p) => p.id);
        target_assignments = assignCibleTargets(pids);
      }

      return {
        update: {
          phase: nextPhase,
          players: reset,
          roles,
          guesser_pick: null,
          police_blocks_used: 0,
          target_assignments,
          target_votes: {},
          current_round: 1,
          updated_at: now,
        },
      };
    }

    case "start-selection-confirmed": {
      if (!isHost || room.phase !== "role-reveal") return { error: "Non autorisé" };
      return { update: { phase: "selection", updated_at: now } };
    }

    case "start-mode-selection": {
      if (!isHost) return { error: "Non autorisé" };
      if (!room.players.every((p) => p.is_ready))
        return { error: "Tous les joueurs doivent être prêts" };
      // Cible mode round 2+: playback_mode already set, skip mode-selection
      if (room.settings.gameMode === "cible" && room.playback_mode) {
        const allTracks = room.players.flatMap((p) => p.tracks);
        const queue = shuffleArray(allTracks);
        const firstTrack = queue[0] ?? null;
        const startedAt = room.settings.autoPlay ? now : null;
        return {
          update: {
            phase: "playing",
            track_queue: queue,
            current_track_index: 0,
            current_track: firstTrack,
            votes: {},
            target_votes: {},
            police_blocked_id: null,
            fou_activated: false,
            playing_started_at: startedAt,
            updated_at: now,
          },
        };
      }
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
          target_votes: {},
          round_results: [],
          playing_started_at: startedAt,
          taupe_player_id: null,
          police_blocked_id: null,
          police_blocks_used: 0,
          fou_activated: false,
          // Explicitly preserve roles and guesser_pick set during start-selection
          roles: room.roles ?? null,
          guesser_pick: room.guesser_pick ?? null,
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
      if (room.settings.gameMode === "cible") {
        return { update: { phase: "voting", roles: room.roles ?? null, updated_at: now } };
      }
      if (isGuesserTrack(room)) {
        return { update: { ...computeGuesserReveal(room), roles: room.roles ?? null, current_track: room.current_track, current_track_index: room.current_track_index, updated_at: now } };
      }
      return { update: { phase: "voting", roles: room.roles ?? null, guesser_pick: room.guesser_pick ?? null, updated_at: now } };
    }

    case "cast-vote": {
      if (room.phase !== "playing" && room.phase !== "voting")
        return { error: "Vote pas ouvert" };
      if (!player) return { error: "Joueur introuvable" };

      const policeBlockedId = (room as any).police_blocked_id as string | null ?? null;
      if (policeBlockedId === playerId) return { error: "Tu es bloqué par le policier ce round" };

      const isCible = room.settings.gameMode === "cible";

      if (isCible) {
        const { chooserId, targetId } = payload as { chooserId: string; targetId: string };
        if (!chooserId || !targetId) return { error: "Payload invalide pour mode cible" };
        if (!room.players.find((p) => p.id === chooserId)) return { error: "Joueur cible introuvable" };
        if (!room.players.find((p) => p.id === targetId)) return { error: "Joueur cible introuvable" };

        const newVotes = { ...room.votes, [playerId]: chooserId };
        const currentTargetVotes = (room as any).target_votes as Record<string, string> ?? {};
        const newTargetVotes = { ...currentTargetVotes, [playerId]: targetId };

        const votingPlayerIds = room.players.filter((p) => p.id !== policeBlockedId).map((p) => p.id);
        const allVoted = votingPlayerIds.every((pid) => newVotes[pid] !== undefined && newTargetVotes[pid] !== undefined);

        if (allVoted && room.settings.autoReveal) {
          return { update: { votes: newVotes, target_votes: newTargetVotes, ...computeCibleReveal(room, newVotes, newTargetVotes), roles: room.roles ?? null, updated_at: now } };
        }
        return { update: { votes: newVotes, target_votes: newTargetVotes, updated_at: now } };
      }

      if (!room.settings.allowSelfVote && payload.suspectedPlayerId === playerId)
        return { error: "Tu ne peux pas voter pour toi-même" };

      const allPlayers = [...room.players];
      const taupePlayerId = (room as any).taupe_player_id as string | null ?? null;
      if (taupePlayerId && payload.suspectedPlayerId !== taupePlayerId) {
        if (!allPlayers.find((p) => p.id === payload.suspectedPlayerId))
          return { error: "Joueur cible introuvable" };
      } else if (!taupePlayerId) {
        if (!room.players.find((p) => p.id === payload.suspectedPlayerId))
          return { error: "Joueur cible introuvable" };
      }

      const newVotes = { ...room.votes, [playerId]: payload.suspectedPlayerId };
      const votingPlayerIds = room.players
        .filter((p) => p.id !== policeBlockedId)
        .map((p) => p.id);
      const allVoted = votingPlayerIds.every((pid) => newVotes[pid] !== undefined);

      if (allVoted && room.settings.autoReveal) {
        if (isGuesserTrack(room)) {
          return { update: { votes: newVotes, ...computeGuesserReveal(room), roles: room.roles ?? null, current_track: room.current_track, current_track_index: room.current_track_index, updated_at: now } };
        }
        return { update: { votes: newVotes, ...computeReveal(room, newVotes), roles: room.roles ?? null, updated_at: now } };
      }
      return { update: { votes: newVotes, updated_at: now } };
    }

    case "force-reveal": {
      if (!isHost) return { error: "Non autorisé" };
      if (room.settings.gameMode === "cible") {
        const tv = (room as any).target_votes as Record<string, string> ?? {};
        return { update: { ...computeCibleReveal(room, room.votes, tv), roles: room.roles ?? null, updated_at: now } };
      }
      if (isGuesserTrack(room)) {
        return { update: { ...computeGuesserReveal(room), roles: room.roles ?? null, current_track: room.current_track, current_track_index: room.current_track_index, updated_at: now } };
      }
      return { update: { ...computeReveal(room, room.votes), roles: room.roles ?? null, updated_at: now } };
    }

    case "next-round": {
      if (!isHost || room.phase !== "reveal") return { error: "Non autorisé" };
      const nextIdx = room.current_track_index + 1;

      if (room.settings.gameMode === "cible") {
        const currentRound = (room as any).current_round as number ?? 1;
        const numberOfRounds = room.settings.numberOfRounds ?? 3;

        if (nextIdx < room.track_queue.length) {
          // More tracks in this round
          const nextTrack = room.track_queue[nextIdx];
          const startedAt = room.settings.autoPlay ? now : null;
          return {
            update: {
              phase: "playing",
              current_track_index: nextIdx,
              current_track: nextTrack,
              votes: {},
              target_votes: {},
              police_blocked_id: null,
              fou_activated: false,
              playing_started_at: startedAt,
              roles: room.roles ?? null,
              updated_at: now,
            },
          };
        }

        // End of this round's tracks
        if (currentRound >= numberOfRounds) {
          return { update: { phase: "end", roles: room.roles ?? null, updated_at: now } };
        }

        // More rounds: regenerate targets, reset players, back to selection
        const pids = room.players.map((p) => p.id);
        const newTargetAssignments = assignCibleTargets(pids);
        const resetPlayers = room.players.map((p) => ({ ...p, is_ready: false, tracks: [] }));
        return {
          update: {
            phase: "selection",
            players: resetPlayers,
            target_assignments: newTargetAssignments,
            target_votes: {},
            votes: {},
            current_round: currentRound + 1,
            police_blocked_id: null,
            fou_activated: false,
            updated_at: now,
          },
        };
      }

      // Non-cible modes: original logic
      if (nextIdx >= room.track_queue.length) {
        return { update: { phase: "end", roles: room.roles ?? null, updated_at: now } };
      }
      const nextTrack = room.track_queue[nextIdx];
      const startedAt = room.settings.autoPlay ? now : null;
      return {
        update: {
          phase: "playing",
          current_track_index: nextIdx,
          current_track: nextTrack,
          votes: {},
          target_votes: {},
          police_blocked_id: null,
          fou_activated: false,
          playing_started_at: startedAt,
          roles: room.roles ?? null,
          guesser_pick: room.guesser_pick ?? null,
          updated_at: now,
        },
      };
    }

    case "play-again": {
      if (!isHost || room.phase !== "end") return { error: "Non autorisé" };
      const reset = room.players.filter((p) => p.id !== "__taupe__").map((p) => ({ ...p, score: 0, is_ready: false, tracks: [] }));
      return {
        update: {
          phase: "lobby", playback_mode: null, players: reset,
          track_queue: [], current_track_index: -1, current_track: null,
          votes: {}, round_results: [], chat_messages: [], playing_started_at: null,
          roles: null, taupe_player_id: null, guesser_pick: null,
          police_blocked_id: null, police_blocks_used: 0, fou_activated: false, fou_activations_used: 0,
          target_assignments: null, target_votes: {},
          current_round: 1,
          prompts: {}, prompt_order: [], prompt_submissions: {}, prompt_votes: {},
          player_prompt_progress: {}, current_prompt_index: 0, prompt_results: [],
          updated_at: now,
        },
      };
    }

    case "guesser-pick-track": {
      if (room.phase !== "selection" || !player) return { error: "Non autorisé" };
      const roles = (room as any).roles as Record<string, string> | null ?? null;
      if (roles?.[playerId] !== "guesser") return { error: "Tu n'es pas le Guesser" };
      const track = payload as Track;
      if (player.tracks.find((t) => String(t.id) === String(track.id)))
        return { error: "Tu ne peux pas prédire un son que tu as déjà ajouté à ta sélection" };
      return { update: { guesser_pick: { ...track, addedBy: playerId }, updated_at: now } };
    }

    case "police-block": {
      if (room.phase !== "playing" && room.phase !== "voting") return { error: "Non autorisé" };
      if (!player) return { error: "Non autorisé" };
      const roles = (room as any).roles as Record<string, string> | null ?? null;
      if (roles?.[playerId] !== "policier") return { error: "Tu n'es pas le Policier" };
      if ((room as any).police_blocked_id) return { error: "Tu as déjà bloqué ce round" };
      const blocksUsed = (room as any).police_blocks_used as number ?? 0;
      const blocksAllowed = room.settings.policeBlocksPerGame ?? 1;
      if (blocksUsed >= blocksAllowed) return { error: "Tu as épuisé tous tes blocages" };
      const targetId = payload.targetId as string;
      if (!room.players.find((p) => p.id === targetId)) return { error: "Joueur cible introuvable" };
      if (room.votes && room.votes[targetId] !== undefined) return { error: "Ce joueur a déjà voté" };
      return { update: { police_blocked_id: targetId, police_blocks_used: blocksUsed + 1, updated_at: now } };
    }

    case "fou-activate": {
      if (room.phase !== "playing" && room.phase !== "voting") return { error: "Non autorisé" };
      if (!player) return { error: "Non autorisé" };
      const fouRoles = (room as any).roles as Record<string, string> | null ?? null;
      if (fouRoles?.[playerId] !== "fou") return { error: "Tu n'es pas le Fou" };
      if ((room as any).fou_activated) return { error: "Pouvoir déjà actif ce round" };
      if (room.current_track?.addedBy === playerId) return { error: "Ce n'est pas ta musique" };
      const fouUsed = (room as any).fou_activations_used as number ?? 0;
      const fouAllowed = room.settings.fouActivationsPerGame ?? 1;
      if (fouUsed >= fouAllowed) return { error: "Tu as épuisé toutes tes activations" };
      return { update: { fou_activated: true, fou_activations_used: fouUsed + 1, updated_at: now } };
    }

    case "submit-prompt": {
      if (room.phase !== "prompt-writing" || !player) return { error: "Non autorisé" };
      const text = String(payload?.text ?? "").trim().slice(0, 100);
      if (!text) return { error: "Prompt vide" };
      const currentPrompts = (room as any).prompts as Record<string, string> ?? {};
      if (currentPrompts[playerId]) return { error: "Tu as déjà soumis un prompt" };
      const newPrompts = { ...currentPrompts, [playerId]: text };
      // Auto-start submission if all players submitted
      if (Object.keys(newPrompts).length >= room.players.length) {
        const order = shuffleArray(room.players.map((p) => p.id));
        const progress: Record<string, number> = {};
        order.forEach((id) => { progress[id] = 0; });
        return {
          update: {
            prompts: newPrompts,
            phase: "prompt-submission" as GamePhase,
            prompt_order: order,
            player_prompt_progress: progress,
            updated_at: now,
          },
        };
      }
      return { update: { prompts: newPrompts, updated_at: now } };
    }

    case "force-start-prompt-submission": {
      if (!isHost || room.phase !== "prompt-writing") return { error: "Non autorisé" };
      const currentPrompts = (room as any).prompts as Record<string, string> ?? {};
      // Fill missing prompts with a placeholder
      const filledPrompts = { ...currentPrompts };
      room.players.forEach((p) => {
        if (!filledPrompts[p.id]) filledPrompts[p.id] = "???";
      });
      const order = shuffleArray(room.players.map((p) => p.id));
      const progress: Record<string, number> = {};
      order.forEach((id) => { progress[id] = 0; });
      return {
        update: {
          prompts: filledPrompts,
          phase: "prompt-submission" as GamePhase,
          prompt_order: order,
          player_prompt_progress: progress,
          updated_at: now,
        },
      };
    }

    case "submit-prompt-song": {
      if (room.phase !== "prompt-submission" || !player) return { error: "Non autorisé" };
      const { promptOwnerId, track } = payload as { promptOwnerId: string; track: { id: string; name: string; artists: string; albumCover: string; previewUrl: string | null } };
      if (!promptOwnerId || !track) return { error: "Payload invalide" };
      if (promptOwnerId === playerId) return { error: "Tu ne peux pas soumettre pour ton propre prompt" };
      const promptOrder = (room as any).prompt_order as string[] ?? [];
      const playerProgress = (room as any).player_prompt_progress as Record<string, number> ?? {};
      const myIdx = promptOrder.indexOf(playerId);
      const myProg = playerProgress[playerId] ?? 0;
      const N = promptOrder.length;
      const expectedOwnerId = N > 0 && myIdx >= 0 ? promptOrder[(myIdx + 1 + myProg) % N] : null;
      if (expectedOwnerId !== promptOwnerId) return { error: "Ce n'est pas le prompt actuel" };
      const currentSubs = (room as any).prompt_submissions as Record<string, Record<string, any>> ?? {};
      const newSubs = {
        ...currentSubs,
        [promptOwnerId]: { ...(currentSubs[promptOwnerId] ?? {}), [playerId]: track },
      };
      const newProgress = { ...playerProgress, [playerId]: myProg + 1 };
      // Check if all players finished all assignments
      const totalAssignments = N - 1;
      const allDone = promptOrder.every((pid) => (newProgress[pid] ?? 0) >= totalAssignments);
      if (allDone) {
        return {
          update: {
            prompt_submissions: newSubs,
            player_prompt_progress: newProgress,
            phase: "prompt-reveal" as GamePhase,
            current_prompt_index: 0,
            updated_at: now,
          },
        };
      }
      return { update: { prompt_submissions: newSubs, player_prompt_progress: newProgress, updated_at: now } };
    }

    case "cast-prompt-vote": {
      if (room.phase !== "prompt-reveal" || !player) return { error: "Non autorisé" };
      const promptOrder = (room as any).prompt_order as string[] ?? [];
      const currentPIdx = (room as any).current_prompt_index as number ?? 0;
      const currentOwner = promptOrder[currentPIdx] ?? null;
      if (!currentOwner) return { error: "Prompt introuvable" };
      const promptResults = Array.isArray((room as any).prompt_results) ? (room as any).prompt_results as PromptResult[] : [];
      if (promptResults.length > currentPIdx) return { error: "Les votes sont déjà révélés" };
      const { submitterId } = payload as { submitterId: string };
      if (!submitterId) return { error: "Payload invalide" };
      if (submitterId === playerId) return { error: "Tu ne peux pas voter pour toi-même" };
      const currentVotesAll = (room as any).prompt_votes as Record<string, Record<string, string>> ?? {};
      const currentVotes = currentVotesAll[currentOwner] ?? {};
      if (currentVotes[playerId]) return { error: "Tu as déjà voté" };
      const newVotes = { ...currentVotesAll, [currentOwner]: { ...currentVotes, [playerId]: submitterId } };
      // Auto-reveal if all eligible players voted
      const eligibleVoters = room.players;
      const newCurrentVotes = newVotes[currentOwner];
      const allVoted = eligibleVoters.every((p) => newCurrentVotes[p.id] !== undefined);
      if (allVoted && room.settings.autoReveal) {
        return { update: { prompt_votes: newVotes, ...computePromptReveal(room, currentOwner, newVotes), updated_at: now } };
      }
      return { update: { prompt_votes: newVotes, updated_at: now } };
    }

    case "force-reveal-prompt": {
      if (!isHost || room.phase !== "prompt-reveal") return { error: "Non autorisé" };
      const promptOrder = (room as any).prompt_order as string[] ?? [];
      const currentPIdx = (room as any).current_prompt_index as number ?? 0;
      const currentOwner = promptOrder[currentPIdx] ?? null;
      if (!currentOwner) return { error: "Prompt introuvable" };
      const promptResults = Array.isArray((room as any).prompt_results) ? (room as any).prompt_results as PromptResult[] : [];
      if (promptResults.length > currentPIdx) return { error: "Déjà révélé" };
      const promptVotesAll = (room as any).prompt_votes as Record<string, Record<string, string>> ?? {};
      return { update: { ...computePromptReveal(room, currentOwner, promptVotesAll), updated_at: now } };
    }

    case "next-prompt": {
      if (!isHost || room.phase !== "prompt-reveal") return { error: "Non autorisé" };
      const promptOrder = (room as any).prompt_order as string[] ?? [];
      const currentPIdx = (room as any).current_prompt_index as number ?? 0;
      const promptResults = Array.isArray((room as any).prompt_results) ? (room as any).prompt_results as PromptResult[] : [];
      if (promptResults.length <= currentPIdx) return { error: "Révèle d'abord les votes" };
      const nextIdx = currentPIdx + 1;
      if (nextIdx >= promptOrder.length) {
        return { update: { phase: "end" as GamePhase, updated_at: now } };
      }
      return { update: { current_prompt_index: nextIdx, updated_at: now } };
    }

    default:
      return { error: `Action inconnue: ${action}` };
  }
}

function computePromptReveal(
  room: RoomDB,
  promptOwnerId: string,
  promptVotesAll: Record<string, Record<string, string>>
): Partial<RoomDB> {
  const prompts = (room as any).prompts as Record<string, string> ?? {};
  const promptSubmissions = (room as any).prompt_submissions as Record<string, Record<string, any>> ?? {};
  const promptResults = Array.isArray((room as any).prompt_results) ? (room as any).prompt_results as PromptResult[] : [];
  const promptOwner = room.players.find((p) => p.id === promptOwnerId);
  const votes = promptVotesAll[promptOwnerId] ?? {};

  const votesBySubmitter: Record<string, number> = {};
  Object.values(votes).forEach((sid) => {
    votesBySubmitter[sid] = (votesBySubmitter[sid] ?? 0) + 1;
  });

  const submissions = Object.entries(promptSubmissions[promptOwnerId] ?? {}).map(([sid, track]) => ({
    submitterId: sid,
    submitterName: room.players.find((p) => p.id === sid)?.name ?? "Inconnu",
    track: { id: track.id, name: track.name, artists: track.artists, albumCover: track.albumCover, previewUrl: track.previewUrl ?? null },
  }));

  const pointsEarned: Record<string, number> = {};
  Object.values(votes).forEach((sid) => {
    pointsEarned[sid] = (pointsEarned[sid] ?? 0) + 1;
  });

  const updatedPlayers = room.players.map((p) => ({
    ...p,
    score: p.score + (pointsEarned[p.id] ?? 0),
  }));

  const result: PromptResult = {
    promptOwnerId,
    promptOwnerName: promptOwner?.name ?? "Inconnu",
    promptText: prompts[promptOwnerId] ?? "",
    submissions,
    votesBySubmitter,
    pointsEarned,
  };

  return {
    players: updatedPlayers,
    prompt_results: [...promptResults, result],
  };
}

function isGuesserTrack(room: RoomDB): boolean {
  const pick = (room as any).guesser_pick as Track | null ?? null;
  const currentId = room.current_track?.id ? String(room.current_track.id) : null;
  const pickId = pick?.id ? String(pick.id) : null;
  return !!(currentId && pickId && currentId === pickId);
}

function computeGuesserReveal(room: RoomDB): Partial<RoomDB> {
  const roles = (room as any).roles as Record<string, string> | null ?? null;
  const guesserId = Object.entries(roles ?? {}).find(([, r]) => r === "guesser")?.[0];
  const pointsEarned: Record<string, number> = guesserId ? { [guesserId]: 10 } : {};
  const updatedPlayers = room.players.map((p) => ({ ...p, score: p.score + (pointsEarned[p.id] ?? 0) }));
  const track = room.current_track!;
  const owner = room.players.find((p) => p.id === track.addedBy);
  const roundResult: RoundResult = {
    track: {
      id: track.id, name: track.name, artists: track.artists,
      albumCover: track.albumCover, previewUrl: track.previewUrl,
      addedBy: track.addedBy, addedByName: owner?.name ?? "Inconnu",
    },
    ownerId: track.addedBy,
    ownerName: owner?.name ?? "Inconnu",
    votes: [],
    pointsEarned,
    isGuesserRound: true,
  };
  return {
    phase: "reveal",
    players: updatedPlayers,
    round_results: [...room.round_results, roundResult],
  };
}

function computeCibleReveal(room: RoomDB, votes: Record<string, string>, targetVotes: Record<string, string>): Partial<RoomDB> {
  if (!room.current_track) return { phase: "reveal" };

  const track = room.current_track;
  const ownerId = track.addedBy;
  const owner = room.players.find((p) => p.id === ownerId);
  const targetAssignments = (room as any).target_assignments as Record<string, string> | null ?? null;
  const targetId = targetAssignments?.[ownerId] ?? null;
  const targetPlayer = targetId ? room.players.find((p) => p.id === targetId) : null;
  const targetName = targetPlayer?.name ?? null;

  const voteResults: VoteResult[] = Object.entries(votes).map(([vid, chooserGuessId]) => {
    const targetGuessId = targetVotes[vid] ?? null;
    const chooserCorrect = chooserGuessId === ownerId;
    const targetCorrect = !!targetId && targetGuessId === targetId;
    return {
      voterId: vid,
      voterName: room.players.find((p) => p.id === vid)?.name ?? "Inconnu",
      suspectedId: chooserGuessId,
      suspectedName: room.players.find((p) => p.id === chooserGuessId)?.name ?? "Inconnu",
      wasCorrect: chooserCorrect,
      targetGuessId: targetGuessId ?? undefined,
      targetGuessName: targetGuessId ? (room.players.find((p) => p.id === targetGuessId)?.name ?? "Inconnu") : undefined,
      targetWasCorrect: targetCorrect,
    };
  });

  const pointsEarned: Record<string, number> = {};
  for (const vr of voteResults) {
    if (vr.voterId === ownerId) continue;
    if (vr.wasCorrect && vr.targetWasCorrect) {
      pointsEarned[vr.voterId] = (pointsEarned[vr.voterId] ?? 0) + 4;
    } else if (vr.wasCorrect) {
      pointsEarned[vr.voterId] = (pointsEarned[vr.voterId] ?? 0) + 2;
    } else if (vr.targetWasCorrect) {
      pointsEarned[vr.voterId] = (pointsEarned[vr.voterId] ?? 0) + 1;
    }
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
    ownerId,
    ownerName: owner?.name ?? "Inconnu",
    votes: voteResults,
    pointsEarned,
    targetId: targetId ?? undefined,
    targetName: targetName ?? undefined,
  };

  return {
    phase: "reveal",
    players: updatedPlayers,
    round_results: [...room.round_results, roundResult],
  };
}

function computeReveal(room: RoomDB, votes: Record<string, string>): Partial<RoomDB> {
  if (!room.current_track) return { phase: "reveal" };

  const track = room.current_track;
  const ownerId = track.addedBy;
  const owner = room.players.find((p) => p.id === ownerId);
  const taupePlayerId = (room as any).taupe_player_id as string | null ?? null;
  const isTaupeRound = !!taupePlayerId && ownerId === taupePlayerId;
  const fouActivated = (room as any).fou_activated as boolean ?? false;
  const roles = (room as any).roles as Record<string, string> | null ?? null;
  const fouId = Object.entries(roles ?? {}).find(([, r]) => r === "fou")?.[0];

  const voteResults: VoteResult[] = Object.entries(votes).map(([vid, sid]) => ({
    voterId: vid,
    voterName: room.players.find((p) => p.id === vid)?.name ?? "Inconnu",
    suspectedId: sid,
    suspectedName: sid === taupePlayerId
      ? "La Taupe"
      : room.players.find((p) => p.id === sid)?.name ?? "Inconnu",
    wasCorrect: sid === ownerId,
  }));

  const pointsEarned: Record<string, number> = {};

  if (isTaupeRound) {
    for (const vr of voteResults) {
      if (vr.wasCorrect) {
        pointsEarned[vr.voterId] = (pointsEarned[vr.voterId] ?? 0) + 2;
      } else {
        const current = pointsEarned[vr.voterId] ?? 0;
        pointsEarned[vr.voterId] = Math.max(0, current - 1);
      }
    }
  } else {
    for (const vr of voteResults) {
      if (vr.wasCorrect) {
        if (vr.voterId !== ownerId) {
          pointsEarned[vr.voterId] = (pointsEarned[vr.voterId] ?? 0) + 1;
        }
      } else if (ownerId) {
        pointsEarned[ownerId] = (pointsEarned[ownerId] ?? 0) + 1;
      }
    }
  }

  if (fouActivated && fouId) {
    // Self-votes don't count for Fou power — prevents the exploit
    const fouVoteCount = voteResults.filter((v) => v.suspectedId === fouId && v.voterId !== fouId).length;
    if (fouVoteCount > 0) {
      pointsEarned[fouId] = (pointsEarned[fouId] ?? 0) + fouVoteCount;
    }
  }

  const updatedPlayers = room.players.map((p) => ({
    ...p,
    score: p.score + (pointsEarned[p.id] ?? 0),
  }));

  const ownerName = isTaupeRound ? "La Taupe" : owner?.name ?? "Inconnu";

  const roundResult: RoundResult = {
    track: {
      id: track.id, name: track.name, artists: track.artists,
      albumCover: track.albumCover, previewUrl: track.previewUrl,
      addedBy: track.addedBy, addedByName: ownerName,
    },
    ownerId, ownerName,
    votes: voteResults, pointsEarned,
  };

  return {
    phase: "reveal",
    players: updatedPlayers,
    round_results: [...room.round_results, roundResult],
  };
}
