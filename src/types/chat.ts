export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  text: string;
  createdAt: string; // ISO
}
