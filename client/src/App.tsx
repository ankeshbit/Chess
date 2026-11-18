import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import {
  ChatMessage,
  GameState,
  MoveHistoryItem,
  PieceColor,
  PieceType,
  TIME_CONTROLS,
  TimeControlId,
} from './types/chess';
import { socket, getOrCreatePlayerId, getSavedUsername } from './services/socket';
import { sounds } from './utils/sound';
import { computeCapturedPieces } from './utils/chessUtils';

import { Chessboard } from './components/Chessboard';
import { PlayerCard } from './components/PlayerCard';
import { MoveHistory } from './components/MoveHistory';
import { GameControls } from './components/GameControls';
import { ChatBox } from './components/ChatBox';
import { GameOverModal, DrawOfferModal, ResignModal } from './components/GameModals';
import { Lobby } from './components/Lobby';
import { WaitingScreen } from './components/WaitingScreen';
import { HistoryModal } from './components/HistoryModal';
import { Swords, Eye, RotateCw, Volume2, VolumeX, ArrowLeft, Monitor } from 'lucide-react';

export const App: React.FC = () => {
  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const [username, setUsername] = useState(getSavedUsername());

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<'w' | 'b' | 'spectator'>('spectator');
  const [manualFlipped, setManualFlipped] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Offline chess engine instance & timers
  const offlineChessRef = useRef<Chess | null>(null);
  const offlineTimerRef = useRef<any>(null);
  const lastTickTimeRef = useRef<number>(Date.now());

  // Reviewing a past board state
  const [previewFen, setPreviewFen] = useState<string | null>(null);

  // Modals and dialog states
  const [showResignModal, setShowResignModal] = useState(false);
  const [showDrawOfferModal, setShowDrawOfferModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [hasCopiedPgn, setHasCopiedPgn] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Sound sync
  useEffect(() => {
    sounds.enabled = soundEnabled;
  }, [soundEnabled]);

  // Initial auto-connect and URL room handling
  useEffect(() => {
    // Check if URL has ?room=XYZ
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      const code = roomParam.toUpperCase().trim();
      socket.emit(
        'join_room',
        {
          roomId: code,
          playerId,
          username: getSavedUsername(),
        },
        (res: any) => {
          if (res?.success) {
            setGameState(res.room);
            setMyRole(res.role);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setLobbyError(res?.error || 'Room not found or cannot join');
          }
        }
      );
    } else {
      socket.emit('reconnect_player', { playerId }, (res: any) => {
        if (res?.reconnected && res.room) {
          setGameState(res.room);
          setMyRole(res.role);
        }
      });
    }
  }, [playerId]);

  // Socket event listeners for online play
  useEffect(() => {
    socket.on('room_created', (data: { room: GameState }) => {
      setGameState(data.room);
      setPreviewFen(null);
      if (data.room.whitePlayer?.id === playerId) setMyRole('w');
      else if (data.room.blackPlayer?.id === playerId) setMyRole('b');
      else setMyRole('spectator');
    });

    socket.on('room_joined', (data: { room: GameState; role: 'w' | 'b' | 'spectator' }) => {
      setGameState(data.room);
      setMyRole(data.role);
      setPreviewFen(null);
      if (data.room.status === 'active') {
        sounds.playGameStart();
      }
    });

    socket.on('player_joined', (data: { room: GameState }) => {
      setGameState(data.room);
      if (data.room.status === 'active') {
        sounds.playGameStart();
      }
    });

    socket.on('move_made', (data: { move: any; room: GameState }) => {
      setGameState(data.room);
      setPreviewFen(null);

      const move = data.move;
      if (data.room.isCheck) {
        sounds.playCheck();
      } else if (move.captured) {
        sounds.playCapture();
      } else if (move.san === 'O-O' || move.san === 'O-O-O') {
        sounds.playCastle();
      } else {
        sounds.playMove();
      }
    });

    socket.on('clock_sync', (data: { clocks: { w: number; b: number }; turn: PieceColor }) => {
      setGameState((prev) => {
        if (!prev || prev.isOffline) return prev;
        return {
          ...prev,
          clocks: data.clocks,
          turn: data.turn,
        };
      });
    });

    socket.on('game_over', (data: { status: any; winner: any; reason: string; room: GameState }) => {
      setGameState(data.room);
      setShowGameOverModal(true);
      setShowDrawOfferModal(false);
      setShowResignModal(false);

      if (data.winner === myRole) {
        sounds.playGameEnd(true);
      } else if (data.winner === 'draw') {
        sounds.playMove();
      } else {
        sounds.playGameEnd(false);
      }
    });

    socket.on('draw_offered', (data: { offeredBy: PieceColor; room: GameState }) => {
      setGameState(data.room);
      if (data.offeredBy !== myRole && myRole !== 'spectator') {
        setShowDrawOfferModal(true);
      }
    });

    socket.on('draw_declined', (data: { room: GameState }) => {
      setGameState(data.room);
      setShowDrawOfferModal(false);
    });

    socket.on('rematch_offered', (data: { offeredBy: PieceColor; room: GameState }) => {
      setGameState(data.room);
    });

    socket.on('rematch_declined', (data: { room: GameState }) => {
      setGameState(data.room);
    });

    socket.on('game_reset', (data: { room: GameState }) => {
      setGameState(data.room);
      setShowGameOverModal(false);
      setShowDrawOfferModal(false);
      setShowResignModal(false);
      setPreviewFen(null);

      if (data.room.whitePlayer?.id === playerId) setMyRole('w');
      else if (data.room.blackPlayer?.id === playerId) setMyRole('b');
      else setMyRole('spectator');

      sounds.playGameStart();
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('player_status_change', (data: { room: GameState }) => {
      setGameState(data.room);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('player_joined');
      socket.off('move_made');
      socket.off('clock_sync');
      socket.off('game_over');
      socket.off('draw_offered');
      socket.off('draw_declined');
      socket.off('rematch_offered');
      socket.off('rematch_declined');
      socket.off('game_reset');
      socket.off('chat_message');
      socket.off('player_status_change');
    };
  }, [playerId, myRole]);

  // Offline clock timer ticker
  useEffect(() => {
    if (gameState?.isOffline && gameState.status === 'active' && gameState.timeControl.id !== 'unlimited') {
      lastTickTimeRef.current = Date.now();
      offlineTimerRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickTimeRef.current;
        lastTickTimeRef.current = now;

        setGameState((prev) => {
          if (!prev || !prev.isOffline || prev.status !== 'active') return prev;
          const currentTurn = prev.turn;
          const newClock = Math.max(0, prev.clocks[currentTurn] - delta);

          if (newClock <= 0) {
            clearInterval(offlineTimerRef.current);
            const winnerColor: PieceColor = currentTurn === 'w' ? 'b' : 'w';
            const winnerName = winnerColor === 'w' ? prev.whitePlayer?.username : prev.blackPlayer?.username;
            const loserName = currentTurn === 'w' ? prev.whitePlayer?.username : prev.blackPlayer?.username;

            sounds.playGameEnd(true);
            setShowGameOverModal(true);

            return {
              ...prev,
              status: 'timeout',
              winner: winnerColor,
              winnerReason: `Time out - ${loserName} ran out of time. ${winnerName} wins!`,
              clocks: {
                ...prev.clocks,
                [currentTurn]: 0,
              },
            };
          }

          return {
            ...prev,
            clocks: {
              ...prev.clocks,
              [currentTurn]: newClock,
            },
          };
        });
      }, 100);
    } else {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
      }
    }

    return () => {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
      }
    };
  }, [gameState?.isOffline, gameState?.status, gameState?.timeControl?.id]);

  // Handlers for Lobby
  const handleCreateRoom = (timeControlId: TimeControlId, preferredColor: 'random' | 'w' | 'b') => {
    setLobbyError(null);
    socket.emit(
      'create_room',
      {
        playerId,
        username: getSavedUsername(),
        timeControlId,
        preferredColor,
      },
      (res: any) => {
        if (res?.success) {
          setGameState(res.room);
          if (res.room.whitePlayer?.id === playerId) setMyRole('w');
          else setMyRole('b');
        } else {
          setLobbyError(res?.error || 'Failed to create room');
        }
      }
    );
  };

  const handleJoinRoom = (code: string) => {
    setLobbyError(null);
    socket.emit(
      'join_room',
      {
        roomId: code.toUpperCase().trim(),
        playerId,
        username: getSavedUsername(),
      },
      (res: any) => {
        if (res?.success) {
          setGameState(res.room);
          setMyRole(res.role);
        } else {
          setLobbyError(res?.error || 'Room not found or cannot join');
        }
      }
    );
  };

  // Start Local 1v1 Offline Match (Pass & Play)
  const handleStartOfflineMatch = (
    whiteName: string,
    blackName: string,
    timeControlId: TimeControlId,
    autoFlip: boolean
  ) => {
    const chess = new Chess();
    offlineChessRef.current = chess;
    const tc = TIME_CONTROLS[timeControlId];

    const initialClocks = {
      w: tc.initialSeconds * 1000,
      b: tc.initialSeconds * 1000,
    };

    const offlineState: GameState = {
      roomId: 'LOCAL_PASS_PLAY',
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: 'w',
      isCheck: false,
      history: [],
      status: 'active',
      winner: null,
      winnerReason: null,
      timeControl: tc,
      clocks: initialClocks,
      lastMove: null,
      whitePlayer: {
        id: 'p_white_local',
        username: whiteName,
        color: 'w',
        connected: true,
      },
      blackPlayer: {
        id: 'p_black_local',
        username: blackName,
        color: 'b',
        connected: true,
      },
      spectators: [],
      drawOfferFrom: null,
      rematchOfferFrom: null,
      createdAt: Date.now(),
      isOffline: true,
      autoFlipBoard: autoFlip,
    };

    setGameState(offlineState);
    setMyRole('w'); // in offline mode, both players play locally
    setManualFlipped(false);
    setPreviewFen(null);
    sounds.playGameStart();
  };

  // Move handler (handles both online and local offline)
  const handleMove = (from: string, to: string, promotion?: PieceType) => {
    if (!gameState || gameState.status !== 'active') return;

    if (gameState.isOffline) {
      // Local Pass & Play move logic
      const chess = offlineChessRef.current;
      if (!chess) return;

      try {
        const currentTurn = chess.turn();
        const moveResult = chess.move({
          from: from as Square,
          to: to as Square,
          promotion: (promotion || 'q') as any,
        });

        if (!moveResult) {
          sounds.playIllegal();
          return;
        }

        // Add increment
        const updatedClocks = { ...gameState.clocks };
        if (gameState.timeControl.incrementSeconds > 0) {
          updatedClocks[currentTurn] += gameState.timeControl.incrementSeconds * 1000;
        }

        const newFen = chess.fen();
        const isCheck = chess.inCheck();
        let newStatus: import('./types/chess').GameStatus = gameState.status;
        let winner = gameState.winner;
        let winnerReason = gameState.winnerReason;

        const historyItem: MoveHistoryItem = {
          san: moveResult.san,
          from: moveResult.from,
          to: moveResult.to,
          color: moveResult.color,
          piece: moveResult.piece,
          captured: moveResult.captured,
          promotion: moveResult.promotion,
          fen: newFen,
          clockRemainingWhite: updatedClocks.w,
          clockRemainingBlack: updatedClocks.b,
        };

        if (chess.isCheckmate()) {
          newStatus = 'checkmate';
          winner = currentTurn;
          winnerReason = `Checkmate - ${currentTurn === 'w' ? gameState.whitePlayer?.username : gameState.blackPlayer?.username} wins!`;
          sounds.playGameEnd(true);
          setShowGameOverModal(true);
        } else if (chess.isStalemate()) {
          newStatus = 'stalemate';
          winner = 'draw';
          winnerReason = 'Stalemate - Draw';
          sounds.playMove();
          setShowGameOverModal(true);
        } else if (chess.isThreefoldRepetition()) {
          newStatus = 'draw_repetition';
          winner = 'draw';
          winnerReason = 'Draw by threefold repetition';
          sounds.playMove();
          setShowGameOverModal(true);
        } else if (chess.isInsufficientMaterial()) {
          newStatus = 'draw_insufficient';
          winner = 'draw';
          winnerReason = 'Draw by insufficient material';
          sounds.playMove();
          setShowGameOverModal(true);
        } else if (chess.isDraw()) {
          newStatus = 'draw_50move';
          winner = 'draw';
          winnerReason = 'Draw by 50-move rule';
          sounds.playMove();
          setShowGameOverModal(true);
        } else {
          // Play sound
          if (isCheck) sounds.playCheck();
          else if (moveResult.captured) sounds.playCapture();
          else if (moveResult.san === 'O-O' || moveResult.san === 'O-O-O') sounds.playCastle();
          else sounds.playMove();
        }

        lastTickTimeRef.current = Date.now();

        setGameState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            fen: newFen,
            pgn: chess.pgn(),
            turn: chess.turn(),
            isCheck,
            clocks: updatedClocks,
            status: newStatus,
            winner,
            winnerReason,
            lastMove: { from, to },
            history: [...prev.history, historyItem],
          };
        });
      } catch (err) {
        sounds.playIllegal();
      }
    } else {
      // Online socket move
      socket.emit('make_move', { from, to, promotion }, (res: any) => {
        if (!res?.success) {
          sounds.playIllegal();
        }
      });
    }
  };

  const handleOfferDraw = () => {
    if (gameState?.isOffline) {
      // Local draw agreement
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'draw_agreed',
          winner: 'draw',
          winnerReason: 'Draw agreed by mutual consent',
        };
      });
      setShowGameOverModal(true);
    } else {
      socket.emit('offer_draw');
    }
  };

  const handleAcceptDraw = () => {
    socket.emit('respond_draw', { accept: true });
    setShowDrawOfferModal(false);
  };

  const handleDeclineDraw = () => {
    socket.emit('respond_draw', { accept: false });
    setShowDrawOfferModal(false);
  };

  const handleConfirmResign = () => {
    if (gameState?.isOffline) {
      // Resign in offline mode: the player whose turn it is forfeits
      const resignerColor = gameState.turn;
      const winnerColor: PieceColor = resignerColor === 'w' ? 'b' : 'w';
      const resignerName = resignerColor === 'w' ? gameState.whitePlayer?.username : gameState.blackPlayer?.username;

      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'resigned',
          winner: winnerColor,
          winnerReason: `${resignerName} resigned`,
        };
      });
      setShowResignModal(false);
      setShowGameOverModal(true);
      sounds.playGameEnd(true);
    } else {
      socket.emit('resign');
      setShowResignModal(false);
    }
  };

  const handleRequestRematch = () => {
    if (gameState?.isOffline) {
      // Restart local match with swapped colors!
      const chess = new Chess();
      offlineChessRef.current = chess;
      const tc = gameState.timeControl;

      const swappedWhite = gameState.blackPlayer;
      const swappedBlack = gameState.whitePlayer;

      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          fen: chess.fen(),
          pgn: chess.pgn(),
          turn: 'w',
          isCheck: false,
          history: [],
          status: 'active',
          winner: null,
          winnerReason: null,
          lastMove: null,
          clocks: {
            w: tc.initialSeconds * 1000,
            b: tc.initialSeconds * 1000,
          },
          whitePlayer: swappedWhite,
          blackPlayer: swappedBlack,
        };
      });
      setShowGameOverModal(false);
      setPreviewFen(null);
      sounds.playGameStart();
    } else {
      if (gameState?.rematchOfferFrom && gameState.rematchOfferFrom !== myRole) {
        socket.emit('respond_rematch', { accept: true });
      } else {
        socket.emit('request_rematch');
      }
    }
  };

  const handleSendChat = (text: string) => {
    if (gameState?.isOffline) return;
    socket.emit('send_chat', { text });
  };

  const handleCopyRoomLink = async () => {
    if (!gameState || gameState.isOffline) return;
    const link = `${window.location.origin}/?room=${gameState.roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Invitation link copied to clipboard!');
    } catch (err) {}
  };

  const handleCopyPgn = async () => {
    if (!gameState) return;
    try {
      await navigator.clipboard.writeText(gameState.pgn || 'No moves');
      setHasCopiedPgn(true);
      setTimeout(() => setHasCopiedPgn(false), 2000);
    } catch (err) {}
  };

  const handleLeaveRoom = () => {
    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
    }
    setGameState(null);
    setChatMessages([]);
    setShowGameOverModal(false);
    setShowDrawOfferModal(false);
    setShowResignModal(false);
    setPreviewFen(null);
  };

  // Determine board orientation
  const orientation: PieceColor = useMemo(() => {
    if (gameState?.isOffline && gameState.autoFlipBoard) {
      return gameState.turn; // auto-flip to active player's perspective
    }
    if (manualFlipped) {
      return myRole === 'b' ? 'w' : 'b';
    }
    return myRole === 'b' ? 'b' : 'w';
  }, [myRole, manualFlipped, gameState?.isOffline, gameState?.autoFlipBoard, gameState?.turn]);

  // Captured pieces and material calculation
  const captured = useMemo(() => {
    if (!gameState) return { whiteCaptured: [], blackCaptured: [], whiteMaterialAdvantage: 0, blackMaterialAdvantage: 0 };
    return computeCapturedPieces(gameState.history);
  }, [gameState?.history]);

  // Top and bottom player cards assignment
  const topPlayerColor: PieceColor = orientation === 'w' ? 'b' : 'w';
  const bottomPlayerColor: PieceColor = orientation === 'w' ? 'w' : 'b';

  const topPlayer = topPlayerColor === 'w' ? gameState?.whitePlayer : gameState?.blackPlayer;
  const bottomPlayer = bottomPlayerColor === 'w' ? gameState?.whitePlayer : gameState?.blackPlayer;

  const topClock = topPlayerColor === 'w' ? gameState?.clocks.w : gameState?.clocks.b;
  const bottomClock = bottomPlayerColor === 'w' ? gameState?.clocks.w : gameState?.clocks.b;

  const topCaptured = topPlayerColor === 'w' ? captured.whiteCaptured : captured.blackCaptured;
  const bottomCaptured = bottomPlayerColor === 'w' ? captured.whiteCaptured : captured.blackCaptured;

  const topAdvantage = topPlayerColor === 'w' ? captured.whiteMaterialAdvantage : captured.blackMaterialAdvantage;
  const bottomAdvantage = bottomPlayerColor === 'w' ? captured.whiteMaterialAdvantage : captured.blackMaterialAdvantage;

  // Render Lobby if not in a room
  if (!gameState) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-6 px-4">
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartOfflineMatch={handleStartOfflineMatch}
          onOpenHistory={() => setShowHistoryModal(true)}
          error={lobbyError}
          onClearError={() => setLobbyError(null)}
        />
        <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />
      </div>
    );
  }

  // Render Waiting Screen if room status is waiting
  if (gameState.status === 'waiting') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <WaitingScreen gameState={gameState} onCancel={handleLeaveRoom} />
      </div>
    );
  }

  // Active / Finished Game Screen (both Online and Local Offline)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500/30">
      {/* Top Header */}
      <header className="px-4 py-2.5 sm:py-3 bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveRoom}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition"
            title="Leave Match"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-500" />
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-100">GRANDMASTER</span>
          </div>

          {gameState.isOffline ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-bold flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" /> Pass & Play (Local 1v1)
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 font-mono text-amber-400 font-bold">
              #{gameState.roomId}
            </span>
          )}
        </div>

        {/* Status / Role pill */}
        <div className="flex items-center gap-3">
          {gameState.isOffline ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  gameState.turn === 'w' ? 'bg-white border border-zinc-400' : 'bg-zinc-950 border border-zinc-600'
                }`}
              />
              <span>{gameState.turn === 'w' ? `${gameState.whitePlayer?.username}'s Turn` : `${gameState.blackPlayer?.username}'s Turn`}</span>
            </div>
          ) : myRole === 'spectator' ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Spectating</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  myRole === 'w' ? 'bg-white border border-zinc-400' : 'bg-zinc-950 border border-zinc-600'
                }`}
              />
              <span>Playing as {myRole === 'w' ? 'White' : 'Black'}</span>
            </div>
          )}

          {/* Quick Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Game Interface */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Center: Opponent Info -> Chessboard -> Player Info -> Game Controls */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-2 sm:space-y-3 w-full">
          {/* Top Player Card */}
          <div className="w-full max-w-[600px]">
            <PlayerCard
              player={topPlayer || null}
              assignedColor={topPlayerColor}
              isTurn={gameState.status === 'active' && gameState.turn === topPlayerColor}
              clockMs={topClock || 0}
              isUnlimitedTime={gameState.timeControl.id === 'unlimited'}
              capturedPieces={topCaptured}
              materialAdvantage={topAdvantage}
              isMe={!gameState.isOffline && myRole === topPlayerColor}
            />
          </div>

          {/* Chessboard */}
          <Chessboard
            fen={previewFen || gameState.fen}
            playerColor={myRole}
            orientation={orientation}
            turn={gameState.turn}
            isCheck={gameState.isCheck}
            lastMove={gameState.lastMove}
            interactive={!previewFen && gameState.status === 'active'}
            isOffline={gameState.isOffline}
            onMove={handleMove}
            onIllegalMoveAttempt={() => sounds.playIllegal()}
          />

          {/* Bottom Player Card */}
          <div className="w-full max-w-[600px]">
            <PlayerCard
              player={bottomPlayer || null}
              assignedColor={bottomPlayerColor}
              isTurn={gameState.status === 'active' && gameState.turn === bottomPlayerColor}
              clockMs={bottomClock || 0}
              isUnlimitedTime={gameState.timeControl.id === 'unlimited'}
              capturedPieces={bottomCaptured}
              materialAdvantage={bottomAdvantage}
              isMe={!gameState.isOffline && myRole === bottomPlayerColor}
            />
          </div>

          {/* Controls toolbar */}
          <div className="w-full max-w-[600px]">
            <GameControls
              status={gameState.status}
              isPlayer={gameState.isOffline || myRole !== 'spectator'}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onFlipBoard={() => setManualFlipped(!manualFlipped)}
              onOfferDraw={handleOfferDraw}
              onRequestResign={() => setShowResignModal(true)}
              onCopyRoomLink={handleCopyRoomLink}
              onRequestRematch={handleRequestRematch}
              hasDrawOffer={!gameState.isOffline && gameState.drawOfferFrom === myRole}
              hasRematchOffer={!gameState.isOffline && gameState.rematchOfferFrom === myRole}
            />
          </div>
        </div>

        {/* Right Column: Move History and Chat (or info panel for offline) */}
        <div className="lg:col-span-4 flex flex-col gap-4 w-full h-full">
          {/* Move History */}
          <MoveHistory
            history={gameState.history}
            currentFen={gameState.fen}
            pgn={gameState.pgn}
            selectedFen={previewFen || undefined}
            onSelectMove={(fen) => setPreviewFen(fen)}
            onLiveReturn={() => setPreviewFen(null)}
          />

          {/* ChatBox for online, or Local Match Info Card for offline */}
          {gameState.isOffline ? (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs sm:text-sm text-zinc-100">Local 1v1 Match Guide</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                Both players take turns moving pieces on this device. Legal moves and official chess rules are strictly enforced.
              </p>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">White Player</span>
                  <span className="font-bold text-zinc-100">{gameState.whitePlayer?.username}</span>
                </div>
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">Black Player</span>
                  <span className="font-bold text-zinc-100">{gameState.blackPlayer?.username}</span>
                </div>
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">Time Control</span>
                  <span className="font-semibold text-amber-400">{gameState.timeControl.name}</span>
                </div>
              </div>
            </div>
          ) : (
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendChat}
              myColor={myRole}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <GameOverModal
        isOpen={showGameOverModal}
        gameState={gameState}
        myColor={gameState.isOffline ? (gameState.winner === 'draw' ? 'spectator' : (gameState.winner || 'w')) : myRole}
        onRematch={handleRequestRematch}
        onLeaveRoom={handleLeaveRoom}
        onCopyPgn={handleCopyPgn}
        hasCopiedPgn={hasCopiedPgn}
      />

      <DrawOfferModal
        isOpen={showDrawOfferModal}
        offeredByColor={gameState.drawOfferFrom || 'w'}
        onAccept={handleAcceptDraw}
        onDecline={handleDeclineDraw}
      />

      <ResignModal
        isOpen={showResignModal}
        onConfirm={handleConfirmResign}
        onCancel={() => setShowResignModal(false)}
      />
    </div>
  );
};
