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

## 🚢 Deployment Guide

This project is fully production-ready and can be deployed either as a **unified full-stack service** (recommended) or as **separate frontend & backend services**.

---

### Option A: 1-Click / Unified Full-Stack (Render, Railway, Fly.io, Heroku)

Because the Express server serves both the Socket.IO server, REST APIs, and the compiled Vite frontend (`client/dist`) with automatic SPA routing:

1. **Push your code to GitHub**.
2. **On Render / Railway / Heroku**:
   - Create a **New Web Service** connected to your repository.
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV=production`
     - `PORT` (automatically assigned by the platform)
3. **Done!** The platform will install all dependencies, build the frontend and backend, and serve the entire application with WebSocket support.

---

### Option B: Docker Container

A multi-stage `Dockerfile` is included:

```bash
# Build the Docker image
docker build -t grandmaster-chess .

# Run the container
docker run -p 5000:5000 grandmaster-chess
```
Open [http://localhost:5000](http://localhost:5000) to view your app.

---

### Option C: Separate Deployments (e.g. Vercel Frontend + Render Backend)

If you prefer deploying the frontend to Vercel/Netlify and the backend to Render/Railway:
1. **Backend (Server)**:
   - Root directory: `server`
   - Build: `npm run build`
   - Start: `npm start`
2. **Frontend (Client)**:
   - Root directory: `client`
   - Build: `npm run build`
   - Output directory: `dist`
   - Set Environment Variable: `VITE_SERVER_URL=https://your-backend-service.onrender.com`

---

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

## 🎮 Game Modes & Features

### 1. Online 1v1 Multiplayer (PvP)
- **Create Room**: Choose your desired time control and starting color (Random, White, Black).
- **Unique 6-Character Room Codes**: E.g., `AB3X9Q`.
- **1-Click Invitation Link**: Instantly copy shareable room URLs (`http://localhost:5173/?room=AB3X9Q`).
- **Open Matches Browser**: Live list of active rooms waiting for opponents.
- **Custom Username**: Set your player name; persisted in browser storage.
- **Spectator Mode**: If a 3rd person joins an active room, they can watch the live game.

### 2. Pass & Play (Local 1v1 Offline Match)
- **Same-Device 1v1 Match**: Play locally with a friend on the same laptop, desktop, or tablet.
- **No Internet Required**: Runs self-contained in the browser with full authoritative chess rules via `chess.js`.
- **Custom Names**: Set separate names for White and Black players.
- **Full Time Controls**: Unlimited, 3 min, 5 min, 10 min, and 15m+10s with real-time countdown clocks.
- **Auto-Flip Board Option**: Automatically rotates the board on each turn so the active player faces the bottom, or keep it fixed.
- **Post-Game Rematch**: Seamless restart with swapped colors.

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
