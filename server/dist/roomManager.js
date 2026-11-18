import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import { TIME_CONTROLS, } from './types.js';
import { saveGameRecord } from './db.js';
export class RoomManager {
    rooms = new Map();
    playerToRoom = new Map(); // socketId -> roomId
    io;
    constructor(io) {
        this.io = io;
    }
    // Generate clean 6-character room code without confusing characters
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        do {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }
    // Create a new room
    createRoom(playerId, socketId, username, timeControlId = '10m', preferredColor = 'random', isPublic = true) {
        const roomId = this.generateRoomCode();
        const chess = new Chess();
        const tc = TIME_CONTROLS[timeControlId] || TIME_CONTROLS['10m'];
        let assignedColor;
        if (preferredColor === 'w') {
            assignedColor = 'w';
        }
        else if (preferredColor === 'b') {
            assignedColor = 'b';
        }
        else {
            assignedColor = Math.random() < 0.5 ? 'w' : 'b';
        }
        const hostPlayer = {
            id: playerId,
            socketId,
            username: username.trim() || 'Anonymous Host',
            color: assignedColor,
            connected: true,
        };
        const initialClocks = {
            w: tc.initialSeconds * 1000,
            b: tc.initialSeconds * 1000,
        };
        const room = {
            id: roomId,
            white: assignedColor === 'w' ? hostPlayer : null,
            black: assignedColor === 'b' ? hostPlayer : null,
            spectators: [],
            fen: chess.fen(),
            pgn: chess.pgn(),
            turn: 'w',
            isCheck: false,
            history: [],
            status: 'waiting',
            winner: null,
            winnerReason: null,
            timeControl: tc,
            clocks: initialClocks,
            lastMoveTimestamp: null,
            lastMove: null,
            drawOfferFrom: null,
            rematchOfferFrom: null,
            createdAt: Date.now(),
            isPublic,
        };
        const roomInternal = {
            room,
            chess,
            lastTickTime: Date.now(),
        };
        this.rooms.set(roomId, roomInternal);
        this.playerToRoom.set(socketId, roomId);
        console.log(`[RoomManager] Room ${roomId} created by ${hostPlayer.username} as ${assignedColor}`);
        return room;
    }
    // Join an existing room
    joinRoom(roomId, playerId, socketId, username) {
        const roomCode = roomId.toUpperCase().trim();
        const internal = this.rooms.get(roomCode);
        if (!internal) {
            return { success: false, message: 'Room not found. Check the room code and try again.' };
        }
        const { room } = internal;
        // Check if player is already registered in this room (reconnection or existing player)
        if (room.white && room.white.id === playerId) {
            room.white.socketId = socketId;
            room.white.connected = true;
            room.white.username = username || room.white.username;
            this.playerToRoom.set(socketId, roomCode);
            return { success: true, room, role: 'w' };
        }
        if (room.black && room.black.id === playerId) {
            room.black.socketId = socketId;
            room.black.connected = true;
            room.black.username = username || room.black.username;
            this.playerToRoom.set(socketId, roomCode);
            return { success: true, room, role: 'b' };
        }
        // New participant: Can join as White if empty, Black if empty, else Spectator
        let role = 'spectator';
        const newPlayer = {
            id: playerId,
            socketId,
            username: username.trim() || 'Anonymous Guest',
            color: 'spectator',
            connected: true,
        };
        if (!room.white) {
            role = 'w';
            newPlayer.color = 'w';
            room.white = newPlayer;
        }
        else if (!room.black) {
            role = 'b';
            newPlayer.color = 'b';
            room.black = newPlayer;
        }
        else {
            role = 'spectator';
            newPlayer.color = 'spectator';
            room.spectators.push(newPlayer);
        }
        this.playerToRoom.set(socketId, roomCode);
        // If both players are now present and status was waiting, start the match!
        if (room.white && room.black && room.status === 'waiting') {
            room.status = 'active';
            internal.lastTickTime = Date.now();
            this.startClockTimer(roomCode);
            console.log(`[RoomManager] Room ${roomCode} match started: ${room.white.username} (W) vs ${room.black.username} (B)`);
        }
        return { success: true, room, role };
    }
    // Handle player reconnection
    handleReconnect(playerId, socketId) {
        for (const [roomId, internal] of this.rooms.entries()) {
            const { room } = internal;
            if (room.white && room.white.id === playerId) {
                room.white.socketId = socketId;
                room.white.connected = true;
                this.playerToRoom.set(socketId, roomId);
                console.log(`[RoomManager] White player ${room.white.username} reconnected to ${roomId}`);
                return { reconnected: true, room, role: 'w' };
            }
            if (room.black && room.black.id === playerId) {
                room.black.socketId = socketId;
                room.black.connected = true;
                this.playerToRoom.set(socketId, roomId);
                console.log(`[RoomManager] Black player ${room.black.username} reconnected to ${roomId}`);
                return { reconnected: true, room, role: 'b' };
            }
            const spectator = room.spectators.find(s => s.id === playerId);
            if (spectator) {
                spectator.socketId = socketId;
                spectator.connected = true;
                this.playerToRoom.set(socketId, roomId);
                return { reconnected: true, room, role: 'spectator' };
            }
        }
        return { reconnected: false };
    }
    // Process a move
    makeMove(socketId, from, to, promotion) {
        const roomId = this.playerToRoom.get(socketId);
        if (!roomId) {
            return { success: false, error: 'Player not in any room' };
        }
        const internal = this.rooms.get(roomId);
        if (!internal) {
            return { success: false, error: 'Room does not exist' };
        }
        const { room, chess } = internal;
        if (room.status !== 'active') {
            return { success: false, error: `Game is not active (${room.status})` };
        }
        // Determine mover color
        let playerColor = null;
        if (room.white && room.white.socketId === socketId) {
            playerColor = 'w';
        }
        else if (room.black && room.black.socketId === socketId) {
            playerColor = 'b';
        }
        else {
            return { success: false, error: 'Spectators cannot make moves' };
        }
        // Authoritative turn check
        if (chess.turn() !== playerColor) {
            return { success: false, error: 'Not your turn' };
        }
        // Try making the move with chess.js
        try {
            const moveResult = chess.move({
                from: from,
                to: to,
                promotion: (promotion || 'q'),
            });
            if (!moveResult) {
                return { success: false, error: 'Illegal move' };
            }
            // Add time increment to the player who just moved
            if (room.timeControl.incrementSeconds > 0) {
                room.clocks[playerColor] += room.timeControl.incrementSeconds * 1000;
            }
            // Update room state
            room.fen = chess.fen();
            room.pgn = chess.pgn();
            room.turn = chess.turn();
            room.isCheck = chess.inCheck();
            room.lastMove = { from, to };
            room.lastMoveTimestamp = Date.now();
            internal.lastTickTime = Date.now();
            const historyItem = {
                san: moveResult.san,
                from: moveResult.from,
                to: moveResult.to,
                color: moveResult.color,
                piece: moveResult.piece,
                captured: moveResult.captured,
                promotion: moveResult.promotion,
                fen: room.fen,
                clockRemainingWhite: room.clocks.w,
                clockRemainingBlack: room.clocks.b,
            };
            room.history.push(historyItem);
            // Check game over conditions
            if (chess.isCheckmate()) {
                room.status = 'checkmate';
                room.winner = playerColor;
                room.winnerReason = `Checkmate - ${playerColor === 'w' ? room.white?.username : room.black?.username} wins!`;
                this.stopClockTimer(roomId);
                this.saveCompletedGame(room);
            }
            else if (chess.isStalemate()) {
                room.status = 'stalemate';
                room.winner = 'draw';
                room.winnerReason = 'Stalemate - Draw';
                this.stopClockTimer(roomId);
                this.saveCompletedGame(room);
            }
            else if (chess.isThreefoldRepetition()) {
                room.status = 'draw_repetition';
                room.winner = 'draw';
                room.winnerReason = 'Draw by threefold repetition';
                this.stopClockTimer(roomId);
                this.saveCompletedGame(room);
            }
            else if (chess.isInsufficientMaterial()) {
                room.status = 'draw_insufficient';
                room.winner = 'draw';
                room.winnerReason = 'Draw by insufficient material';
                this.stopClockTimer(roomId);
                this.saveCompletedGame(room);
            }
            else if (chess.isDraw()) {
                room.status = 'draw_50move';
                room.winner = 'draw';
                room.winnerReason = 'Draw by 50-move rule';
                this.stopClockTimer(roomId);
                this.saveCompletedGame(room);
            }
            // Broadcast move event
            this.io.to(roomId).emit('move_made', {
                move: historyItem,
                room: this.sanitizeRoom(room),
            });
            if (room.status !== 'active') {
                this.io.to(roomId).emit('game_over', {
                    status: room.status,
                    winner: room.winner,
                    reason: room.winnerReason,
                    room: this.sanitizeRoom(room),
                });
            }
            return { success: true, move: moveResult };
        }
        catch (err) {
            console.error('[RoomManager] Move error:', err);
            return { success: false, error: err.message || 'Illegal move' };
        }
    }
    // Resign game
    resign(socketId) {
        const roomId = this.playerToRoom.get(socketId);
        if (!roomId)
            return { success: false, error: 'Not in a room' };
        const internal = this.rooms.get(roomId);
        if (!internal)
            return { success: false, error: 'Room not found' };
        const { room } = internal;
        if (room.status !== 'active')
            return { success: false, error: 'Game not active' };
        let resigningColor = null;
        let winnerColor = null;
        let resigningUsername = '';
        if (room.white && room.white.socketId === socketId) {
            resigningColor = 'w';
            winnerColor = 'b';
            resigningUsername = room.white.username;
        }
        else if (room.black && room.black.socketId === socketId) {
            resigningColor = 'b';
            winnerColor = 'w';
            resigningUsername = room.black.username;
        }
        else {
            return { success: false, error: 'Only players can resign' };
        }
        room.status = 'resigned';
        room.winner = winnerColor;
        room.winnerReason = `${resigningUsername} resigned`;
        this.stopClockTimer(roomId);
        this.saveCompletedGame(room);
        this.io.to(roomId).emit('game_over', {
            status: room.status,
            winner: room.winner,
            reason: room.winnerReason,
            room: this.sanitizeRoom(room),
        });
        return { success: true };
    }
    // Draw offer
    offerDraw(socketId) {
        const roomId = this.playerToRoom.get(socketId);
        if (!roomId)
            return { success: false, error: 'Not in a room' };
        const internal = this.rooms.get(roomId);
        if (!internal)
            return { success: false, error: 'Room not found' };
        const { room } = internal;
        if (room.status !== 'active')
            return { success: false, error: 'Game not active' };
        let offerColor = null;
        if (room.white && room.white.socketId === socketId) {
            offerColor = 'w';
        }
        else if (room.black && room.black.socketId === socketId) {
            offerColor = 'b';
        }
        else {
            return { success: false, error: 'Spectators cannot offer draw' };
        }
        room.drawOfferFrom = offerColor;
        this.io.to(roomId).emit('draw_offered', {
            offeredBy: offerColor,
            room: this.sanitizeRoom(room),
        });
        return { success: true };
    }
    // Respond to draw offer
    respondDraw(socketId, accept) {
        const roomId = this.playerToRoom.get(socketId);
        if (!roomId)
            return { success: false, error: 'Not in a room' };
        const internal = this.rooms.get(roomId);
        if (!internal)
            return { success: false, error: 'Room not found' };
        const { room } = internal;
        if (room.status !== 'active' || !room.drawOfferFrom) {
            return { success: false, error: 'No active draw offer' };
        }
        // Verify respondent is the opposite player
        const responderIsWhite = room.white && room.white.socketId === socketId;
        const responderIsBlack = room.black && room.black.socketId === socketId;
        if (!responderIsWhite && !responderIsBlack) {
            return { success: false, error: 'Spectators cannot respond to draw' };
        }
        const responderColor = responderIsWhite ? 'w' : 'b';
        if (responderColor === room.drawOfferFrom) {
            return { success: false, error: 'Cannot accept your own draw offer' };
        }
        if (accept) {
            room.status = 'draw_agreed';
            room.winner = 'draw';
            room.winnerReason = 'Draw agreed by mutual consent';
            room.drawOfferFrom = null;
            this.stopClockTimer(roomId);
            this.saveCompletedGame(room);
            this.io.to(roomId).emit('game_over', {
                status: room.status,
                winner: room.winner,
                reason: room.winnerReason,
                room: this.sanitizeRoom(room),
            });
        }
        else {
            room.drawOfferFrom = null;
            this.io.to(roomId).emit('draw_declined', {
                declinedBy: responderColor,
                room: this.sanitizeRoom(room),
            });
        }
        return { success: true };
    }
    // Rematch request
    requestRematch(socketId) {
        const roomId = this.playerToRoom.get(socketId);
        if (!roomId)
            return { success: false, error: 'Not in a room' };
        const internal = this.rooms.get(roomId);
        if (!internal)
            return { success: false, error: 'Room not found' };
        const { room } = internal;
        if (room.status === 'active' || room.status === 'waiting') {
            return { success: false, error: 'Cannot rematch while game is active' };
        }
        let requestingColor = null;
        if (room.white && room.white.socketId === socketId)
            requestingColor = 'w';
        else if (room.black && room.black.socketId === socketId)
            requestingColor = 'b';
        else
            return { success: false, error: 'Spectators cannot request rematch' };
        room.rematchOfferFrom = requestingColor;
        this.io.to(roomId).emit('rematch_offered', {
            offeredBy: requestingColor,
            room: this.sanitizeRoom(room),
        });
        return { success: true };
    }
    // Respond to rematch
    respondRematch(socketId, accept) {
        const roomId = this.playerToRoom.get(socketId);
        if (!roomId)
            return { success: false, error: 'Not in a room' };
        const internal = this.rooms.get(roomId);
        if (!internal)
            return { success: false, error: 'Room not found' };
        const { room } = internal;
        if (!room.rematchOfferFrom)
            return { success: false, error: 'No rematch offered' };
        const responderIsWhite = room.white && room.white.socketId === socketId;
        const responderIsBlack = room.black && room.black.socketId === socketId;
        if (!responderIsWhite && !responderIsBlack) {
            return { success: false, error: 'Spectators cannot respond to rematch' };
        }
        const responderColor = responderIsWhite ? 'w' : 'b';
        if (responderColor === room.rematchOfferFrom) {
            return { success: false, error: 'Cannot accept your own rematch offer' };
        }
        if (accept) {
            // Flip colors for fairness in rematch!
            const oldWhite = room.white;
            const oldBlack = room.black;
            if (oldWhite && oldBlack) {
                oldWhite.color = 'b';
                oldBlack.color = 'w';
                room.white = oldBlack;
                room.black = oldWhite;
            }
            // Reset chess engine
            internal.chess = new Chess();
            room.fen = internal.chess.fen();
            room.pgn = internal.chess.pgn();
            room.turn = 'w';
            room.isCheck = false;
            room.history = [];
            room.status = 'active';
            room.winner = null;
            room.winnerReason = null;
            room.lastMove = null;
            room.lastMoveTimestamp = null;
            room.drawOfferFrom = null;
            room.rematchOfferFrom = null;
            room.clocks = {
                w: room.timeControl.initialSeconds * 1000,
                b: room.timeControl.initialSeconds * 1000,
            };
            internal.lastTickTime = Date.now();
            this.startClockTimer(roomId);
            this.io.to(roomId).emit('game_reset', {
                room: this.sanitizeRoom(room),
            });
            console.log(`[RoomManager] Rematch started for ${roomId}: White=${room.white?.username}, Black=${room.black?.username}`);
        }
        else {
            room.rematchOfferFrom = null;
            this.io.to(roomId).emit('rematch_declined', {
                room: this.sanitizeRoom(room),
            });
        }
        return { success: true };
    }
    // Socket disconnected
    handleDisconnect(socketId) {
        const roomId = this.playerToRoom.get(socketId);
        if (!roomId)
            return;
        this.playerToRoom.delete(socketId);
        const internal = this.rooms.get(roomId);
        if (!internal)
            return;
        const { room } = internal;
        if (room.white && room.white.socketId === socketId) {
            room.white.connected = false;
            room.white.disconnectedAt = Date.now();
            console.log(`[RoomManager] White player ${room.white.username} disconnected from ${roomId}`);
        }
        else if (room.black && room.black.socketId === socketId) {
            room.black.connected = false;
            room.black.disconnectedAt = Date.now();
            console.log(`[RoomManager] Black player ${room.black.username} disconnected from ${roomId}`);
        }
        else {
            room.spectators = room.spectators.filter(s => s.socketId !== socketId);
        }
        this.io.to(roomId).emit('player_status_change', {
            room: this.sanitizeRoom(room),
        });
    }
    // High precision timer ticker
    startClockTimer(roomId) {
        this.stopClockTimer(roomId);
        const internal = this.rooms.get(roomId);
        if (!internal)
            return;
        const { room } = internal;
        if (room.timeControl.id === 'unlimited')
            return;
        internal.lastTickTime = Date.now();
        internal.timerInterval = setInterval(() => {
            if (room.status !== 'active') {
                this.stopClockTimer(roomId);
                return;
            }
            const now = Date.now();
            const delta = now - internal.lastTickTime;
            internal.lastTickTime = now;
            const activeColor = room.turn;
            room.clocks[activeColor] = Math.max(0, room.clocks[activeColor] - delta);
            // Check for timeout
            if (room.clocks[activeColor] <= 0) {
                room.clocks[activeColor] = 0;
                this.stopClockTimer(roomId);
                const loserName = activeColor === 'w' ? room.white?.username : room.black?.username;
                const winnerColor = activeColor === 'w' ? 'b' : 'w';
                const winnerName = winnerColor === 'w' ? room.white?.username : room.black?.username;
                room.status = 'timeout';
                room.winner = winnerColor;
                room.winnerReason = `Time out - ${loserName} ran out of time. ${winnerName} wins!`;
                this.saveCompletedGame(room);
                this.io.to(roomId).emit('game_over', {
                    status: room.status,
                    winner: room.winner,
                    reason: room.winnerReason,
                    room: this.sanitizeRoom(room),
                });
                return;
            }
            // Broadcast clock tick every 500ms or 1s to save bandwidth, while keeping sync
            this.io.to(roomId).emit('clock_sync', {
                clocks: room.clocks,
                turn: room.turn,
            });
        }, 250);
    }
    stopClockTimer(roomId) {
        const internal = this.rooms.get(roomId);
        if (internal && internal.timerInterval) {
            clearInterval(internal.timerInterval);
            internal.timerInterval = undefined;
        }
    }
    // Save game to persistent database
    async saveCompletedGame(room) {
        if (!room.winner || room.history.length === 0)
            return;
        const record = {
            id: uuidv4(),
            roomId: room.id,
            date: new Date().toISOString(),
            whiteName: room.white?.username || 'White',
            blackName: room.black?.username || 'Black',
            winner: room.winner,
            reason: room.winnerReason || 'Game ended',
            movesCount: room.history.length,
            timeControlName: room.timeControl.name,
            pgn: room.pgn,
            fen: room.fen,
        };
        await saveGameRecord(record);
    }
    // Get public active/waiting rooms for lobby
    getPublicRooms() {
        const list = [];
        for (const [_, internal] of this.rooms.entries()) {
            const { room } = internal;
            if (room.isPublic) {
                list.push({
                    id: room.id,
                    status: room.status,
                    whiteName: room.white?.username || null,
                    blackName: room.black?.username || null,
                    timeControl: room.timeControl,
                    createdAt: room.createdAt,
                    playersCount: (room.white ? 1 : 0) + (room.black ? 1 : 0),
                    spectatorsCount: room.spectators.length,
                });
            }
        }
        return list.slice(0, 30);
    }
    getRoom(roomId) {
        const internal = this.rooms.get(roomId.toUpperCase().trim());
        return internal ? internal.room : null;
    }
    // Remove sensitive/circular fields for socket broadcast
    sanitizeRoom(room) {
        const { timerInterval, ...rest } = room;
        return rest;
    }
}
