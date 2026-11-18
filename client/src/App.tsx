import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChatMessage,
  GameState,
  PieceColor,
  PieceType,
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
import { Swords, Eye, RotateCw, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const [username, setUsername] = useState(getSavedUsername());

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<'w' | 'b' | 'spectator'>('spectator');
  const [manualFlipped, setManualFlipped] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
            // Clean URL query param without refreshing
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setLobbyError(res?.error || 'Room not found or cannot join');
          }
        }
      );
    } else {
      // Check if we can reconnect to an existing ongoing match
      socket.emit('reconnect_player', { playerId }, (res: any) => {
        if (res?.reconnected && res.room) {
          setGameState(res.room);
          setMyRole(res.role);
        }
      });
    }
  }, [playerId]);

  // Socket event listeners
  useEffect(() => {
    socket.on('room_created', (data: { room: GameState }) => {
      setGameState(data.room);
      setPreviewFen(null);
      // Determine my role
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

      // Play audio based on move characteristics
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
        if (!prev) return null;
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

      // Update role since colors flipped for rematch
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

  // Handlers for in-game actions
  const handleMove = (from: string, to: string, promotion?: PieceType) => {
    if (!gameState || gameState.status !== 'active') return;
    socket.emit('make_move', { from, to, promotion }, (res: any) => {
      if (!res?.success) {
        sounds.playIllegal();
      }
    });
  };

  const handleOfferDraw = () => {
    socket.emit('offer_draw');
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
    socket.emit('resign');
    setShowResignModal(false);
  };

  const handleRequestRematch = () => {
    if (gameState?.rematchOfferFrom && gameState.rematchOfferFrom !== myRole) {
      // Opponent already offered, accept it!
      socket.emit('respond_rematch', { accept: true });
    } else {
      socket.emit('request_rematch');
    }
  };

  const handleSendChat = (text: string) => {
    socket.emit('send_chat', { text });
  };

  const handleCopyRoomLink = async () => {
    if (!gameState) return;
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
    setGameState(null);
    setChatMessages([]);
    setShowGameOverModal(false);
    setShowDrawOfferModal(false);
    setShowResignModal(false);
    setPreviewFen(null);
  };

  // Determine board orientation
  const orientation: PieceColor = useMemo(() => {
    if (manualFlipped) {
      return myRole === 'b' ? 'w' : 'b';
    }
    return myRole === 'b' ? 'b' : 'w';
  }, [myRole, manualFlipped]);

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

  // Active / Finished Game Screen
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
          <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 font-mono text-amber-400 font-bold">
            #{gameState.roomId}
          </span>
        </div>

        {/* Status / Role pill */}
        <div className="flex items-center gap-3">
          {myRole === 'spectator' ? (
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
          {/* Top Opponent Card */}
          <div className="w-full max-w-[600px]">
            <PlayerCard
              player={topPlayer || null}
              assignedColor={topPlayerColor}
              isTurn={gameState.status === 'active' && gameState.turn === topPlayerColor}
              clockMs={topClock || 0}
              isUnlimitedTime={gameState.timeControl.id === 'unlimited'}
              capturedPieces={topCaptured}
              materialAdvantage={topAdvantage}
              isMe={myRole === topPlayerColor}
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
              isMe={myRole === bottomPlayerColor}
            />
          </div>

          {/* Controls toolbar */}
          <div className="w-full max-w-[600px]">
            <GameControls
              status={gameState.status}
              isPlayer={myRole !== 'spectator'}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onFlipBoard={() => setManualFlipped(!manualFlipped)}
              onOfferDraw={handleOfferDraw}
              onRequestResign={() => setShowResignModal(true)}
              onCopyRoomLink={handleCopyRoomLink}
              onRequestRematch={handleRequestRematch}
              hasDrawOffer={gameState.drawOfferFrom === myRole}
              hasRematchOffer={gameState.rematchOfferFrom === myRole}
            />
          </div>
        </div>

        {/* Right Column: Move History and Chat */}
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

          {/* Live Chat */}
          <ChatBox
            messages={chatMessages}
            onSendMessage={handleSendChat}
            myColor={myRole}
          />
        </div>
      </main>

      {/* Modals */}
      <GameOverModal
        isOpen={showGameOverModal}
        gameState={gameState}
        myColor={myRole}
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
