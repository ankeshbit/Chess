import React, { useState } from 'react';
import { GameState } from '../types/chess';
import { Copy, Check, Share2, Clock, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

interface WaitingScreenProps {
  gameState: GameState;
  onCancel: () => void;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({ gameState, onCancel }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `${window.location.origin}/?room=${gameState.roomId}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameState.roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {}
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {}
  };

  return (
    <div className="max-w-lg w-full mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-center animate-fade-in">
      {/* Pulse Beacon */}
      <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping duration-1000" />
        <div className="relative w-16 h-16 rounded-full bg-zinc-800 border-2 border-amber-500 flex items-center justify-center shadow-lg">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Waiting for Opponent</h2>
      <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
        Share the room code or invite link with a friend to begin your real-time 1v1 match.
      </p>

      {/* Room Code Card */}
      <div className="my-6 p-5 bg-zinc-950/80 rounded-2xl border border-zinc-800 flex flex-col items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Room Code</span>
        <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-widest text-amber-400 select-all my-1">
          {gameState.roomId}
        </div>

        <div className="flex gap-2 mt-3 w-full">
          <button
            onClick={copyCode}
            className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition flex items-center justify-center gap-1.5"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={copyLink}
            className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-zinc-950" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
        </div>
      </div>

      {/* Game Details Summary */}
      <div className="grid grid-cols-2 gap-3 text-left mb-6 text-xs">
        <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-800 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <div className="text-zinc-500 text-[10px]">Time Control</div>
            <div className="font-semibold text-zinc-200">{gameState.timeControl.name}</div>
          </div>
        </div>

        <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-800 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="text-zinc-500 text-[10px]">Game Mode</div>
            <div className="font-semibold text-zinc-200">1v1 PvP Real-Time</div>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold border border-zinc-800 transition flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Cancel & Back to Lobby</span>
      </button>
    </div>
  );
};
