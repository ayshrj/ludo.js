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
- **EventEmitter-based Updates** (automatically emit `"stateChange"` with the latest state)
- **Comprehensive State Tracking** for easy integration into any UI

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
    - [Event Emitter: `"stateChange"`](#event-emitter-statechange)
    - [`.players`](#players)
    - [`initializeTokenPosition()`](#initializetokenposition)
  - [Example: React Integration](#example-react-integration)
  - [Advanced Usage Notes](#advanced-usage-notes)
  - [License](#license)

---

## Installation

```bash
npm install @ayshrj/ludo.js
```
or
```bash
yarn add @ayshrj/ludo.js
```

---

## Importing

### Import (as ESM)

```js
import { Ludo } from '@ayshrj/ludo.js'
```

### Import (as CommonJS)

```js
const { Ludo } = require('@ayshrj/ludo.js')
```

---

## Quick Start Example

```ts
import { Ludo } from '@ayshrj/ludo.js'

// Create a Ludo game with 4 players
const game = new Ludo(4)

// Subscribe to state changes (optional)
game.on("stateChange", (state) => {
  console.log("STATE CHANGE:", state)
})

// Roll the dice
const diceValue = game.rollDiceForCurrentPiece()
console.log(`Dice: ${diceValue}`)

// If there's a valid token, select it
if (game.validTokenIndices.length > 0) {
  game.selectToken(game.validTokenIndices[0])
}

// Or use the basic AI
const best = game.bestMove()
if (best >= 0) game.selectToken(best)
```

---

## Features

1. **2, 3, or 4 Players**  
   Colors are chosen from `["blue","red","green","yellow"]` based on the
   requested number of players.

2. **Dice Rolling**  
   Rolls `1..6`. Three consecutive sixes skip your turn.

3. **Movement & Safe Zones**  
   Leave home only on a 6. Safe squares cannot be captured.

4. **Capturing**  
   If you land on an opponent in a non-safe zone, that opponent’s token goes
   home (`-1`).

5. **Final & Ranking**  
   Index `56` is the final square; finishing all 4 tokens places you in `ranking`.

6. **Simple AI**  
   `bestMove()` returns a recommended token index.

7. **Event Emitter**  
   The `Ludo` class extends Node.js’s `EventEmitter`. Each time the internal
   state changes (after rolls, moves, etc.), it emits `"stateChange"` with the
   updated `LudoGameState`.

---

## API

### Constructor: `new Ludo(numberOfPlayers)`

```ts
// 2 players => uses ["blue","green"]
// 3 players => uses ["blue","red","green"]
// 4 players => uses ["blue","red","green","yellow"]
const game = new Ludo(4)
```

---

### `.rollDiceForCurrentPiece()`
Rolls a 6-sided die and updates `currentDiceRoll`, `lastDiceRoll`, and
`validTokenIndices`. Automatically skips turn on three consecutive sixes or if
there are no valid moves.

---

### `.selectToken(tokenIndex)`
Moves the chosen token for the current color using the last dice roll. Handles
captures, final squares, turn passing, etc.

---

### `.bestMove()`
A basic heuristic that returns the “best” token index or -1 if none.

---

### `.reset()`
Completely reinitializes the board and picks a new starting player randomly.

---

### `.getCurrentState()`
Returns a snapshot of the entire state:

```ts
interface LudoGameState {
  turn: Color;
  tokenPositions: TokenPositions;
  ranking: Color[];
  boardStatus: string;
  diceRoll: number | null;
  lastDiceRoll: number | null;
  gameState: GameState;
  players: Color[];
}
```

---

### `.tokenPositions`
A record of each color’s four token positions (`-1` for home, `0..56` on track).

---

### `.validTokenIndices`
Which tokens (0..3) the current color can move on their turn.  
Updated when `.rollDiceForCurrentPiece()` is called.

---

### `.ranking`
Colors finish in order. If `ranking.length` equals number of players, the game is
complete.

---

### `.gameState`
One of:
- `"playerHasToRollADice"`
- `"playerHasToSelectAPosition"`
- `"gameFinished"`

---

### `.currentPiece`
Which color’s turn it is right now.

---

### Event Emitter: `"stateChange"`
Every time the game state changes (e.g., after a roll or move), the library
calls: 
```ts
this.emit("stateChange", this.getCurrentState())
```
So you can do:
```ts
game.on("stateChange", (state) => {
  // React or update UI automatically with the new state
})
```

---

### `.players`
The array of active colors, in turn order. For example, with 3 players it might
be `["blue","red","green"]`.

---

### `initializeTokenPosition()`
A utility function that initializes the token positions for all colors. Each token starts at `-1` (home).

```ts
/**
 * Initializes the token positions for all colors.
 * @returns {TokenPositions} An object with token positions for each color.
 * @example
 * const tokenPositions = initializeTokenPosition();
 * // Returns:
 * // {
 * //   red: [-1, -1, -1, -1],
 * //   green: [-1, -1, -1, -1],
 * //   yellow: [-1, -1, -1, -1],
 * //   blue: [-1, -1, -1, -1]
 * // }
 */
function initializeTokenPosition(): TokenPositions;
```

---

## Example: React Integration

```tsx
import React, { useEffect, useState } from "react"
import { Ludo } from "@ayshrj/ludo.js"

export default function LudoExample() {
  const [game] = useState(() => new Ludo(4))
  const [state, setState] = useState(game.getCurrentState())

  useEffect(() => {
    function handleStateChange(newState) {
      setState(newState)
    }
    game.on("stateChange", handleStateChange)
    return () => {
      game.off("stateChange", handleStateChange)
    }
  }, [game])

  // Now `state` updates automatically when the library emits "stateChange"
  const { turn, validTokenIndices, diceRoll, ranking, boardStatus } = state
  const isFinished = state.gameState === "gameFinished"

  return (
    <div>
      <p>Current Turn: {turn}</p>
      <p>Dice: {diceRoll ?? "None"} | {boardStatus}</p>
      <p>Ranking: {ranking.join(", ")}</p>

      {!isFinished && (
        <>
          <button onClick={() => game.rollDiceForCurrentPiece()}>
            Roll Dice
          </button>
          <button onClick={() => {
            const best = game.bestMove();
            if (best >= 0) game.selectToken(best);
          }}>
            Best Move
          </button>
        </>
      )}

      <button onClick={() => game.reset()}>Reset</button>

      {/* token positions, etc. */}
    </div>
  )
}
```

---

## Advanced Usage Notes

1. **Skipping / Passing**  
   If `.rollDiceForCurrentPiece()` yields no valid moves, it auto-passes to the
   next player.
2. **Consecutive Sixes**  
   Rolling three in a row ends your turn immediately.
3. **Event-Driven Updates**  
   Subscribing to `"stateChange"` means you can react to changes
   without manually querying the state after every call.

---

## License

MIT License. Feel free to modify or contribute!

---