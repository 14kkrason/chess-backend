export interface Lobby {
  gameId: string;
  creationTime: number;
  playerName: string;
  playerElo: number;
  playerSocketId: string;
}