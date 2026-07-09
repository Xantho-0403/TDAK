# TDAK
An offline modern Tetris trainer built with HTML, CSS and JavaScript.

## Goal

The goal of this project is to provide an all-in-one practice environment for modern Tetris players.

Unlike traditional clients, TDAK focuses on training rather than matchmaking.

The project is designed to run entirely offline, including on school devices.

To Simply play on your web, download "offlineplayground.html"
---

## Current Features

- Sandbox
- Sprint (40 Lines)
- Cheese Race
- Survival
- 4-Wide Practice

---

## Planned Features

### Version 1.0
- VS Bot
- Basic Statistics

### Version 1.1
- Opener Practice
- Opener Repertoire

### Version 1.2
- Midgame Setups

### Version 1.3
- Puzzle Mode

---

## Technologies

- HTML
- CSS
- JavaScript (Vanilla)

No frameworks.
No build tools required for play.
Runs completely offline.

---

## 💻 Running the App Offline (School Computers / USB Drives)

Modern web browsers enforce security policies (CORS) that block ES modules (`type="module"`) when loading files directly using the `file://` protocol (i.e. double-clicking `index.html` from a folder or USB drive).

To overcome this constraint and run the game flawlessly with **zero installation or Node.js required**, we provide an automated bundler script that compiles the entire game into a **single, fully self-contained HTML file**:

### How to use the Offline Standalone File:
1. Locate **`offline_playground.html`** in the project's root folder.
2. Simply copy this file to a **USB drive, send it via email, or save it to a school computer desktop**.
3. **Double-click `offline_playground.html`** in any modern web browser (Chrome, Edge, Safari, Firefox).
4. The entire game, including all styles, graphics, customizable key configs, and game modes, will run completely offline with absolutely **no Node.js or web server required!**
5. All local record histories and custom key bindings are safely persistent using the browser's `localStorage`.

### Rebuilding the Standalone File (For Developers):
If you modify the source files in `js/` or `css/`, you can regenerate the offline standalone file by running:
```bash
# 1. Install dependencies (if any, none required by default)
npm install

# 2. Run the compiler script
npm run build
# Or directly: node bundle.js
```
This will automatically update `offline_playground.html` in the root directory!

---

## 🛠️ Development Server (For local HTTP testing)

If you are developing and want to test the multi-file modular version (`index.html` with individual files in `/js` and `/css`), you can run the simple development server:
```bash
npm run dev
```
Then open `http://localhost:3000` in your browser. Note that this development server is strictly optional and only required if you prefer working with split module files during development.
