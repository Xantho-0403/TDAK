# TDAK (Tetris Development & Knowledge)

## Philosophy

TDAK is **not simply a Tetris client**.

Its primary goal is to become a comprehensive **offline training platform** supporting beginners, intermediate players, and advanced players through modular practice tools.

The project emphasizes:

- Offline-first architecture
- High modularity
- Separation of concerns
- Extensibility
- Training-oriented AI
- Browser compatibility
- Single-file standalone deployment

---

# Current Architecture

```
Renderer
        │
        ▼
 GameInstance
        ▲
        │
InputProvider
 ├── KeyboardInputProvider
 ├── BotInputProvider
 ├── (Future) ReplayInputProvider
 └── (Future) NetworkInputProvider

BattleManager

AI Pipeline
Placement Generator
        ↓
Evaluation Function (El-Tetris)
        ↓
Target Selection
        ↓
Path Generator
        ↓
BotInputProvider
```

---

# Core Modules

## GameInstance

Responsible only for game simulation.

Responsibilities:

- Piece movement
- Rotation
- Gravity
- Lock delay
- Line clear
- Combo
- B2B
- Attack generation

It must never know:

- Rendering
- Keyboard
- AI
- Battle logic

---

## Renderer

Responsible only for drawing.

- Main board
- Hold
- Next queue
- Ghost
- Overlays
- Debug visualization

---

## Input Providers

Input abstraction layer.

Current:

- KeyboardInputProvider
- BotInputProvider

Future:

- ReplayInputProvider
- NetworkInputProvider

---

## BattleManager

Responsible for all VS interactions.

Responsibilities:

- Garbage transfer
- Garbage blocking
- Garbage queue
- KO detection
- Match state
- Statistics

---

## AI Pipeline

Current pipeline:

Placement Generator
↓

El-Tetris Evaluation

↓

Best Placement

↓

Path Generator

↓

BotInputProvider

Current limitations:

- No Hold
- No Lookahead
- No strategy layer
- No style system

---

# Current Features

✔ Sandbox

✔ Sprint (40L)

✔ Survival

✔ Cheese

✔ 4-Wide

✔ VS Bot

✔ El-Tetris Bot

✔ Battle System

✔ Config System

✔ Offline Standalone Build

---

# Development Roadmap

## Phase 6A — Strategic AI

Goal:

Improve the bot's strategic quality while preserving the existing architecture.

Features:

- Hold support
- One-piece lookahead
- Improved reachability/path search
- Better move planning
- Keep El-Tetris evaluation

No personality changes yet.

---

## Phase 6B — AI Style System

Goal:

Transform the AI from a generic player into specialized training partners.

Possible styles:

- Defensive
- Aggressive
- Downstack
- Clean Stack
- Sprint
- Opener
- Freestyle

The Style System should modify the decision process rather than simply changing heuristic weights.

---

## Phase 7 — Training Modules

Training-oriented features:

- Opener Trainer
- Opener Repertoire
- Midgame Setups

---

## Phase 8 — Puzzle System

Puzzle editor

Puzzle library

Challenge mode

Replay support

---

# Design Principles

Whenever a new feature is added:

- Keep GameInstance independent.
- Avoid coupling between modules.
- Never mix rendering and game logic.
- Prefer composition over inheritance.
- Every system should have a single responsibility.