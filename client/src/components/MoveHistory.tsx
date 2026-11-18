import React, { useRef, useEffect, useState } from 'react';
import { MoveHistoryItem } from '../types/chess';
import { Copy, Check, FileText, Share2 } from 'lucide-react';

interface MoveHistoryProps {
  history: MoveHistoryItem[];
  currentFen: string;
  pgn: string;
  onSelectMove?: (fen: string) => void;
  selectedFen?: string;
  onLiveReturn?: () => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  history,
  currentFen,
  pgn,
  onSelectMove,
  selectedFen,
  onLiveReturn,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);

  // Group moves into pairs (White move, Black move)
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      turnNum: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] || null,
    });
  }

  // Auto-scroll when new moves arrive
  useEffect(() => {
    if (containerRef.current && !selectedFen) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history.length, selectedFen]);

  const copyToClipboard = async (text: string, type: 'pgn' | 'fen') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'pgn') {
        setCopiedPgn(true);
        setTimeout(() => setCopiedPgn(false), 2000);
      } else {
        setCopiedFen(true);
        setTimeout(() => setCopiedFen(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col h-full max-h-[420px] lg:max-h-[580px] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-zinc-100">Move History</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            {history.length}
          </span>
        </div>

        {selectedFen && onLiveReturn && (
          <button
            onClick={onLiveReturn}
            className="text-xs font-semibold px-2 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded transition duration-150 animate-pulse"
          >
            Return to Live
          </button>
        )}
      </div>

      {/* Moves List Table */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs sm:text-sm font-mono">
        {movePairs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 italic p-6 text-center">
            Moves will appear here once the match begins...
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.turnNum}
              className="flex items-center rounded hover:bg-zinc-800/50 transition-colors px-2 py-1"
            >
              <span className="w-9 text-zinc-500 select-none">{pair.turnNum}.</span>

              {/* White move */}
              <button
                onClick={() => onSelectMove && onSelectMove(pair.white.fen)}
                className={`flex-1 text-left px-2 py-0.5 rounded font-semibold transition ${
                  selectedFen === pair.white.fen
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-zinc-200 hover:bg-zinc-700/60'
                }`}
              >
                {pair.white.san}
              </button>

              {/* Black move */}
              {pair.black ? (
                <button
                  onClick={() => onSelectMove && onSelectMove(pair.black!.fen)}
                  className={`flex-1 text-left px-2 py-0.5 rounded font-semibold transition ${
                    selectedFen === pair.black.fen
                      ? 'bg-amber-500/20 text-amber-300 font-bold'
                      : 'text-zinc-200 hover:bg-zinc-700/60'
                  }`}
                >
                  {pair.black.san}
                </button>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Export Toolbar */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-2 text-xs">
        <button
          onClick={() => copyToClipboard(pgn || 'No moves yet', 'pgn')}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
          title="Copy PGN (Portable Game Notation)"
        >
          {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedPgn ? 'Copied PGN' : 'Export PGN'}</span>
        </button>

        <button
          onClick={() => copyToClipboard(selectedFen || currentFen, 'fen')}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
          title="Copy FEN string"
        >
          {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copiedFen ? 'Copied FEN' : 'Export FEN'}</span>
        </button>
      </div>
    </div>
  );
};
