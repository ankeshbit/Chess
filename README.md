# Grandmaster 1v1 - Real-Time Multiplayer Chess

A production-quality, authoritative 1v1 Player vs Player (PvP) Online Chess platform built with modern web technologies.

> **Strictly PvP**: Built exclusively for real human vs human matches. No AI or Stockfish opponents.

---

## ⚡ Tech Stack

- **Frontend**: React 19 + Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Chess Engine**: `chess.js` (Server-authoritative rules and validation)
- **Persistence**: File/ACID-safe persistent storage with PostgreSQL support
- **Audio Engine**: High-fidelity Web Audio API synthesizer (no broken external audio assets)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Root
npm install

# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Run Both Server & Client Concurrently
From the root directory:
```bash
npm run dev
```

- **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend Real-Time Server**: [http://localhost:5000](http://localhost:5000)

---

## 🎮 Game Flow & Features

### 1. Game Lobby & Matchmaking
- **Create Room**: Choose your desired time control and starting color (Random, White, Black).
- **Unique 6-Character Room Codes**: E.g., `AB3X9Q`.
- **1-Click Invitation Link**: Instantly copy shareable room URLs (`http://localhost:5173/?room=AB3X9Q`).
- **Open Matches Browser**: Live list of active rooms waiting for opponents.
- **Custom Username**: Set your player name; persisted in browser storage.

### 2. Authoritative Gameplay
- **Authoritative Server**: Every move is validated server-side using `chess.js`.
- **Turns & Rules**: Strict turn-taking enforcement, illegal move prevention, and duplicate move rejection.
- **Movement**:
  - Drag-and-drop pieces directly to target squares.
  - Click-to-move with highlighted destination dots and capture rings.
- **Visual Cues**:
  - Selected piece highlight.
  - Legal move indicators (dots for empty squares, rings for captures).
  - Last move highlight (from & to squares).
  - Checked King glowing indicator.
- **Special Moves**:
  - Kingside and Queenside castling.
  - En passant.
  - Pawn promotion modal (Queen, Rook, Bishop, Knight).
- **Match Endings**:
  - Checkmate detection.
  - Stalemate detection.
  - Threefold repetition.
  - 50-move rule.
  - Insufficient material.
  - Resignation (with confirmation modal).
  - Mutual draw offer & accept/decline.
  - Clocks flag / timeout.

### 3. Server-Authoritative Clocks
- **Supported Time Controls**:
  - Unlimited (Casual)
  - 3 min (Blitz)
  - 5 min (Blitz)
  - 10 min (Rapid)
  - 15 min + 10s increment (Rapid)
- Increments applied automatically upon move acceptance.
- Timeout detection executed by the server and broadcasted in real time.

### 4. Reliability & Reconnection
- **Persistent Player IDs**: Reconnecting players automatically rejoin their active game with full state restoration.
- **Connection Badges**: Real-time online/reconnecting status for both players.
- **Spectator Support**: Additional participants joining an active match can spectate in real time.
- **Rematch Flow**: Post-game rematch offer with automatic color-swapping.
- **Match Archives**: Persistent game logs with PGN and FEN exports.
- **In-Game Chat**: Real-time chat with quick reactions.
