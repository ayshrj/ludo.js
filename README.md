# @ayshrj/ludo.js

**@ayshrj/ludo.js** is a TypeScript library that simulates the classic **Ludo** board game.
Features:
- **Game Setup** with 2, 3, or 4 players
- **Dice Rolling** with automatic skip after three sixes
- **Moving Tokens** including leaving home on a roll of 6
- **Capturing Opponents** if they share the same spot (unless safe zone)
- **Safe Zones** and special squares
- **Automatic Ranking** once tokens reach their final positions
- **`bestMove()`** method for a basic AI to choose the "best" token to move
- And more!

## Installation

```bash
npm install @ayshrj/ludo.js
```

## Usage Example

**Basic Example** in TypeScript/JavaScript:
```ts
import { Ludo } from "@ayshrj/ludo.js";

const game = new Ludo(4); // 4 players: red, green, blue, yellow

// Roll dice for the current player
game.rollDiceForCurrentPiece();

// If needed, pick which token to move (0..3):
game.selectToken(0);

// If you want an AI suggestion on which token index to move:
const suggestedToken = game.bestMove();
if (suggestedToken >= 0) {
  game.selectToken(suggestedToken);
}

// Get current game state
const currentState = game.getCurrentState();
console.log(currentState.boardStatus);
```

## Features

1. **Initialization**  
   ```ts
   const ludo = new Ludo(3); 
   // Creates a Ludo game with 3 players. The colors used are ["blue","red","green"] by default.
   ```
2. **Dice Rolling**  
   ```ts
   ludo.rollDiceForCurrentPiece(); // returns a random number 1..6
   ```
   - If three 6's are rolled in a row, the turn is skipped automatically.
3. **Selecting a Token**  
   ```ts
   ludo.selectToken(2); // moves the current player's token #2 if valid
   ```
4. **Captures**  
   - If you land on a space containing opponent tokens (and not a safe zone), those tokens get sent back home (`-1`).
5. **Ranking**  
   - As tokens reach index 56 (final square), the ranking is updated. Once all 4 tokens of a color finish, that color is assigned a rank.
6. **Game State**  
   - `getCurrentState()` returns key state information, such as whose turn it is, the dice roll, each token’s position, etc.
7. **bestMove()**  
   - A built-in AI heuristic that returns the best token index to move, or `-1` if none can move.
8. **Reset**  
   ```ts
   ludo.reset(); // Clears the board, randomizes which color starts
   ```

## Example: React

Below is a simple example of how you might integrate **@ayshrj/ludo.js** into a React or Next.js project. This UI lets you roll dice, choose tokens, view current state, and reset the game.

```tsx
"use client";

import React, { useState } from "react";
import { Ludo } from "@ayshrj/ludo.js";

export default function LudoTestPage() {
  // Instantiate once
  const [ludo] = useState(() => new Ludo(4));

  // Force a re-render
  const [, setRenderCount] = useState(0);
  function forceUpdate() {
    setRenderCount(n => n + 1);
  }

  const currentState = ludo.getCurrentState();
  const { turn, tokenPositions, ranking, diceRoll, lastDiceRoll, boardStatus } = currentState;

  function handleRoll() {
    ludo.rollDiceForCurrentPiece();
    forceUpdate();
  }

  function handleSelectToken(tokenIndex: number) {
    ludo.selectToken(tokenIndex);
    forceUpdate();
  }

  function handleReset() {
    ludo.reset();
    forceUpdate();
  }

  function handleBestMove() {
    const best = ludo.bestMove();
    if (best >= 0) {
      ludo.selectToken(best);
      forceUpdate();
    }
  }

  const isGameOver = ranking.length === ludo.players.length;

  return (
    <div style={{ padding: 16 }}>
      <h1>Ludo Example</h1>
      <div style={{ marginBottom: 8 }}>
        {isGameOver ? (
          <div>
            <strong>Game Finished!</strong> Final Ranking: {ranking.join(" -> ")}
          </div>
        ) : (
          <div>
            <strong>{turn.toUpperCase()}</strong>'s Turn{" "}
            {lastDiceRoll !== null && <> (Last roll: {lastDiceRoll})</>}
            {boardStatus && <> — {boardStatus}</>}
          </div>
        )}
      </div>

      {!isGameOver && (
        <>
          <button onClick={handleRoll} disabled={diceRoll !== null}>
            Roll Dice
          </button>
          <button onClick={handleBestMove} disabled={diceRoll === null}>
            Use Best Move
          </button>
        </>
      )}
      <button onClick={handleReset} style={{ marginLeft: 8 }}>
        Reset
      </button>

      <div style={{ marginTop: 16 }}>
        <h2>Token Positions</h2>
        {(["red", "green", "yellow", "blue"] as const).map(color => (
          <div key={color} style={{ marginBottom: 8 }}>
            <strong>{color.toUpperCase()}: </strong>
            {tokenPositions[color].map((pos, idx) => {
              // Check if this token can be moved now
              const canMove = color === turn && ludo.validTokenIndices.includes(idx);
              return (
                <button
                  key={`${color}-${idx}`}
                  onClick={() => handleSelectToken(idx)}
                  disabled={!canMove || isGameOver}
                  style={{
                    marginRight: 4,
                    padding: "4px 8px",
                    backgroundColor: canMove ? "lightgreen" : "lightgray",
                  }}
                >
                  Token #{idx} (pos: {pos})
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <pre>{JSON.stringify(currentState, null, 2)}</pre>
      </div>
    </div>
  );
}
```

---