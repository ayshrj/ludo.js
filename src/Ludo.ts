import { EventEmitter } from "events";
import { Color, Block, TokenPositions, GameState } from "./types";

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

/**
 * Generate a random integer between min and max, inclusive.
 * @param min - The lower bound (inclusive).
 * @param max - The upper bound (inclusive).
 * @returns A random integer between min and max.
 */
function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * The Ludo class extends EventEmitter so you can listen to "stateChange" events.
 */
export class Ludo extends EventEmitter {
  /** The 15x15 board, with `Block` or `null` if not used. */
  board!: (Block | null)[][];

  /** The positions of all tokens for each color. */
  tokenPositions!: TokenPositions;

  /** The color currently taking its turn. */
  currentPiece!: Color;

  /** Which colors have completely finished (all tokens at final), in order. */
  ranking: Color[] = [];

  /** The current dice roll value, or null if not rolled yet. */
  currentDiceRoll: number | null = null;

  /** The previous dice roll value (for reference in UI, etc.). */
  lastDiceRoll: number | null = null;

  /** Token indices (0..3) that are valid to move with the current dice roll. */
  validTokenIndices: number[] = [];

  /** Number of consecutive sixes rolled by the current player. */
  currentConsecutiveSixes = 0;

  /** Track length from index 0 to 56. */
  readonly TRACK_LENGTH = 57;

  /** Indices on the track considered "safe" (cannot be captured). */
  readonly safeZones: number[] = [0, 8, 13, 21, 26, 34, 39, 47];

  /** A status message about the current board state (e.g. "Blue captured a token"). */
  currentBoardStatus = "";

  /** The overall game state. */
  gameState: GameState = "playerHasToRollADice";

  /** Color-specific paths for each player's tokens ([row, col] coordinates). */
  colorPaths!: Record<Color, [number, number][]>;

  /** The active player colors in this game (e.g. ["blue","red","green"]). */
  players: Color[] = [];

  /**
   * Create a new Ludo game with the specified number of players (2..4).
   * Emits a "stateChange" event whenever the internal state changes.
   */
  constructor(private numberOfPlayers: 2 | 3 | 4 = 4) {
    super();

    // Decide which colors to use
    if (numberOfPlayers === 2) {
      this.players = ["blue", "green"];
    } else if (numberOfPlayers === 3) {
      this.players = ["blue", "red", "green"];
    } else {
      this.players = ["blue", "red", "green", "yellow"];
    }

    this.reset();
  }

  /**
   * Emit the current state to all listeners of "stateChange".
   */
  private emitStateChange(): void {
    this.emit("stateChange", this.getCurrentState());
  }

