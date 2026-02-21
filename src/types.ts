
export interface Puzzle {
  id: string;
  type: 'logic' | 'visual' | 'physical';
  question: string;
  hint: string;
  answer: string; // Single digit 0-9
}

export interface TeamData {
  id: number;
  name: string;
  puzzles: Puzzle[];
  code: string; // The 3-digit code
  enteredCode: string; // What the team has entered
  isSolved: boolean;
}

export interface GameState {
  isStarted: boolean;
  isVaultOpen: boolean;
  teams: TeamData[];
  startTime: number | null;
  roomCode: string;
  connectedPlayers: number;
}

export type ServerMessage = 
  | { type: 'INIT'; state: GameState }
  | { type: 'UPDATE'; state: GameState }
  | { type: 'VAULT_OPENED' };

export type ClientMessage = 
  | { type: 'START_GAME'; teamCount: number }
  | { type: 'SUBMIT_CODE'; teamId: number; code: string }
  | { type: 'RESET_GAME' }
  | { type: 'JOIN_ROOM'; roomCode: string };
