/**
 * The player colors we can have in Ludo.
 */
export type Color = "red" | "green" | "yellow" | "blue";

/**
 * Represents a single cell on the 15x15 board.
 */
export interface Block {
  redTrack?: number;
  greenTrack?: number;
  blueTrack?: number;
  yellowTrack?: number;

  isSafeZone?: boolean;
  isStartingPosition?: Color;
  isHome?: Color;
  isOnPathToFinalPosition?: Color;
  isFinalPosition?: Color;
}

/**
 * Stores positions of the 4 tokens for each color (0..56, or -1 if in "home")
 */
export type TokenPositions = {
  [key in Color]: [number, number, number, number];
};

/**
 * The possible game states:
 */
export type GameState =
  | "playerHasToRollADice"
  | "playerHasToSelectAPosition"
  | "gameFinished";

/**
 * A snapshot of the game's state, emitted whenever changes occur.
 */
export interface LudoGameState {
  turn: Color;
  tokenPositions: TokenPositions;
  ranking: Color[];
  boardStatus: string;
  diceRoll: number | null;
  lastDiceRoll: number | null;
  gameState: GameState;
  players: Color[];
}
