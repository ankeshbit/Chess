import React from 'react';
import { Flag, Handshake, RotateCcw, Volume2, VolumeX, Link2, RotateCw } from 'lucide-react';
import { GameStatus } from '../types/chess';

interface GameControlsProps {
  status: GameStatus;
  isPlayer: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onFlipBoard: () => void;
  onOfferDraw: () => void;
  onRequestResign: () => void;
  onCopyRoomLink: () => void;
  onRequestRematch?: () => void;
  hasDrawOffer: boolean;
  hasRematchOffer: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  status,
  isPlayer,
  soundEnabled,
  onToggleSound,
  onFlipBoard,
  onOfferDraw,
  onRequestResign,
  onCopyRoomLink,
  onRequestRematch,
  hasDrawOffer,
  hasRematchOffer,
}) => {
  const isGameActive = status === 'active';
  const isGameOver = status !== 'waiting' && status !== 'active';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg">
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Flip Board */}
        <button
          onClick={onFlipBoard}
          className="p-2 sm:px-3 sm:py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition flex items-center gap-1.5 text-xs font-semibold"
          title="Flip Board View"
        >
          <RotateCw className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">Flip</span>
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          className="p-2 sm:px-3 sm:py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition flex items-center gap-1.5 text-xs font-semibold"
          title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-zinc-500" />
          )}
          <span className="hidden sm:inline">{soundEnabled ? 'Sound' : 'Muted'}</span>
        </button>

        {/* Share Room Link */}
        <button
          onClick={onCopyRoomLink}
          className="p-2 sm:px-3 sm:py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition flex items-center gap-1.5 text-xs font-semibold"
          title="Copy Invitation Link"
        >
          <Link2 className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Match Actions */}
      {isPlayer && isGameActive && (
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Offer Draw */}
          <button
            onClick={onOfferDraw}
            disabled={hasDrawOffer}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              hasDrawOffer
                ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 hover:border-amber-500/50'
            }`}
          >
            <Handshake className="w-4 h-4 text-amber-400" />
            <span>{hasDrawOffer ? 'Draw Offered' : 'Offer Draw'}</span>
          </button>

          {/* Resign */}
          <button
            onClick={onRequestResign}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 hover:border-rose-600 transition flex items-center gap-1.5 shadow-sm"
          >
            <Flag className="w-4 h-4 text-rose-400" />
            <span>Resign</span>
          </button>
        </div>
      )}

      {/* Rematch button when Game Over */}
      {isPlayer && isGameOver && onRequestRematch && (
        <button
          onClick={onRequestRematch}
          disabled={hasRematchOffer}
          className={`px-4 py-2 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 shadow-md ${
            hasRematchOffer
              ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 transform hover:scale-105 active:scale-95'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>{hasRematchOffer ? 'Rematch Pending...' : 'Request Rematch'}</span>
        </button>
      )}
    </div>
  );
};
