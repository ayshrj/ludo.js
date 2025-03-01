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
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Ludo,
  Color,
  LudoGameState,
  initializeTokenPosition,
} from "@ayshrj/ludo.js";

// Available color sets for 2/3/4 players:
const COLOR_SETS: Record<2 | 3 | 4, Color[]> = {
  2: ["blue", "green"],
  3: ["blue", "red", "green"],
  4: ["blue", "red", "green", "yellow"],
};

const LudoPage: React.FC = () => {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [playerTypes, setPlayerTypes] = useState<
    Record<Color, "human" | "bot">
  >({
    blue: "human",
    red: "human",
    green: "human",
    yellow: "human",
  });
  const [ludo, setLudo] = useState<Ludo | null>(null);
  const [gameState, setGameState] = useState<LudoGameState>({
    turn: "blue",
    ranking: [],
    tokenPositions: initializeTokenPosition(),
    boardStatus: "",
    diceRoll: null,
    lastDiceRoll: null,
    gameState: "playerHasToRollADice",
    players: [],
  });
  const [showSetupModal, setShowSetupModal] = useState<boolean>(true);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [botThinking, setBotThinking] = useState<boolean>(false);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ludo) return;
    const handleStateChange = (newState: LudoGameState) => {
      setGameState(newState);
    };
    ludo.on("stateChange", handleStateChange);
    return () => {
      ludo.off("stateChange", handleStateChange);
    };
  }, [ludo]);

  const s = gameState;
  const isGameFinished =
    s.ranking.length >= s.players.length && s.players.length > 0;

  const startNewGame = useCallback(() => {
    const chosenColors = COLOR_SETS[playerCount];
    const newLudo = new Ludo(playerCount);
    newLudo.players = chosenColors;
    newLudo.reset();
    setGameState(newLudo.getCurrentState());
    setLudo(newLudo);
    setShowSetupModal(false);
    setShowResetModal(false);
  }, [playerCount]);

  useEffect(() => {
    if (!ludo || isGameFinished) return;
    if (s.gameState !== "playerHasToRollADice") return;

    const botTurn = playerTypes[s.turn] === "bot";
    if (!botTurn || botThinking) return;

    setBotThinking(true);
    botTimeoutRef.current = setTimeout(() => {
      ludo.rollDiceForCurrentPiece();
      setBotThinking(false);
    }, 1200);
  }, [
    ludo,
    s.gameState,
    s.turn,
    s.players,
    botThinking,
    isGameFinished,
    playerTypes,
  ]);

  useEffect(() => {
    if (!ludo || isGameFinished) return;
    if (s.gameState !== "playerHasToSelectAPosition" || s.diceRoll === null)
      return;

    const botTurn = playerTypes[s.turn] === "bot";
    if (!botTurn || botThinking) return;

    setBotThinking(true);
    botTimeoutRef.current = setTimeout(() => {
      const best = ludo.bestMove();
      if (best >= 0) {
        ludo.selectToken(best);
      }
      setBotThinking(false);
    }, 800);
  }, [
    ludo,
    s.gameState,
    s.turn,
    s.players,
    s.diceRoll,
    botThinking,
    isGameFinished,
    playerTypes,
  ]);

  const handleRollDice = (): void => {
    if (!ludo || isGameFinished) return;
    const { turn } = ludo.getCurrentState();
    if (playerTypes[turn] === "bot") return;
    setTimeout(() => {
      ludo.rollDiceForCurrentPiece();
    }, 1000);
  };

  const handleTokenClick = (color: Color, tokenIndex: number): void => {
    if (!ludo || isGameFinished) return;
    const st = ludo.getCurrentState();
    if (color !== st.turn) return;
    if (playerTypes[color] === "bot") return;
    if (!ludo.validTokenIndices.includes(tokenIndex)) return;
    ludo.selectToken(tokenIndex);
  };

  const colorMap: Record<Color, string> = {
    red: "#FF0000",
    green: "#00FF00",
    yellow: "#FFFF00",
    blue: "#0000FF",
  };

  function getColorOffset(index: number, totalColors: number) {
    const offset = 10;
    if (totalColors === 1) return { x: 0, y: 0 };
    if (totalColors === 2)
      return index === 0
        ? { x: -offset, y: -offset }
        : { x: offset, y: offset };
    if (totalColors === 3) {
      if (index === 0) return { x: -offset, y: -offset };
      if (index === 1) return { x: offset, y: -offset };
      if (index === 2) return { x: offset, y: offset };
    }
    if (totalColors === 4) {
      if (index === 0) return { x: -offset, y: -offset };
      if (index === 1) return { x: offset, y: -offset };
      if (index === 2) return { x: -offset, y: offset };
      if (index === 3) return { x: offset, y: offset };
    }
    return { x: 0, y: 0 };
  }

  const startingPositions: Record<Color, [number, number][]> = {
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
    blue: [
      [10, 1],
      [10, 4],
      [13, 1],
      [13, 4],
    ],
    yellow: [
      [10, 10],
      [10, 13],
      [13, 10],
      [13, 13],
    ],
  };

  const getTokensAtSquare = (
    rowIndex: number,
    colIndex: number
  ): { token: Color; index: number }[] => {
    if (!ludo) return [];
    const tokens: { token: Color; index: number }[] = [];
    s.players.forEach((color) => {
      s.tokenPositions[color].forEach((pos, i) => {
        if (pos !== -1) {
          const [r2, c2] = ludo.colorPaths[color][pos];
          if (r2 === rowIndex && c2 === colIndex) {
            tokens.push({ token: color, index: i });
          }
        } else {
          const [hr, hc] = startingPositions[color][i];
          if (hr === rowIndex && hc === colIndex) {
            tokens.push({ token: color, index: i });
          }
        }
      });
    });
    return tokens;
  };

  const groupTokensByColor = (
    tokens: { token: Color; index: number }[]
  ): { token: Color; total: number }[] => {
    const counts: Record<Color, number> = {
      red: 0,
      green: 0,
      blue: 0,
      yellow: 0,
    };
    tokens.forEach(({ token }) => {
      counts[token]++;
    });
    return Object.entries(counts)
      .filter(([, cnt]) => cnt > 0)
      .map(([color, total]) => ({ token: color as Color, total }));
  };

  let statusMessage = "No game in progress.";
  if (ludo) {
    if (isGameFinished) {
      statusMessage = `Game finished! Final ranking: ${s.ranking.join(" -> ")}`;
    } else {
      statusMessage = `${s.turn.toUpperCase()}'s turn.`;
      if (s.lastDiceRoll !== null) {
        statusMessage += ` (Last roll: ${s.lastDiceRoll})`;
      }
      if (s.boardStatus) {
        statusMessage += ` — ${s.boardStatus}`;
      }
    }
  }

  const isDiceDisabled =
    !ludo ||
    isGameFinished ||
    s.gameState !== "playerHasToRollADice" ||
    playerTypes[s.turn] === "bot" ||
    botThinking;

  const modalStyle: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    zIndex: 1000,
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
  };

  const selectStyle: React.CSSProperties = {
    padding: "5px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "16px",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px",
        height: "100vh",
      }}
    >
      {/* Game Status */}
      <div
        style={{
          width: "100%",
          textAlign: "center",
          fontSize: "18px",
          fontWeight: "500",
        }}
      >
        {statusMessage}
      </div>

      {/* Board */}
      {ludo ? (
        <div
          style={{
            width: "100%",
            overflow: "hidden",
            aspectRatio: "1/1",
            backgroundColor: "#f0f0f0",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "grid",
              width: "100%",
              height: "100%",
              gridTemplateColumns: "repeat(15, 1fr)",
              gridTemplateRows: "repeat(15, 1fr)",
            }}
          >
            {ludo.board.map((row, rowIndex) =>
              row.map((col, colIndex) => {
                const rawTokens = getTokensAtSquare(rowIndex, colIndex);
                const groupedTokens = groupTokensByColor(rawTokens);
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: "1px solid #ccc",
                      borderRight: "1px solid #ccc",
                      backgroundColor: col === null ? "#f8f8f8" : "",
                      ...(col?.isOnPathToFinalPosition
                        ? {
                            backgroundColor:
                              colorMap[col.isOnPathToFinalPosition],
                          }
                        : {}),
                      ...(col?.isStartingPosition
                        ? { backgroundColor: colorMap[col.isStartingPosition] }
                        : {}),
                      ...(col?.isFinalPosition
                        ? { backgroundColor: colorMap[col.isFinalPosition] }
                        : {}),
                    }}
                  >
                    {groupedTokens.map(({ token, total }, i) => {
                      const isCurrentPlayerStack =
                        token === s.turn &&
                        rawTokens.some(
                          (t) =>
                            t.token === token &&
                            ludo.validTokenIndices.includes(t.index)
                        );
                      const onCircleClick = () => {
                        const validToken = rawTokens.find(
                          (t) =>
                            t.token === token &&
                            ludo.validTokenIndices.includes(t.index)
                        );
                        if (validToken) {
                          handleTokenClick(validToken.token, validToken.index);
                        }
                      };
                      const offset = getColorOffset(i, groupedTokens.length);
                      return (
                        <div
                          key={`${token}-${i}`}
                          onClick={onCircleClick}
                          style={{
                            position: "absolute",
                            transform: `translate(${offset.x}px, ${offset.y}px)`,
                            width: `${40 + total * 10}%`,
                            height: `${40 + total * 10}%`,
                            backgroundColor: colorMap[token],
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            border:
                              isCurrentPlayerStack && !isGameFinished
                                ? "2px solid white"
                                : "none",
                          }}
                        >
                          {total > 1 ? total : ""}
                        </div>
                      );
                    })}
                    {col?.isSafeZone &&
                      !col?.isStartingPosition &&
                      !col?.isFinalPosition && (
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            zIndex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              width: "50%",
                              height: "50%",
                              border: "1px dashed #800080",
                              borderRadius: "50%",
                              backgroundColor: "#e0e0ff",
                            }}
                          />
                        </div>
                      )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: "1/1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f0f0f0",
            borderRadius: "8px",
          }}
        >
          No Game Yet
        </div>
      )}

      {/* Ranking/Turn Info & Controls */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {s.ranking.length > 0 && !isGameFinished && (
          <div style={{ textAlign: "center" }}>
            Current Ranking: {s.ranking.join(" -> ")}
          </div>
        )}
        {isGameFinished && (
          <div style={{ textAlign: "center" }}>
            Final Ranking: {s.ranking.join(" -> ")}
          </div>
        )}
        {!isGameFinished && ludo && (
          <button
            style={{
              ...buttonStyle,
              backgroundColor: "#0000FF",
              color: "white",
              width: "100%",
            }}
            onClick={handleRollDice}
            disabled={isDiceDisabled}
          >
            Roll Dice
          </button>
        )}
        <button
          style={{
            ...buttonStyle,
            backgroundColor: "#00FF00",
            color: "white",
            width: "100%",
          }}
          onClick={() => setShowResetModal(true)}
        >
          Reset
        </button>
      </div>

      {/* Setup Modal */}
      {showSetupModal && !ludo && (
        <div style={modalStyle}>
          <h2 style={{ marginBottom: "16px" }}>Ludo Setup</h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <label style={{ gridColumn: "span 3" }} htmlFor="playerCount">
                Number of Players:
              </label>
              <select
                id="playerCount"
                value={playerCount}
                onChange={(e) => setPlayerCount(+e.target.value as 2 | 3 | 4)}
                style={selectStyle}
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
            {COLOR_SETS[playerCount].map((color) => (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  alignItems: "center",
                  gap: "8px",
                }}
                key={color}
              >
                <label
                  style={{ gridColumn: "span 3" }}
                  htmlFor={`sel-${color}`}
                >
                  {color}:
                </label>
                <select
                  id={`sel-${color}`}
                  value={playerTypes[color]}
                  onChange={(e) =>
                    setPlayerTypes((prev) => ({
                      ...prev,
                      [color]: e.target.value as "human" | "bot",
                    }))
                  }
                  style={selectStyle}
                >
                  <option value="human">Human</option>
                  <option value="bot">Bot</option>
                </select>
              </div>
            ))}
            <button
              style={{
                ...buttonStyle,
                backgroundColor: "#00FF00",
                color: "white",
                width: "100%",
              }}
              onClick={startNewGame}
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div style={modalStyle}>
          <h2 style={{ marginBottom: "16px" }}>Reset Game</h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <p>Are you sure you want to start a new Ludo game?</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#ccc",
                  color: "black",
                  width: "50%",
                }}
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#00FF00",
                  color: "white",
                  width: "50%",
                }}
                onClick={() => {
                  setShowResetModal(false);
                  setLudo(null);
                  setShowSetupModal(true);
                }}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LudoPage;
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