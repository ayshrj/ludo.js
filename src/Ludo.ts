import { Color, Block, TokenPositions, GameState } from "./types";

/**
 * Generate a random integer between min and max, inclusive.
 * @param min - The lower bound (inclusive).
 * @param max - The upper bound (inclusive).
 * @returns A random integer between min and max.
 */
function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * The Ludo game class.
 *
 * Handles:
 * - Board setup (15x15)
 * - Tracking token positions
 * - Dice rolling & skipping after 3 consecutive sixes
 * - Capturing enemy tokens
 * - Ranking & finishing conditions
 * - AI helper (bestMove)
 */
export class Ludo {
  /** The 15x15 board, with `Block` or `null` if not used. */
  board!: (Block | null)[][];

  /** The positions of all tokens for each color. */
  tokenPositions!: TokenPositions;

  /** The color currently taking their turn. */
  currentPiece!: Color;

  /** The list of colors in the order they have completely finished (all tokens at final). */
  ranking: Color[] = [];

  /** The current dice roll value, or null if not rolled yet. */
  currentDiceRoll: number | null = null;

  /** The previous dice roll value (for reference in UI, etc.). */
  lastDiceRoll: number | null = null;

  /** Token indices (0..3) that are valid to move with the current dice roll. */
  validTokenIndices: number[] = [];

  /** Number of consecutive sixes rolled by the current player. */
  currentConsecutiveSixes = 0;

  /** Total length of the track, from index 0 to 56. */
  readonly TRACK_LENGTH = 57;

  /** The indices that are safe zones (cannot capture). */
  readonly safeZones: number[] = [0, 8, 13, 21, 26, 34, 39, 47];

  /** A status message about the current board state. */
  currentBoardStatus = "";

  /** Current game state (waiting to roll, waiting to select a token, or finished). */
  gameState: GameState = "playerHasToRollADice";

  /**
   * The color-specific path coordinates: { red: [ [row,col], ...], green: [...], ... }.
   */
  colorPaths!: Record<Color, [number, number][]>;

  /**
   * The active player colors in this game.
   * For instance, with 2 players, it might be ["blue", "green"].
   */
  players: Color[] = [];

  /**
   * Construct a Ludo game for 2, 3, or 4 players.
   * @param numberOfPlayers - How many players are playing (2..4).
   */
  constructor(private numberOfPlayers: 2 | 3 | 4 = 4) {
    // Decide which colors to use
    if (numberOfPlayers === 2) {
      this.players = ["blue", "green"];
    } else if (numberOfPlayers === 3) {
      this.players = ["blue", "red", "green"];
    } else {
      this.players = ["blue", "red", "green", "yellow"];
    }

    // Init everything
    this.reset();
  }

