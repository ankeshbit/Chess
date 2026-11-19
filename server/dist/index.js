import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager.js';
import { getGameRecords, getGameRecordById } from './db.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
});
const roomManager = new RoomManager(io);
// REST API Endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
app.get('/api/rooms', (req, res) => {
    res.json(roomManager.getPublicRooms());
});
app.get('/api/rooms/:id', (req, res) => {
    const room = roomManager.getRoom(req.params.id);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    res.json(roomManager.sanitizeRoom(room));
});
app.get('/api/games', async (req, res) => {
    const games = await getGameRecords(50);
    res.json(games);
});
app.get('/api/games/:id', async (req, res) => {
    const game = await getGameRecordById(req.params.id);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
});
// Socket.IO Events
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    // Create room
    socket.on('create_room', (data, callback) => {
        try {
            const room = roomManager.createRoom(data.playerId, socket.id, data.username, data.timeControlId, data.preferredColor || 'random', data.isPublic ?? true);
            socket.join(room.id);
            const sanitized = roomManager.sanitizeRoom(room);
            if (typeof callback === 'function') {
                callback({ success: true, room: sanitized });
            }
            socket.emit('room_created', { room: sanitized });
        }
        catch (err) {
            console.error('[Socket] create_room error:', err);
            if (typeof callback === 'function') {
                callback({ success: false, error: err.message });
            }
        }
    });
    // Join room
    socket.on('join_room', (data, callback) => {
        try {
            const result = roomManager.joinRoom(data.roomId, data.playerId, socket.id, data.username);
            if (!result.success || !result.room) {
                if (typeof callback === 'function') {
                    callback({ success: false, error: result.message || 'Failed to join room' });
                }
                return;
            }
            socket.join(result.room.id);
            const sanitized = roomManager.sanitizeRoom(result.room);
            if (typeof callback === 'function') {
                callback({ success: true, room: sanitized, role: result.role });
            }
            socket.emit('room_joined', { room: sanitized, role: result.role });
            // Notify other participants in the room
            socket.to(result.room.id).emit('player_joined', {
                room: sanitized,
                newParticipant: { username: data.username, role: result.role },
            });
        }
        catch (err) {
            console.error('[Socket] join_room error:', err);
            if (typeof callback === 'function') {
                callback({ success: false, error: err.message });
            }
        }
    });
    // Reconnect
    socket.on('reconnect_player', (data, callback) => {
        const result = roomManager.handleReconnect(data.playerId, socket.id);
        if (result.reconnected && result.room) {
            socket.join(result.room.id);
            const sanitized = roomManager.sanitizeRoom(result.room);
            if (typeof callback === 'function') {
                callback({ reconnected: true, room: sanitized, role: result.role });
            }
            socket.emit('reconnected', { room: sanitized, role: result.role });
            socket.to(result.room.id).emit('player_reconnected', {
                room: sanitized,
                role: result.role,
            });
        }
        else {
            if (typeof callback === 'function') {
                callback({ reconnected: false });
            }
        }
    });
    // Make move
    socket.on('make_move', (data, callback) => {
        const result = roomManager.makeMove(socket.id, data.from, data.to, data.promotion);
        if (typeof callback === 'function') {
            callback(result);
        }
    });
    // Resign
    socket.on('resign', (callback) => {
        const result = roomManager.resign(socket.id);
        if (typeof callback === 'function') {
            callback(result);
        }
    });
    // Draw offers
    socket.on('offer_draw', (callback) => {
        const result = roomManager.offerDraw(socket.id);
        if (typeof callback === 'function') {
            callback(result);
        }
    });
    socket.on('respond_draw', (data, callback) => {
        const result = roomManager.respondDraw(socket.id, data.accept);
        if (typeof callback === 'function') {
            callback(result);
        }
    });
    // Rematch
    socket.on('request_rematch', (callback) => {
        const result = roomManager.requestRematch(socket.id);
        if (typeof callback === 'function') {
            callback(result);
        }
    });
    socket.on('respond_rematch', (data, callback) => {
        const result = roomManager.respondRematch(socket.id, data.accept);
        if (typeof callback === 'function') {
            callback(result);
        }
    });
    // In-game chat
    socket.on('send_chat', (data) => {
        const text = data.text?.trim();
        if (!text || text.length > 200)
            return;
        // Find room of player
        for (const r of roomManager.getPublicRooms()) {
            // Chat is scoped by room
        }
        // We can lookup room by socket:
        const room = roomManager.getRoom(Array.from(socket.rooms).find(r => r !== socket.id) || '');
        if (room) {
            let sender = 'Spectator';
            let color = 'system';
            if (room.white && room.white.socketId === socket.id) {
                sender = room.white.username;
                color = 'w';
            }
            else if (room.black && room.black.socketId === socket.id) {
                sender = room.black.username;
                color = 'b';
            }
            else {
                const spec = room.spectators.find(s => s.socketId === socket.id);
                if (spec)
                    sender = spec.username;
            }
            io.to(room.id).emit('chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                sender,
                color,
                text,
                timestamp: Date.now(),
            });
        }
    });
    // Disconnect
    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
        roomManager.handleDisconnect(socket.id);
    });
});
// In production, locate static assets from client/dist if present
const possibleClientPaths = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
];
let clientDistPath = null;
for (const p of possibleClientPaths) {
    if (fs.existsSync(p)) {
        clientDistPath = p;
        break;
    }
}
if (clientDistPath) {
    console.log(`[Server] Serving production frontend from: ${clientDistPath}`);
    app.use(express.static(clientDistPath));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path.join(clientDistPath, 'index.html'));
        }
        next();
    });
}
else {
    console.log('[Server] No client/dist directory found. Serving backend status dashboard.');
    app.get('/', (req, res) => {
        res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Grandmaster 1v1 Chess Server</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #09090b;
            color: #f4f4f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .card {
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 20px;
            padding: 36px;
            max-width: 520px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.4);
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 16px;
          }
          .pulse {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            animation: pulse 1.8s infinite;
          }
          @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          }
          h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; }
          p { color: #a1a1aa; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5; }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 24px;
            text-align: left;
          }
          .info-box {
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 12px;
            padding: 12px 14px;
          }
          .info-title { font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: bold; }
          .info-val { font-size: 13px; font-weight: 600; color: #e4e4e7; margin-top: 4px; }
          .endpoints { text-align: left; font-size: 12px; color: #a1a1aa; margin-top: 16px; }
          .endpoints a { color: #f59e0b; text-decoration: none; font-weight: 600; }
          .endpoints a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">
            <span class="pulse"></span>
            BACKEND ONLINE & ACTIVE
          </div>
          <h1>♟️ Grandmaster 1v1 Chess Server</h1>
          <p>Authoritative Real-Time WebSocket & REST API server is running smoothly on Render.</p>
          
          <div class="grid">
            <div class="info-box">
              <div class="info-title">Socket.IO Server</div>
              <div class="info-val">Active (Port ${PORT})</div>
            </div>
            <div class="info-box">
              <div class="info-title">Chess Engine</div>
              <div class="info-val">chess.js Authoritative</div>
            </div>
            <div class="info-box">
              <div class="info-title">Match Store</div>
              <div class="info-val">Persistent JSON/DB</div>
            </div>
            <div class="info-box">
              <div class="info-title">Server Time</div>
              <div class="info-val">${new Date().toUTCString()}</div>
            </div>
          </div>

          <div class="endpoints">
            <strong>REST Endpoints:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
              <li><a href="/api/health">/api/health</a> &mdash; Server status healthcheck</li>
              <li><a href="/api/rooms">/api/rooms</a> &mdash; Active & waiting public rooms</li>
              <li><a href="/api/games">/api/games</a> &mdash; Recorded completed matches</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `);
    });
}
server.listen(PORT, () => {
    console.log(`[Server] Chess PvP Server running on port ${PORT}`);
});
// Graceful shutdown
const shutdown = () => {
    console.log('[Server] Gracefully shutting down...');
    server.close(() => {
        console.log('[Server] HTTP and Socket server closed.');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
