export interface Player {
  socketId: string;
  username: string;
  attempts: number;
  score: number;
}

export interface GameSession {
  id: string;
  gameMasterId: string;
  gameMasterusername: string;
  status: 'waiting' | 'active' | 'ended';
  question: string;
  answer: string;
  players: Player[];
  winnerId?: string;
  startedAt?: number;
}
