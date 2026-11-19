import React, { useState, useEffect } from 'react';
import { GameRecord } from '../types/chess';
import { Trophy, Clock, X, Copy, Check, Calendar, ChevronRight } from 'lucide-react';
import { getServerUrl } from '../services/config';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const SERVER_URL = getServerUrl();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`${SERVER_URL}/api/games`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setGames(data);
        })
        .catch((err) => console.error('Failed to fetch history:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyPgn = async (pgn: string, id: string) => {
    try {
      await navigator.clipboard.writeText(pgn);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-zinc-100">Match Archives & History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Loading game archives...</div>
          ) : games.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm italic">
              No completed games recorded yet. Play a match to build your archive!
            </div>
          ) : (
            games.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-sm text-zinc-100">
                      {g.whiteName} (W) vs {g.blackName} (B)
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        g.winner === 'w'
                          ? 'bg-amber-500/20 text-amber-400'
                          : g.winner === 'b'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {g.winner === 'w' ? 'White Won' : g.winner === 'b' ? 'Black Won' : 'Draw'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <span className="text-zinc-300 font-medium">{g.reason}</span>
                    <span>•</span>
                    <span>{g.movesCount} moves</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" /> {g.timeControlName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {new Date(g.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => copyPgn(g.pgn, g.id)}
                    className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition flex items-center gap-1.5"
                    title="Copy PGN notation"
                  >
                    {copiedId === g.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === g.id ? 'Copied' : 'PGN'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
