import { io, Socket } from 'socket.io-client';

// Generate or retrieve persistent playerId
export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem('chess_pvp_player_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('chess_pvp_player_id', id);
  }
  return id;
}

// Generate or retrieve saved username
export function getSavedUsername(): string {
  let name = localStorage.getItem('chess_pvp_username');
  if (!name) {
    name = 'Player ' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('chess_pvp_username', name);
  }
  return name;
}

export function saveUsername(name: string) {
  localStorage.setItem('chess_pvp_username', name.trim());
}

// Socket connection
const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
