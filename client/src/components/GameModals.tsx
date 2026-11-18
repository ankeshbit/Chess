import React, { useEffect } from 'react';
import { GameStatus, PieceColor, GameState } from '../types/chess';
import confetti from 'canvas-confetti';
import { Trophy, Handshake, Flag, RotateCcw, Home, Copy, Check } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  gameState: GameState;
  myColor: PieceColor | 'spectator';
  onRematch: () => void;
  onLeaveRoom: () => void;
  onCopyPgn: () => void;
  hasCopiedPgn: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  gameState,
  myColor,
  onRematch,
  onLeaveRoom,
  onCopyPgn,
  hasCopiedPgn,
}) => {
  useEffect(() => {
    if (isOpen && gameState.winner && gameState.winner !== 'draw' && gameState.winner === myColor) {
      // Trigger victory confetti!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [isOpen, gameState.winner, myColor]);

  if (!isOpen) return null;

  const isWin = gameState.winner === myColor;
  const isDraw = gameState.winner === 'draw';
  const isLoss = !isDraw && !isWin && myColor !== 'spectator';

  let title = 'Game Over';
  let badgeColor = 'bg-zinc-800 text-zinc-300 border-zinc-700';

  if (myColor === 'spectator') {
    title = gameState.winner === 'draw' ? 'Draw' : `${gameState.winner === 'w' ? 'White' : 'Black'} Wins!`;
  } else if (isWin) {
    title = 'Victory!';
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/50';
  } else if (isLoss) {
    title = 'Defeat';
    badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/50';
  } else if (isDraw) {
    title = 'Draw';
    badgeColor = 'bg-sky-500/20 text-sky-400 border-sky-500/50';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
        {/* Icon Header */}
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4 shadow-inner">
          {isWin ? (
            <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
          ) : isDraw ? (
            <Handshake className="w-8 h-8 text-sky-400" />
          ) : (
            <Flag className="w-8 h-8 text-rose-400" />
          )}
        </div>

        <h2 className="text-2xl font-extrabold text-zinc-100">{title}</h2>
        <div className={`inline-block px-3 py-1 mt-2 text-xs font-semibold rounded-full border ${badgeColor}`}>
          {gameState.winnerReason || 'Game concluded'}
        </div>

        {/* Players summary */}
        <div className="my-5 p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-around text-xs">
          <div className="text-center">
            <span className="text-zinc-500 block mb-0.5">White</span>
            <span className="font-bold text-zinc-200">{gameState.whitePlayer?.username || 'White'}</span>
            {gameState.winner === 'w' && <span className="block text-[10px] text-amber-400 font-bold mt-0.5">Winner</span>}
          </div>
          <div className="text-zinc-600 font-bold font-mono">VS</div>
          <div className="text-center">
            <span className="text-zinc-500 block mb-0.5">Black</span>
            <span className="font-bold text-zinc-200">{gameState.blackPlayer?.username || 'Black'}</span>
            {gameState.winner === 'b' && <span className="block text-[10px] text-amber-400 font-bold mt-0.5">Winner</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mt-4">
          {myColor !== 'spectator' && (
            <button
              onClick={onRematch}
              disabled={gameState.rematchOfferFrom === myColor}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {gameState.rematchOfferFrom === myColor ? 'Rematch Requested...' : 'Request Rematch'}
              </span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCopyPgn}
              className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition flex items-center justify-center gap-1.5"
            >
              {hasCopiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopiedPgn ? 'Copied PGN' : 'Export PGN'}</span>
            </button>

            <button
              onClick={onLeaveRoom}
              className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5 text-zinc-400" />
              <span>Back to Lobby</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DrawOfferModalProps {
  isOpen: boolean;
  offeredByColor: PieceColor;
  onAccept: () => void;
  onDecline: () => void;
}

export const DrawOfferModal: React.FC<DrawOfferModalProps> = ({ isOpen, offeredByColor, onAccept, onDecline }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
          <Handshake className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-100">Draw Offered</h3>
        <p className="text-xs text-zinc-400 mt-1 mb-5">
          Your opponent has offered a draw. Would you like to accept?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs border border-zinc-700 transition"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
          >
            Accept Draw
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResignModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResignModal: React.FC<ResignModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
          <Flag className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-100">Resign Game?</h3>
        <p className="text-xs text-zinc-400 mt-1 mb-5">
          Are you sure you want to forfeit this match? Your opponent will be awarded the victory.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs border border-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition"
          >
            Confirm Resign
          </button>
        </div>
      </div>
    </div>
  );
};
