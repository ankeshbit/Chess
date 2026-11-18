import React from 'react';
import { PieceColor, PieceType, PlayerInfo } from '../types/chess';
import { formatTimeRemaining } from '../utils/chessUtils';
import { ChessPiece } from './ChessPiece';
import { Wifi, WifiOff, User } from 'lucide-react';

interface PlayerCardProps {
  player: PlayerInfo | null;
  assignedColor: PieceColor;
  isTurn: boolean;
  clockMs: number;
  isUnlimitedTime: boolean;
  capturedPieces: PieceType[];
  materialAdvantage: number;
  isMe: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  assignedColor,
  isTurn,
  clockMs,
  isUnlimitedTime,
  capturedPieces,
  materialAdvantage,
  isMe,
}) => {
  const isLowTime = !isUnlimitedTime && clockMs < 30000;
  const isCriticalTime = !isUnlimitedTime && clockMs < 10000;

  return (
    <div
      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all duration-200 border ${
        isTurn
          ? 'bg-zinc-800/90 border-amber-500/60 shadow-lg shadow-amber-500/10'
          : 'bg-zinc-900/80 border-zinc-800'
      }`}
    >
      {/* Player info & captured */}
      <div className="flex items-center gap-3">
        {/* Color Badge / Avatar */}
        <div className="relative">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border font-bold text-sm shadow-inner ${
              assignedColor === 'w'
                ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                : 'bg-zinc-950 text-zinc-100 border-zinc-700'
            }`}
          >
            {player ? (
              <span className="capitalize">{player.username.charAt(0)}</span>
            ) : (
              <User className="w-5 h-5 text-zinc-500" />
            )}
          </div>
          {/* Connection status indicator */}
          <div
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 flex items-center justify-center ${
              !player
                ? 'bg-zinc-600'
                : player.connected
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-rose-500'
            }`}
            title={!player ? 'Empty slot' : player.connected ? 'Online' : 'Disconnected'}
          />
        </div>

        {/* Name and Captured pieces */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm sm:text-base text-zinc-100 truncate max-w-[140px] sm:max-w-[200px]">
              {player ? player.username : 'Waiting for player...'}
            </span>
            {isMe && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-amber-500/30">
                You
              </span>
            )}
            {player && !player.connected && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800 flex items-center gap-1">
                <WifiOff className="w-2.5 h-2.5" /> Reconnecting...
              </span>
            )}
          </div>

          {/* Captured pieces display */}
          <div className="flex items-center gap-1 mt-1 min-h-[18px]">
            {capturedPieces.map((p, idx) => (
              <div key={idx} className="w-4 h-4 -mr-1">
                <ChessPiece type={p} color={assignedColor === 'w' ? 'b' : 'w'} />
              </div>
            ))}
            {materialAdvantage > 0 && (
              <span className="text-[11px] font-bold text-zinc-400 ml-1.5">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clock Display */}
      <div
        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-mono font-bold text-base sm:text-lg tracking-tight border transition-colors ${
          isTurn
            ? isCriticalTime
              ? 'bg-rose-950/90 text-rose-300 border-rose-600 animate-pulse'
              : isLowTime
              ? 'bg-amber-950/80 text-amber-300 border-amber-600'
              : 'bg-zinc-800 text-zinc-100 border-zinc-700'
            : 'bg-zinc-950/60 text-zinc-400 border-zinc-800/80'
        }`}
      >
        {formatTimeRemaining(clockMs, isUnlimitedTime)}
      </div>
    </div>
  );
};
