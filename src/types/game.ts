import type { ChatMessage } from "@/types/chat";

export type GamePhase =
  | "lobby"
  | "selection"
  | "mode-selection"
  | "playing"
  | "voting"
  | "reveal"
  | "end";

export type PlaybackMode = "master" | "sync";

export type RoleName = "fou" | "policier" | "guesser" | "none";

export interface RoomSettings {
  minTracks: number;
  maxTracks: number;
  autoReveal: boolean;
  autoPlay: boolean;
  allowSelfVote: boolean;
  anonymousVotes: boolean;
  showVoteCounts: boolean;
  showAllTracksEnd: boolean;
  taupeMode: boolean;
  rolesEnabled: boolean;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  minTracks: 3,
  maxTracks: 5,
  autoReveal: false,
  autoPlay: true,
  allowSelfVote: true,
  anonymousVotes: false,
  showVoteCounts: false,
  showAllTracksEnd: false,
  taupeMode: false,
  rolesEnabled: false,
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

export interface ClientPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
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
  isGuesserRound?: boolean;
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
  votedPlayerIds: string[];
  voteCounts: Record<string, number>;
  myVote: string | null;
  roundResults: RoundResult[];
  playingStartedAt: string | null;
  chatMessages?: ChatMessage[];
  taupePlayerId: string | null;
  isGuesserRound: boolean;
  myRole: RoleName | null;
  policeBlockedId: string | null;
  fouActivated: boolean;
  guesserPickId: string | null;
  allRoles: Record<string, RoleName> | null;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string;
  albumCover: string;
  previewUrl: string | null;
  durationMs: number;
}
