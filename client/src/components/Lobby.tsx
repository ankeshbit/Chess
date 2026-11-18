import React, { useState, useEffect } from 'react';
import { TimeControlId, TIME_CONTROLS } from '../types/chess';
import { getSavedUsername, saveUsername } from '../services/socket';
import {
  Swords,
  Clock,
  Play,
  KeyRound,
  User,
  Check,
  RefreshCw,
  Trophy,
  Users,
  Shuffle,
  Shield,
  Zap,
} from 'lucide-react';

interface LobbyProps {
  onCreateRoom: (timeControl: TimeControlId, preferredColor: 'random' | 'w' | 'b') => void;
  onJoinRoom: (roomId: string) => void;
  onOpenHistory: () => void;
  error?: string | null;
  onClearError?: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  onOpenHistory,
  error,
  onClearError,
}) => {
  const [username, setUsername] = useState(getSavedUsername());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(username);

  const [selectedTc, setSelectedTc] = useState<TimeControlId>('10m');
  const [selectedColor, setSelectedColor] = useState<'random' | 'w' | 'b'>('random');
  const [joinCode, setJoinCode] = useState('');

  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await fetch(`${SERVER_URL}/api/rooms`);
      if (res.ok) {
        const data = await res.json();
        setPublicRooms(data);
      }
    } catch (err) {
      // quiet fail
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (tempName.trim()) {
      saveUsername(tempName.trim());
      setUsername(tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length >= 4) {
      onJoinRoom(joinCode.trim());
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in space-y-6 sm:space-y-8">
      {/* Top Navbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20">
            <Swords className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-100">GRANDMASTER</h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-wider uppercase border border-amber-500/30">
                1v1 PvP
              </span>
            </div>
            <p className="text-xs text-zinc-400">Strictly Real-Time Multiplayer Chess</p>
          </div>
        </div>

        {/* Username & History button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* User profile pill */}
          <div className="flex items-center gap-2 bg-zinc-800/90 border border-zinc-700 rounded-xl px-3 py-1.5">
            <User className="w-4 h-4 text-amber-500" />
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={18}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 w-28"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 bg-amber-500 text-zinc-950 rounded hover:bg-amber-400 transition"
                >
                  <Check className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setTempName(username);
                  setIsEditingName(true);
                }}
                className="text-xs font-semibold text-zinc-200 hover:text-amber-400 transition truncate max-w-[120px]"
                title="Click to change your username"
              >
                {username}
              </button>
            )}
          </div>

          <button
            onClick={onOpenHistory}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            title="View Match Archives"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Archives</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs sm:text-sm flex items-center justify-between shadow-lg">
          <span>{error}</span>
          {onClearError && (
            <button onClick={onClearError} className="underline text-xs hover:text-rose-100">
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Create Room & Join Room */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Create Room Card */}
        <div className="md:col-span-7 p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h2 className="text-lg font-bold text-zinc-100">Create New Match</h2>
              </div>
              <span className="text-xs text-zinc-500 font-medium">Custom 1v1 Room</span>
            </div>

            {/* Time Control Options */}
            <div className="space-y-2 mb-5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Select Time Control
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(TIME_CONTROLS) as TimeControlId[]).map((tcId) => {
                  const tc = TIME_CONTROLS[tcId];
                  const isSelected = selectedTc === tcId;
                  return (
                    <button
                      key={tcId}
                      type="button"
                      onClick={() => setSelectedTc(tcId)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-zinc-800/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{tc.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{tc.category}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Side preference */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-amber-500" /> Starting Color
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedColor('random')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedColor === 'random'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-zinc-800/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" /> Random
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedColor('w')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedColor === 'w'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-zinc-800/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400" /> White
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedColor('b')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedColor === 'b'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-zinc-800/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-600" /> Black
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => onCreateRoom(selectedTc, selectedColor)}
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm tracking-wide transition shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-zinc-950" />
            <span>CREATE ROOM & INVITE OPPONENT</span>
          </button>
        </div>

        {/* Right Column: Join Room & Waiting List */}
        <div className="md:col-span-5 flex flex-col gap-6">
          {/* Join by Code Card */}
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-zinc-100">Join Match</h2>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Enter the 6-character room code shared by your opponent.
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. 7X3K9Q"
                  maxLength={6}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 font-mono font-bold text-center text-lg text-amber-400 tracking-widest uppercase focus:outline-none focus:border-amber-500 transition placeholder:text-zinc-600"
                />
              </div>

              <button
                type="submit"
                disabled={joinCode.trim().length < 4}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 font-bold text-xs uppercase tracking-wider border border-zinc-700 hover:border-zinc-500 transition flex items-center justify-center gap-2"
              >
                <span>ENTER ROOM</span>
              </button>
            </form>
          </div>

          {/* Public Waiting Rooms */}
          <div className="flex-1 p-5 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">Open Matches</h3>
              </div>
              <button
                onClick={fetchRooms}
                disabled={loadingRooms}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition"
                title="Refresh rooms"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-48 text-xs">
              {publicRooms.filter((r) => r.status === 'waiting').length === 0 ? (
                <div className="py-6 text-center text-zinc-500 italic">
                  No open matches waiting. Create one above to host!
                </div>
              ) : (
                publicRooms
                  .filter((r) => r.status === 'waiting')
                  .map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-zinc-200">
                          {r.whiteName || r.blackName || 'Host'}
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <span>{r.timeControl.name}</span>
                          <span>•</span>
                          <span className="font-mono text-amber-500/80">#{r.id}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onJoinRoom(r.id)}
                        className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition"
                      >
                        Play
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
