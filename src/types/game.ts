export type GamePhase =
  | "lobby"
  | "selection"
  | "mode-selection"
  | "playing"
  | "voting"
  | "reveal"
  | "end";

export type PlaybackMode = "master" | "sync";

export interface RoomSettings {
  minTracks: number;      // 1–5, default 3
  maxTracks: number;      // 3–10, default 5
  autoReveal: boolean;    // révèle dès que tout le monde a voté
  autoPlay: boolean;      // démarre la musique automatiquement
  allowSelfVote: boolean; // peut voter pour soi-même
  anonymousVotes: boolean;// cache qui a voté pour qui à la révélation
}

export const DEFAULT_SETTINGS: RoomSettings = {
  minTracks: 3,
  maxTracks: 5,
  autoReveal: false,
  autoPlay: true,
  allowSelfVote: true,
  anonymousVotes: false,
};

export interface Track {
  id: string;
  name: string;
  artists: string;
  albumCover: string;
  previewUrl: string | null;
  addedBy: string;
}

export interface ClientTrack {
  id: string;
  name: string;
  artists: string;
  albumCover: string;
  previewUrl: string | null;
  addedBy: string | null;
  addedByName: string | null;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  tracks: Track[];
}

export interface ClientPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  // trackCount intentionnellement absent
}

export interface VoteResult {
  voterId: string;
  voterName: string;
  suspectedId: string;
  suspectedName: string;
  wasCorrect: boolean;
}

export interface RoundResult {
  track: ClientTrack;
  ownerId: string;
  ownerName: string;
  votes: VoteResult[];
  pointsEarned: Record<string, number>;
}

export interface ClientRoom {
  code: string;
  phase: GamePhase;
  playbackMode: PlaybackMode | null;
  settings: RoomSettings;
  currentTrack: ClientTrack | null;
  currentTrackIndex: number;
  totalTracks: number;
  players: ClientPlayer[];
  myTracks: Track[];
  votedPlayerIds: string[];     // qui a voté (pas ce qu'ils ont voté)
  voteCounts: Record<string, number>; // combien de votes chaque joueur a reçu
  myVote: string | null;
  roundResults: RoundResult[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string;
  albumCover: string;
  previewUrl: string | null;
  durationMs: number;
}