  /**
   * Reset the entire board, token positions, ranking, etc.
   * Randomly selects which color starts.
   */
  reset(): void {
    // Create a 15x15 board (null means no block data)
    this.board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => null)
    );

    // Initialize token positions (all at -1 = "home")
    this.tokenPositions = {
      red: [-1, -1, -1, -1],
      green: [-1, -1, -1, -1],
      yellow: [-1, -1, -1, -1],
      blue: [-1, -1, -1, -1],
    };

    this.ranking = [];
    this.currentDiceRoll = null;
    this.lastDiceRoll = null;
    this.validTokenIndices = [];
    this.currentConsecutiveSixes = 0;
    this.currentBoardStatus = "";
    this.gameState = "playerHasToRollADice";

    // Randomly pick which color starts
    const randomIndex = random(0, this.players.length - 1);
    this.currentPiece = this.players[randomIndex];

    // Define home positions for each color
    const homePositions: Record<Color, [number, number][]> = {
      red: [
        [1, 1],
        [1, 4],
        [4, 1],
        [4, 4],
      ],
      green: [
        [1, 10],
        [1, 13],
        [4, 10],
        [4, 13],
      ],
      yellow: [
        [10, 10],
        [10, 13],
        [13, 10],
        [13, 13],
      ],
      blue: [
        [10, 1],
        [10, 4],
        [13, 1],
        [13, 4],
      ],
    };

    // Mark home squares for active players
    for (const color of this.players) {
      homePositions[color].forEach(([r, c]) => {
        this.board[r][c] = { isHome: color };
      });
    }

    // Build the base "red" path of length 57
    const redPath: [number, number][] = [];
    for (let c = 1; c <= 5; c++) redPath.push([6, c]);
    for (let r = 5; r >= 0; r--) redPath.push([r, 6]);
    for (let c = 7; c <= 8; c++) redPath.push([0, c]);
    for (let r = 1; r <= 5; r++) redPath.push([r, 8]);
    for (let c = 9; c <= 14; c++) redPath.push([6, c]);
    for (let r = 7; r <= 8; r++) redPath.push([r, 14]);
    for (let c = 13; c >= 9; c--) redPath.push([8, c]);
    for (let r = 9; r <= 14; r++) redPath.push([r, 8]);
    for (let c = 7; c >= 6; c--) redPath.push([14, c]);
    for (let r = 13; r >= 9; r--) redPath.push([r, 6]);
    for (let c = 5; c >= 0; c--) redPath.push([8, c]);
    for (let c = 0; c <= 6; c++) redPath.push([7, c]);

    // Rotate redPath for other colors
    const paths: Record<Color, [number, number][]> = {
      red: redPath,
      green: redPath.map((coord) => this.rotateCoord(coord, 90)),
      yellow: redPath.map((coord) => this.rotateCoord(coord, 180)),
      blue: redPath.map((coord) => this.rotateCoord(coord, 270)),
    };
    this.colorPaths = paths;

    // Mark track indices & special flags on the board
    for (const color of this.players) {
      const colorPath = paths[color];
      colorPath.forEach(([r, c], index) => {
        if (!this.board[r][c]) {
          this.board[r][c] = {};
        }
        // Mark the track index
        if (color === "red") this.board[r][c]!.redTrack = index;
        if (color === "green") this.board[r][c]!.greenTrack = index;
        if (color === "blue") this.board[r][c]!.blueTrack = index;
        if (color === "yellow") this.board[r][c]!.yellowTrack = index;

        // Safe zones
        if (this.safeZones.includes(index)) {
          this.board[r][c]!.isSafeZone = true;
        }
        // Starting position => index=0
        if (index === 0) {
          this.board[r][c]!.isStartingPosition = color;
          this.board[r][c]!.isSafeZone = true;
        }
        // On path to final => 51..55
        if (index >= 51 && index <= 55) {
          this.board[r][c]!.isOnPathToFinalPosition = color;
        }
        // Final => index=56
        if (index === 56) {
          this.board[r][c]!.isFinalPosition = color;
        }
      });
    }

    // Emit new state
    this.emitStateChange();
  }

  /**
   * Rotate (r,c) by 90/180/270 around center (7,7).
   */
  private rotateCoord(
    [r, c]: [number, number],
    angle: 90 | 180 | 270
  ): [number, number] {
    const center = 7;
    if (angle === 90) {
      return [center + (c - center), center - (r - center)];
    } else if (angle === 180) {
      return [14 - r, 14 - c];
    } else {
      // 270
      return [center - (c - center), center + (r - center)];
    }
  }

  /**
   * Roll the dice for the current player, if allowed.
   * Automatically checks for consecutive sixes & skip turn if needed.
   */
  rollDiceForCurrentPiece(): number {
    if (this.gameState !== "playerHasToRollADice") {
      this.currentBoardStatus = `Invalid action. Current state: ${this.gameState}.`;
      this.emitStateChange();
      return -1;
    }

    if (this.currentDiceRoll !== null) {
      this.currentBoardStatus =
        "Already rolled. You must move a token or wait/pass.";
      this.emitStateChange();
      return this.currentDiceRoll;
    }

    const rollValue = random(1, 6);
    this.currentDiceRoll = rollValue;
    this.lastDiceRoll = rollValue;

    // Handle consecutive sixes
    if (rollValue === 6) {
      this.currentConsecutiveSixes++;
      if (this.currentConsecutiveSixes === 3) {
        this.currentBoardStatus = `Three consecutive sixes. Turn skipped for ${this.currentPiece}.`;
        this.resetTurnState(false);
        this.nextTurn();
        this.emitStateChange();
        return rollValue;
      }
    } else {
      this.currentConsecutiveSixes = 0;
    }

    // Determine valid moves
    this.validTokenIndices = this.getValidMoves(this.currentPiece, rollValue);
    if (this.validTokenIndices.length === 0) {
      this.currentBoardStatus = `No valid moves for ${this.currentPiece} (rolled ${rollValue}). Passing turn.`;
      this.resetTurnState(false);
      this.nextTurn();
      this.emitStateChange();
    } else {
      this.gameState = "playerHasToSelectAPosition";
      this.emitStateChange();
    }
    return rollValue;
  }

  /**
   * The user/bot picks which token to move (0..3), if valid.
   */
  selectToken(tokenIndex: number): void {
    if (this.gameState !== "playerHasToSelectAPosition") {
      this.currentBoardStatus = `Invalid action. State: ${this.gameState}`;
      this.emitStateChange();
      return;
    }
    if (this.currentDiceRoll === null) {
      this.currentBoardStatus = "You must roll before selecting a token.";
      this.emitStateChange();
      return;
    }
    if (!this.validTokenIndices.includes(tokenIndex)) {
      this.currentBoardStatus = "That token is not a valid choice.";
      this.emitStateChange();
      return;
    }

    const roll = this.currentDiceRoll;
    const currentPos = this.tokenPositions[this.currentPiece][tokenIndex];

    let newPos: number;
    // If at home (-1), need a 6 to move out
    if (currentPos === -1) {
      if (roll !== 6) {
        this.currentBoardStatus = "Cannot leave home without rolling a 6.";
        this.emitStateChange();
        return;
      }
      newPos = 0;
    } else {
      if (currentPos + roll > this.TRACK_LENGTH - 1) {
        this.currentBoardStatus = "Move would go beyond final square. Invalid.";
        this.emitStateChange();
        return;
      }
      newPos = currentPos + roll;
    }

    // Move the token
    this.tokenPositions[this.currentPiece][tokenIndex] = newPos;

    // Check collisions/captures (unless final)
    let captures = 0;
    if (newPos !== 56 && !this.safeZones.includes(newPos)) {
      captures = this.handleCollisions(newPos, this.currentPiece);
    }

    // Check if this token just finished
    if (newPos === 56) {
      const allDone = this.tokenPositions[this.currentPiece].every(
        (p) => p === 56
      );
      if (allDone && !this.ranking.includes(this.currentPiece)) {
        this.ranking.push(this.currentPiece);
      }
    }

    this.resetTurnState(false);

    // If you captured or rolled a 6, same player's turn
    if (captures > 0) {
      this.currentBoardStatus = `${this.currentPiece} captured ${captures} token(s). Roll again!`;
      this.gameState = "playerHasToRollADice";
      this.emitStateChange();
      return;
    }
    if (roll === 6) {
      this.currentBoardStatus = `${this.currentPiece} rolled a 6. Roll again!`;
      this.gameState = "playerHasToRollADice";
      this.emitStateChange();
      return;
    }

    // Otherwise go to next turn
    this.nextTurn();
    this.emitStateChange();
  }

  /**
   * Return valid token indices for a given dice roll.
   */
  private getValidMoves(color: Color, roll: number): number[] {
    const positions = this.tokenPositions[color];
    const valid: number[] = [];
    for (let i = 0; i < 4; i++) {
      const pos = positions[i];
      // If already at final, skip
      if (pos === 56) continue;
      // If at home
      if (pos === -1) {
        if (roll === 6) valid.push(i);
      } else {
        if (pos + roll <= 56) valid.push(i);
      }
    }
    return valid;
  }

  /**
   * Check if any opponent is on newPos. If so, capture them (send home).
   * Returns number of captures.
   */
  private handleCollisions(newPos: number, movingColor: Color): number {
    let captures = 0;
    const [destR, destC] = this.colorPaths[movingColor][newPos];

    for (const color of this.players) {
      if (color === movingColor) continue;
      for (let i = 0; i < 4; i++) {
        const oppPos = this.tokenPositions[color][i];
        if (oppPos < 0 || oppPos === 56) continue; // home or finished
        const [r2, c2] = this.colorPaths[color][oppPos];
        if (r2 === destR && c2 === destC) {
          this.tokenPositions[color][i] = -1; // send home
          captures++;
        }
      }
    }
    return captures;
  }

  /**
   * Proceed to the next player's turn, or end the game if all finished.
   */
  private nextTurn() {
    if (this.ranking.length >= this.players.length) {
      this.gameState = "gameFinished";
      this.currentBoardStatus = "Game Over! All players finished.";
      return;
    }
    const idx = this.players.indexOf(this.currentPiece);
    this.currentPiece = this.players[(idx + 1) % this.players.length];
    this.currentConsecutiveSixes = 0;
    this.gameState = "playerHasToRollADice";
    this.currentBoardStatus = `Now it's ${this.currentPiece}'s turn to roll.`;
  }

  /**
   * Reset the current dice roll & valid token indices. Optionally clear lastDiceRoll.
   */
  private resetTurnState(clearLastDiceRoll = true) {
    this.currentDiceRoll = null;
    this.validTokenIndices = [];
    if (clearLastDiceRoll) {
      this.lastDiceRoll = null;
    }
  }

  /**
   * Returns a snapshot of the current state, used by emitStateChange() or for UI.
   */
  getCurrentState(): LudoGameState {
    return {
      turn: this.currentPiece,
      tokenPositions: this.tokenPositions,
      ranking: this.ranking,
      boardStatus: this.currentBoardStatus,
      diceRoll: this.currentDiceRoll,
      lastDiceRoll: this.lastDiceRoll,
      gameState: this.gameState,
      players: this.players,
    };
  }

  /**
   * A basic AI heuristic for picking the best token to move given currentDiceRoll.
   * Returns -1 if no moves.
   */
  bestMove(): number {
    if (this.currentDiceRoll === null) {
      console.warn("bestMove called but no dice roll available");
      return -1;
    }
    const roll = this.currentDiceRoll;
    const valid = this.getValidMoves(this.currentPiece, roll);
    if (valid.length === 0) return -1;

    // Some scoring weights
    const WEIGHTS = {
      CAPTURE_BONUS: 50,
      LEAVE_HOME_BONUS: 35,
      LAND_SAFE_ZONE_BONUS: 25,
      APPROACH_FINAL_BONUS: 15,
      REACH_FINAL_BONUS: 100,
      DISTANCE_ADVANCE_FACTOR: 0.5,
      RISK_PENALTY_NEAR_OPPONENT: 40,
    };

    let bestScore = Number.NEGATIVE_INFINITY;
    let bestIndex = valid[0];

    for (const i of valid) {
      const currentPos = this.tokenPositions[this.currentPiece][i];
      const newPos = currentPos === -1 ? 0 : currentPos + roll;
      let score = 0;

      // Bonus for leaving home
      if (currentPos === -1 && roll === 6) {
        score += WEIGHTS.LEAVE_HOME_BONUS;
      }
      // Safe zone landing
      if (this.safeZones.includes(newPos)) {
        score += WEIGHTS.LAND_SAFE_ZONE_BONUS;
      }
      // Potential captures
      if (newPos !== 56 && !this.safeZones.includes(newPos)) {
        const [destR, destC] = this.colorPaths[this.currentPiece][newPos];
        let captures = 0;
        for (const oppColor of this.players) {
          if (oppColor === this.currentPiece) continue;
          for (let oppI = 0; oppI < 4; oppI++) {
            const oppPos = this.tokenPositions[oppColor][oppI];
            if (oppPos < 0 || oppPos === 56) continue;
            const [r2, c2] = this.colorPaths[oppColor][oppPos];
            if (r2 === destR && c2 === destC) captures++;
          }
        }
        if (captures > 0) {
          score += captures * WEIGHTS.CAPTURE_BONUS;
        }
      }
      // Approaching final or finishing
      if (newPos >= 51 && newPos < 56) {
        score += WEIGHTS.APPROACH_FINAL_BONUS;
      }
      if (newPos === 56) {
        score += WEIGHTS.REACH_FINAL_BONUS;
      }
      // Distance factor
      score += newPos * WEIGHTS.DISTANCE_ADVANCE_FACTOR;

      // Risk penalty
      if (newPos < 56) {
        const [myR, myC] = this.colorPaths[this.currentPiece][newPos];
        let riskyOpponents = 0;
        for (const oppColor of this.players) {
          if (oppColor === this.currentPiece) continue;
          for (let oppI = 0; oppI < 4; oppI++) {
            const oppPos = this.tokenPositions[oppColor][oppI];
            if (oppPos < 0 || oppPos === 56) continue;
            for (let diceCheck = 1; diceCheck <= 6; diceCheck++) {
              const testPos = oppPos + diceCheck;
              if (testPos <= 56) {
                const [r2, c2] = this.colorPaths[oppColor][testPos];
                if (r2 === myR && c2 === myC) {
                  riskyOpponents++;
                  break;
                }
              }
            }
          }
        }
        if (riskyOpponents > 0) {
          score -= riskyOpponents * WEIGHTS.RISK_PENALTY_NEAR_OPPONENT;
        }
      }

      // Pick the best
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }
}
