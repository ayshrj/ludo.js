# @ayshrj/ludo.js

[![npm](https://img.shields.io/npm/v/@ayshrj/ludo.js?color=blue)](https://www.npmjs.com/package/@ayshrj/ludo.js)
[![npm](https://img.shields.io/npm/dm/@ayshrj/ludo.js)](https://www.npmjs.com/package/@ayshrj/ludo.js)

**@ayshrj/ludo.js** is a TypeScript library for simulating the classic Ludo board
game. It handles:

- **Board Setup** (2, 3, or 4 players)
- **Dice Rolling** (automatic skip after three consecutive sixes)
- **Token Movement** (including leaving home on a 6)
- **Capturing Opponents** on non-safe squares
- **Safe Zones & Final Squares**
- **Ranking** (tracks order in which players finish)
- **Lightweight AI** with `bestMove()`
- **Comprehensive State Tracking** for easy integration into any UI

\@ayshrj/ludo.js is inspired by the approach of [chess.js](https://github.com/jhlywa/chess.js).
It provides a “headless” Ludo engine—no UI or rendering, just game logic.

---

## Table of Contents

- [@ayshrj/ludo.js](#ayshrjludojs)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Importing](#importing)
    - [Import (as ESM)](#import-as-esm)
    - [Import (as CommonJS)](#import-as-commonjs)
  - [Quick Start Example](#quick-start-example)
  - [Features](#features)
  - [API](#api)
    - [Constructor: `new Ludo(numberOfPlayers)`](#constructor-new-ludonumberofplayers)
    - [`.rollDiceForCurrentPiece()`](#rolldiceforcurrentpiece)
    - [`.selectToken(tokenIndex)`](#selecttokentokenindex)
    - [`.bestMove()`](#bestmove)
    - [`.reset()`](#reset)
    - [`.getCurrentState()`](#getcurrentstate)
    - [`.tokenPositions`](#tokenpositions)
    - [`.validTokenIndices`](#validtokenindices)
    - [`.ranking`](#ranking)
    - [`.gameState`](#gamestate)
    - [`.currentPiece`](#currentpiece)
    - [`.handleCollisions(newPos, movingColor)`](#handlecollisionsnewpos-movingcolor)
    - [`.players`](#players)
  - [Example: React Integration](#example-react-integration)
  - [Advanced Usage Notes](#advanced-usage-notes)
  - [License](#license)

---

## Installation

Install via [npm](https://www.npmjs.com/package/@ayshrj/ludo.js):

```bash
npm install @ayshrj/ludo.js
```

Or via [yarn](https://yarnpkg.com/):

```bash
yarn add @ayshrj/ludo.js
```

---

## Importing

### Import (as ESM)

```js
import { Ludo } from '@ayshrj/ludo.js'
```

ECMAScript modules can also be imported directly in a browser (if your bundler
supports ESM or you use a `<script type="module">`):

```html
<script type="module">
  import { Ludo } from 'https://cdn.skypack.dev/@ayshrj/ludo.js'
  // ...
</script>
```

### Import (as CommonJS)

```js
const { Ludo } = require('@ayshrj/ludo.js')
```

---

## Quick Start Example

The code below shows a **very** simple usage example: create a 4-player Ludo game
and perform a couple of moves manually.

```ts
import { Ludo } from '@ayshrj/ludo.js'

// Create a Ludo game with 4 players (blue, red, green, yellow)
const game = new Ludo(4)

// Roll the dice for the current player
const dice = game.rollDiceForCurrentPiece()
console.log(`Rolled: ${dice}`)

// If there's a valid token to move, select the first valid one
if (game.validTokenIndices.length > 0) {
  const tokenToMove = game.validTokenIndices[0]
  game.selectToken(tokenToMove)
  console.log(`Moved token index #${tokenToMove}`)
}

// Or use a simple built-in AI suggestion:
const best = game.bestMove()
if (best >= 0) {
  game.selectToken(best)
}

// Inspect current state
const state = game.getCurrentState()
console.log(state.boardStatus) // e.g. "No valid moves for blue..."
```

---

## Features

1. **Initialization & Player Count**  
   Supports **2, 3, or 4 players**. The colors used internally are always among
   `blue`, `red`, `green`, `yellow`, but the exact set depends on how many
   players:

   - **2 players**: `["blue", "green"]`
   - **3 players**: `["blue", "red", "green"]`
   - **4 players**: `["blue", "red", "green", "yellow"]`

2. **Dice Rolling & Consecutive Sixes**  
   Rolls return a random integer (1..6). After **3 consecutive sixes**, the
   current player's turn is **skipped** automatically.

3. **Movement & Leaving Home**  
   - Tokens are stored in an integer index from **-1** (home) through **56** (final):
     - **-1** means the token is still at home and can only move out on a roll
       of **6**.
     - **0..56** represent the track positions on the board.
     - **56** is the final position (goal). Once a token is there, it no longer
       moves.

4. **Captures & Safe Zones**  
   - If you land on a square that has opponent tokens, those tokens get sent
     back to **-1** (home)—unless the square is a **safe zone** (where capturing
     is not allowed).
   - Safe zones are designated indices on the track (like `0`, certain corners,
     and final approach squares).

5. **Ranking**  
   - Each color finishes once all 4 of its tokens reach the final index `56`.
   - The library keeps track of the order in which colors finish in
     `game.ranking`.

6. **AI Helper**  
   - `bestMove()` is a simple heuristic that tries to maximize captures,
     reaching safety, nearing final, etc. It returns the best token index or
     `-1` if no valid moves exist.

7. **Turn Progression**  
   - After a move, if a capture was made or the roll was a 6, the current player
     **rolls again**.
   - Otherwise, the turn passes to the next color in sequence.
   - If all players have finished (i.e. all colors are in `ranking`), the game
     ends and `gameState` becomes `"gameFinished"`.

---

## API

### Constructor: `new Ludo(numberOfPlayers)`

Creates a new Ludo instance with 2, 3, or 4 players:

```ts
const game2 = new Ludo(2) // => uses ["blue","green"]
const game3 = new Ludo(3) // => uses ["blue","red","green"]
const game4 = new Ludo(4) // => uses ["blue","red","green","yellow"]
```

Internally, this:

- Builds a 15×15 board representation (`board[][]`).
- Initializes all token positions to `-1` (home).
- Randomly selects which color plays first.
- Precomputes each color's path of length 57 (track indices 0..56).

---

### `.rollDiceForCurrentPiece()`

Rolls a 6-sided die for the **current** color/player. Returns the rolled number
(`1..6`). Also updates:

- `currentDiceRoll`
- `lastDiceRoll`
- `validTokenIndices` (tokens that can legally move)
- `currentConsecutiveSixes` (resets or increments)

If three consecutive sixes occur, the turn is **skipped** immediately and the
game moves to the next player.

**Important**:

- If no tokens can be moved with the roll, it automatically passes the turn to
  the next player.
- If you already rolled and have not yet moved, rolling again is disallowed.

Example:

```ts
const diceValue = game.rollDiceForCurrentPiece()
console.log(diceValue) // e.g. 4
if (game.validTokenIndices.length === 0) {
  console.log("No valid moves; turn was passed.")
}
```

Returns **-1** if rolling was invalid in the current `gameState` (e.g., you
already rolled this turn).

---

### `.selectToken(tokenIndex)`

Moves the chosen token (0..3) for the **current** player, using the
`currentDiceRoll`. This method automatically:

1. Updates the token's track index.
2. Checks for collisions (capturing).
3. Checks if the token just reached the final square.
4. Resets the dice (unless the player gets another roll).
5. Possibly passes turn to the next player (unless a capture was made or a 6 was
   rolled).

Throws an error or sets a status message if the move is illegal (e.g., the token
is already at final, or out of range).

Example:

```ts
game.rollDiceForCurrentPiece() // say it was a 6
game.selectToken(0)            // moves token #0 out of home to index=0
```

---

### `.bestMove()`

Provides a built-in, **basic** AI heuristic that returns the **best** token
index, or `-1` if no valid moves exist. The heuristic tries to:

- Prioritize capturing opponents.
- Prefer safe-zone landings.
- Avoid placing yourself in easy capture range.
- Move closer to final (especially if near the final stretch).
- If you can finish a token, that’s heavily weighted.

This is a purely internal heuristic—**not** a fully “intelligent” Ludo AI, but
it’s often a reasonable choice to decide moves automatically for a bot player.

Example:

```ts
const roll = game.rollDiceForCurrentPiece()
if (roll !== -1 && game.validTokenIndices.length > 0) {
  // Let the AI pick
  const tokenToMove = game.bestMove()
  if (tokenToMove >= 0) {
    game.selectToken(tokenToMove)
  }
}
```

---

### `.reset()`

Resets the entire game:

- Token positions back to `-1`.
- Board reinitialized (though the same 15×15 structure is reused).
- `ranking` cleared.
- Randomly selects a new first player.
- Resets dice-related fields (`currentDiceRoll`, etc.).

Use this to start fresh or replay the same number of players.

```ts
game.reset()
```

---

### `.getCurrentState()`

Returns a snapshot of the most relevant, user-facing game state, including:

```ts
interface CurrentState {
  turn: Color                // e.g. "blue"
  tokenPositions: TokenPositions
  ranking: Color[]           // e.g. ["red"] if red is already finished
  boardStatus: string        // messages about captures / skipping
  diceRoll: number | null    // current roll if any
  lastDiceRoll: number | null
  gameState: GameState       // "playerHasToRollADice", "playerHasToSelectAPosition", or "gameFinished"
  players: Color[]           // which colors are actively playing
}
```

Example:

```ts
const state = game.getCurrentState()
console.log(state.turn)               // "red"
console.log(state.boardStatus)        // "rolled 6; pick a token or skip"
console.log(state.ranking)            // []
console.log(state.gameState)          // "playerHasToSelectAPosition"
```

---

### `.tokenPositions`

A record of each color's token positions, e.g.:

```ts
game.tokenPositions = {
  red:    [ -1, -1, 56, 20 ],
  green:  [  0,  1, -1,  6 ],
  blue:   [ 10, 11, 12, 13 ],
  yellow: [ -1, -1, -1, -1 ],
}
```

- `-1` => still at home
- `0..55` => on the track
- `56` => final position

---

### `.validTokenIndices`

An array of token indices (for the current player) that can legally move **this
turn**. Typically updated immediately after `.rollDiceForCurrentPiece()`.

```ts
game.rollDiceForCurrentPiece() // e.g. rolled a 4
console.log(game.validTokenIndices) // e.g. [1, 2]
```

---

### `.ranking`

An array of colors in the order they finished. Once a color’s 4 tokens reach
`56`, that color is appended to `ranking`. If all colors finish, the game ends.

---

### `.gameState`

A string that indicates the current game state:

- **"playerHasToRollADice"**: The current player must roll the dice next.
- **"playerHasToSelectAPosition"**: The dice is rolled and the current player
  must choose a token to move.
- **"gameFinished"**: All players have finished, or the game can’t continue.

---

### `.currentPiece`

Indicates which color’s turn it is. Will be one of `["blue", "red", "green", "yellow"]`,
depending on how many are playing and the turn order.

---

### `.handleCollisions(newPos, movingColor)`

_Advanced / Internal Method_:

When a token lands on `newPos`, any opponent’s token also on that **same**
square (and not in a safe zone) is captured (sent to `-1`). Typically you won’t
call this directly—it’s invoked automatically by `.selectToken()`.

```ts
// returns how many tokens were captured
const capturedCount = game['handleCollisions'](10, 'red')
```

---

### `.players`

An array of the active colors in order. For example, with 3 players:
`["blue","red","green"]`. You can overwrite or reorder them if you need a
custom turn order, but typically you let the constructor handle that.

---

## Example: React Integration

Below is a **simplified** version of how you might integrate this library into a
React/Next.js project. It demonstrates user interaction (roll dice, pick token,
show status, reset game). It’s not a full UI—just an example:

```tsx
"use client";
import React, { useState } from "react";
import { Ludo } from "@ayshrj/ludo.js";

export default function LudoDemo() {
  // Create once
  const [game] = useState(() => new Ludo(4));

  // Force re-render
  const [, setRenderCount] = useState(0);
  const forceUpdate = () => setRenderCount((n) => n + 1);

  const { turn, ranking, diceRoll, lastDiceRoll, boardStatus, gameState } =
    game.getCurrentState();

  const isGameFinished = gameState === "gameFinished";

  function handleRoll() {
    // Only roll if allowed
    if (gameState === "playerHasToRollADice") {
      game.rollDiceForCurrentPiece();
      forceUpdate();
    }
  }

  function handleSelectToken(tokenIndex: number) {
    if (gameState === "playerHasToSelectAPosition") {
      game.selectToken(tokenIndex);
      forceUpdate();
    }
  }

  function handleReset() {
    game.reset();
    forceUpdate();
  }

  function handleBestMove() {
    const best = game.bestMove();
    if (best >= 0) {
      game.selectToken(best);
      forceUpdate();
    }
  }

  return (
    <div>
      <h1>Ludo Demo</h1>
      <div>
        {isGameFinished
          ? `Game Over! Ranking: ${ranking.join(" -> ")}`
          : `${turn.toUpperCase()}'s turn. Last Roll: ${lastDiceRoll || "None"}`}
        {boardStatus && <p>{boardStatus}</p>}
      </div>
      {!isGameFinished && (
        <>
          <button onClick={handleRoll}>Roll Dice</button>
          <button onClick={handleBestMove} disabled={diceRoll === null}>
            Best Move
          </button>
        </>
      )}
      <button onClick={handleReset}>Reset</button>

      {/* Example token selection UI */}
      <div style={{ marginTop: 16 }}>
        <h2>Tokens</h2>
        {["blue", "red", "green", "yellow"].map((color) => (
          <div key={color}>
            <strong>{color.toUpperCase()} tokens:</strong>{" "}
            {game.tokenPositions[color].map((pos, idx) => {
              const canMove =
                color === turn && game.validTokenIndices.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectToken(idx)}
                  disabled={!canMove || isGameFinished}
                  style={{ margin: "0 4px" }}
                >
                  #{idx} (pos: {pos})
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Advanced Usage Notes

1. **Skips & Passing**  
   If `rollDiceForCurrentPiece()` finds **no valid moves**, the turn automatically
   passes to the next player.  
2. **Three Consecutive Sixes**  
   If the current player rolls three sixes in a row, their turn ends immediately.
3. **Tracking UI**  
   It’s easiest to poll `.getCurrentState()` after every significant method call
   (dice roll, token select, etc.) to refresh your UI or trigger re-render.

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

Enjoy building your Ludo experience with **@ayshrj/ludo.js**! Please report any
issues or suggestions on [GitHub](https://github.com/). Pull requests are
welcome.

---