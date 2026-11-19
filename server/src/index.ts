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
import { TimeControlId } from './types.js';

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
  socket.on('create_room', (data: {
    playerId: string;
    username: string;
    timeControlId: TimeControlId;
    preferredColor?: 'random' | 'w' | 'b';
    isPublic?: boolean;
  }, callback) => {
    try {
      const room = roomManager.createRoom(
        data.playerId,
        socket.id,
        data.username,
        data.timeControlId,
        data.preferredColor || 'random',
        data.isPublic ?? true
      );
      socket.join(room.id);
      const sanitized = roomManager.sanitizeRoom(room);
      if (typeof callback === 'function') {
        callback({ success: true, room: sanitized });
      }
      socket.emit('room_created', { room: sanitized });
    } catch (err: any) {
      console.error('[Socket] create_room error:', err);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Join room
  socket.on('join_room', (data: {
    roomId: string;
    playerId: string;
    username: string;
  }, callback) => {
    try {
      const result = roomManager.joinRoom(
        data.roomId,
        data.playerId,
        socket.id,
        data.username
      );

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
    } catch (err: any) {
      console.error('[Socket] join_room error:', err);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Reconnect
  socket.on('reconnect_player', (data: { playerId: string }, callback) => {
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
    } else {
      if (typeof callback === 'function') {
        callback({ reconnected: false });
      }
    }
  });

  // Make move
  socket.on('make_move', (data: {
    from: string;
    to: string;
    promotion?: string;
  }, callback) => {
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

  socket.on('respond_draw', (data: { accept: boolean }, callback) => {
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

  socket.on('respond_rematch', (data: { accept: boolean }, callback) => {
    const result = roomManager.respondRematch(socket.id, data.accept);
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  // In-game chat
  socket.on('send_chat', (data: { text: string }) => {
    const text = data.text?.trim();
    if (!text || text.length > 200) return;

    // Find room of player
    for (const r of roomManager.getPublicRooms()) {
      // Chat is scoped by room
    }
    // We can lookup room by socket:
    const room = roomManager.getRoom(Array.from(socket.rooms).find(r => r !== socket.id) || '');
    if (room) {
      let sender = 'Spectator';
      let color: any = 'system';
      if (room.white && room.white.socketId === socket.id) {
        sender = room.white.username;
        color = 'w';
      } else if (room.black && room.black.socketId === socket.id) {
        sender = room.black.username;
        color = 'b';
      } else {
        const spec = room.spectators.find(s => s.socketId === socket.id);
        if (spec) sender = spec.username;
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

// In production, serve static assets from client/dist if present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Server] Serving production frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
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