  /**
   * Resets the entire board state, token positions,
   * and randomly selects which color starts.
   */
  reset() {
    // Build an empty 15x15 board
    this.board = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => null)
    );

    // Initialize all token positions to -1 (home)
    this.tokenPositions = {
      red: [-1, -1, -1, -1],
      green: [-1, -1, -1, -1],
      yellow: [-1, -1, -1, -1],
      blue: [-1, -1, -1, -1],
    };

    // Clear ranking, dice, and other fields
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

    // Mark home squares for each active color
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

    for (const color of this.players) {
      for (const [r, c] of homePositions[color]) {
        this.board[r][c] = { isHome: color };
      }
    }

    // Build base path for "red"
    const redPath: [number, number][] = [];
    // The path logic:
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

    // Create color paths by rotating the red path
    const paths: Record<Color, [number, number][]> = {
      red: redPath,
      green: redPath.map((coord) => this.rotateCoord(coord, 90)),
      yellow: redPath.map((coord) => this.rotateCoord(coord, 180)),
      blue: redPath.map((coord) => this.rotateCoord(coord, 270)),
    };

    this.colorPaths = paths;

    // Mark track indices on the board for active colors
    for (const color of this.players) {
      const colorPath = paths[color];
      colorPath.forEach(([r, c], index) => {
        if (!this.board[r][c]) this.board[r][c] = {};

        // Mark the track index
        if (color === "red") this.board[r][c]!.redTrack = index;
        if (color === "green") this.board[r][c]!.greenTrack = index;
        if (color === "blue") this.board[r][c]!.blueTrack = index;
        if (color === "yellow") this.board[r][c]!.yellowTrack = index;

        // Safe zone
        if (this.safeZones.includes(index)) {
          this.board[r][c]!.isSafeZone = true;
        }
        // Starting position => index=0
        if (index === 0) {
          this.board[r][c]!.isStartingPosition = color;
          this.board[r][c]!.isSafeZone = true;
        }
        // On path to final => indices 51..55
        if (index >= 51 && index <= 55) {
          this.board[r][c]!.isOnPathToFinalPosition = color;
        }
        // Final => index=56
        if (index === 56) {
          this.board[r][c]!.isFinalPosition = color;
        }
      });
    }
  }

  /**
   * Rotate a coordinate (r, c) 90/180/270 degrees about (7,7).
   * @param coord - [row, col].
   * @param angle - The angle of rotation (90, 180, or 270).
   * @returns The new [row, col] after rotation.
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
   * Roll the dice for the current player, if the game state allows it.
   *
   * @returns The dice roll value (1..6) or -1 if invalid to roll now.
   */
  rollDiceForCurrentPiece(): number {
    if (this.gameState !== "playerHasToRollADice") {
      this.currentBoardStatus = `Invalid action. Current state: ${this.gameState}.`;
      return -1;
    }

    // If there's already a pending roll, do nothing
    if (this.currentDiceRoll !== null) {
      this.currentBoardStatus =
        "Already rolled. You must select a token or pass.";
      return this.currentDiceRoll;
    }

    const rollValue = random(1, 6);
    this.currentDiceRoll = rollValue;
    this.lastDiceRoll = rollValue;

    // Handle consecutive sixes
    if (rollValue === 6) {
      this.currentConsecutiveSixes++;
      if (this.currentConsecutiveSixes === 3) {
        // skip turn
        this.currentBoardStatus = `Three consecutive sixes! Turn skipped for ${this.currentPiece}.`;
        this.resetTurnState(false);
        this.nextTurn();
        return rollValue;
      }
    } else {
      this.currentConsecutiveSixes = 0;
    }

    // Identify valid moves
    this.validTokenIndices = this.getValidMoves(this.currentPiece, rollValue);
    if (this.validTokenIndices.length === 0) {
      this.currentBoardStatus = `No valid moves for ${this.currentPiece} (rolled ${rollValue}). Passing turn.`;
      this.resetTurnState(false);
      this.nextTurn();
    } else {
      this.gameState = "playerHasToSelectAPosition";
    }

    return rollValue;
  }

  /**
   * The user (or AI) selects which token to move, given the current dice roll.
   *
   * @param tokenIndex - The index of the token (0..3).
   */
  selectToken(tokenIndex: number): void {
    if (this.gameState !== "playerHasToSelectAPosition") {
      this.currentBoardStatus = `Invalid action. State: ${this.gameState}`;
      return;
    }
    if (this.currentDiceRoll === null) {
      this.currentBoardStatus = "You must roll before selecting a token.";
      return;
    }
    if (!this.validTokenIndices.includes(tokenIndex)) {
      this.currentBoardStatus = "That token isn't a valid choice this turn.";
      return;
    }

    const roll = this.currentDiceRoll;
    const currentPos = this.tokenPositions[this.currentPiece][tokenIndex];

    let newPos: number;
    // If token is at home, you need a 6 to leave
    if (currentPos === -1) {
      if (roll !== 6) {
        this.currentBoardStatus = "Can't leave home without rolling a 6.";
        return;
      }
      newPos = 0;
    } else {
      // Ensure we don't go past the final square
      if (currentPos + roll > this.TRACK_LENGTH - 1) {
        this.currentBoardStatus = "Move would exceed final square. Can't move.";
        return;
      }
      newPos = currentPos + roll;
    }

    // Perform move
    this.tokenPositions[this.currentPiece][tokenIndex] = newPos;

    // Handle captures
    let captures = 0;
    if (newPos !== 56 && !this.safeZones.includes(newPos)) {
      captures = this.handleCollisions(newPos, this.currentPiece);
    }

    // Check if token just finished
    if (newPos === 56) {
      const allDone = this.tokenPositions[this.currentPiece].every(
        (pos) => pos === 56
      );
      if (allDone && !this.ranking.includes(this.currentPiece)) {
        this.ranking.push(this.currentPiece);
      }
    }

    // Reset dice and valid moves
    this.resetTurnState(false);

    // If captured or rolled a 6, same player's turn
    if (captures > 0) {
      this.currentBoardStatus = `${this.currentPiece} captured ${captures} token(s). Roll again!`;
      this.gameState = "playerHasToRollADice";
      return;
    }
    if (roll === 6) {
      this.currentBoardStatus = `${this.currentPiece} rolled a 6. Roll again!`;
      this.gameState = "playerHasToRollADice";
      return;
    }

    // Otherwise move to next player
    this.nextTurn();
  }

  /**
   * Returns an array of token indices that can be moved given the roll value.
   * @param color - Which color's tokens to check.
   * @param roll - The dice roll value (1..6).
   */
  private getValidMoves(color: Color, roll: number): number[] {
    const positions = this.tokenPositions[color];
    const valid: number[] = [];

    for (let i = 0; i < 4; i++) {
      const pos = positions[i];
      // If already finished, skip
      if (pos === 56) continue;
      // If at home
      if (pos === -1) {
        if (roll === 6) {
          valid.push(i);
        }
      } else {
        // On the track (don't go beyond 56)
        if (pos + roll <= 56) {
          valid.push(i);
        }
      }
    }
    return valid;
  }

  /**
   * When a token moves to newPos, check if any opponent token is on that square and capture it (send it home).
   * @param newPos - The track index the current token just moved to.
   * @param movingColor - Which color made the move.
   * @returns The number of captured tokens.
   */
  private handleCollisions(newPos: number, movingColor: Color): number {
    let captures = 0;
    const [destR, destC] = this.colorPaths[movingColor][newPos];

    for (const color of this.players) {
      if (color === movingColor) continue; // don't capture your own
      for (let i = 0; i < 4; i++) {
        const oppPos = this.tokenPositions[color][i];
        if (oppPos < 0 || oppPos === 56) continue; // home or finished
        const [r2, c2] = this.colorPaths[color][oppPos];
        if (r2 === destR && c2 === destC) {
          // capture!
          this.tokenPositions[color][i] = -1;
          captures++;
        }
      }
    }

    return captures;
  }

  /**
   * Moves on to the next player's turn, unless the game is finished.
   */
  private nextTurn() {
    // If all colors are ranked, game ends
    if (this.ranking.length >= this.players.length) {
      this.gameState = "gameFinished";
      this.currentBoardStatus = "Game Over! All players have finished.";
      return;
    }

    // Advance to next color in the rotation
    const idx = this.players.indexOf(this.currentPiece);
    this.currentPiece = this.players[(idx + 1) % this.players.length];
    this.currentConsecutiveSixes = 0;
    this.gameState = "playerHasToRollADice";
    this.currentBoardStatus = `Now it's ${this.currentPiece}'s turn to roll.`;
  }

  /**
   * Resets current dice roll and valid moves.
   * @param clearLastDiceRoll - Whether to also clear the lastDiceRoll.
   */
  private resetTurnState(clearLastDiceRoll = true) {
    this.currentDiceRoll = null;
    this.validTokenIndices = [];
    if (clearLastDiceRoll) {
      this.lastDiceRoll = null;
    }
  }

  /**
   * Get the current overall state, useful for UI and debugging.
   */
  getCurrentState() {
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
   * Provides a basic AI "best move" by evaluating potential captures, safety, and approaching final.
   *
   * @returns The token index that has the best outcome, or -1 if no valid moves.
   */
  bestMove(): number {
    if (this.currentDiceRoll === null) {
      console.warn("bestMove called but no dice roll available");
      return -1;
    }

    const roll = this.currentDiceRoll;
    const valid = this.getValidMoves(this.currentPiece, roll);
    if (valid.length === 0) return -1;

    // Arbitrary weighting
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

      // Safe zone bonus
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

      // Approaching final or final
      if (newPos >= 51 && newPos < 56) {
        score += WEIGHTS.APPROACH_FINAL_BONUS;
      }
      if (newPos === 56) {
        score += WEIGHTS.REACH_FINAL_BONUS;
      }

      // Distance factor
      score += newPos * WEIGHTS.DISTANCE_ADVANCE_FACTOR;

      // Risk penalty if opponents could capture
      if (newPos < 56) {
        const [myR, myC] = this.colorPaths[this.currentPiece][newPos];
        let riskyOpponents = 0;
        for (const oppColor of this.players) {
          if (oppColor === this.currentPiece) continue;
          for (let oppI = 0; oppI < 4; oppI++) {
            const oppPos = this.tokenPositions[oppColor][oppI];
            if (oppPos < 0 || oppPos === 56) continue;
            // If opponent can land here with a 1..6 roll
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

      // Pick the best move
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }
}
