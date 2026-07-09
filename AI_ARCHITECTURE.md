# AI Decision System Architecture (Phase 4)

This document describes the modular decision-making pipeline designed for the modern Tetris practicing bot. It is built to be simple, highly modular, and easily extensible for future iterations (such as multi-piece lookahead or deep search).

## 1. Overall AI Pipeline

The pipeline follows a unidirectional flow:
```
Current Board State
        ↓
[Placement Generator] (SRS compliant, generates legal & reachable final states)
        ↓
[Evaluation Function] (Heuristic scorer using El-Tetris/Dellacherie strategy)
        ↓
[Best Placement Selector] (Selects the candidate with the highest score)
        ↓
[Path Generator] (Converts placement into a precise keystroke sequence)
        ↓
[BotInputProvider] (Translates abstract inputs to GameInstance operations)
        ↓
[PPS Scheduler] (Regulates speed based on configured Pieces Per Second)
        ↓
GameInstance Board Update
```

---

## 2. Responsibilities of Each Module

### A. Placement Generator
- **Role**: Finds all unique, valid final positions where the current tetromino can land.
- **Mechanics**: Iterates through all 4 SRS rotation states. For each rotation state, moves the piece to all possible horizontal columns ($x$-coordinates). Runs a simplified collision check and downward drop to find the exact landing coordinates.
- **Pruning**: Only retains reachable, legal final placements.

### B. Heuristic Evaluator (El-Tetris / Pierre Dellacherie Style)
- **Role**: Evaluates a simulated board state resulting from a candidate placement.
- **Metrics Evaluated**:
  1. **Landing Height**: Vertical height of the landing piece's center (lower is better).
  2. **Eroded Piece Cells**: Multiplies completed lines by the count of cells from the placed piece that were cleared (higher is better).
  3. **Row Transitions**: Count of adjacent empty/filled transitions across each row (lower is better).
  4. **Column Transitions**: Count of adjacent empty/filled transitions across each column (lower is better).
  5. **Holes**: Number of empty spaces covered by blocks (strongly penalized).
  6. **Cumulative Wells**: Sum of depths of all vertical wells (penalized).
- **Weights**: Classic Dellacherie weights.

### C. Best Placement Selector
- **Role**: Applies the Heuristic Evaluator to all candidates produced by the Placement Generator.
- **Outputs**: Returns the single best candidate structure containing the targeted rotation, target $x$-position, and calculated actions.

### D. Path Generator
- **Role**: Builds an action sequence (e.g. `['cw', 'left', 'left', 'hardDrop']`) to transition the piece from its spawn state to the chosen placement.

### E. AI Debug Overlay
- **Role**: Renders an overlay on the Bot's viewport displaying the evaluated candidates count, best score, and target placement, toggleable via UI.

---

## 3. Public Interfaces & Data Flow

### Candidate Placement Interface
```typescript
interface PlacementCandidate {
    x: number;
    y: number;
    rotation: number;     // 0, 1, 2, 3
    actions: string[];    // e.g. ['cw', 'left', 'hardDrop']
    score?: number;
}
```

### Module Interfaces
- `generateCandidates(game: GameInstance): PlacementCandidate[]`
- `evaluateBoard(board: number[][], linesCleared: number, pieceX: number, pieceY: number): number`
- `BotAI.update(dt: number)`: Main loop hook orchestrating generation, selection, path planning, and queuing actions into the scheduler.

---

## 4. Files to be Modified
1. `/js/input.js`: To replace the `DebugAI` class with the new heuristic `BotAI` implementation, the `Placement Generator`, the `Heuristic Evaluator`, and `Path Generator`.
2. `/js/app.js`: To initialize and bind any AI settings and register the debug overlay toggling interface.
3. `/index.html`: To add a toggle control for the AI Debug Overlay in the menu/settings.
4. `/css/style.css`: To style the optional AI Debug Overlay.
