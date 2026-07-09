# Architecture

## Philosophy

The project should remain modular and easy to extend.

Future content should be data-driven whenever possible.

---

## Core Components

GameInstance

Responsible for:

- Board
- Queue
- Hold
- Gravity
- Rotation
- Line Clears
- Garbage
- Rendering requests

---

InputProvider

Provides player actions.

Possible implementations:

- KeyboardInput
- BotInput
- ReplayInput

GameInstance should not know where inputs come from.

---

Renderer

Responsible only for drawing.

No game logic should exist here.

---

Statistics

Stores:

- PBs
- Wins
- Losses
- Session history

Uses localStorage.

---

Future Systems

Opener

Midgame

Puzzle

These should be implemented as data rather than hardcoded logic whenever possible.