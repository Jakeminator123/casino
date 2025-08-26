import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import ChatInput from './components/ChatInput';
import CardView from './components/CardView';
import BoardComponent from './components/Board';
import ShowdownOverlay from './components/ShowdownOverlay';

type Card = { rank?: string; suit?: string; id?: number; hidden?: boolean };
type Board = {
  type: string;
  actual_type?: string;
  community: Card[];
  p1_cards: Card[];
  p2_cards: Card[];
};
type Players = Record<number, { id: number; name: string; bankroll: number; bet: number; hand: Card[] }>;
type GameState = {
  room_id: string;
  phase: 'waiting' | 'betting' | 'placing' | 'showdown' | 'complete';
  current_player: number;
  pot: number;
  boards: Record<'A' | 'B' | 'C', Board>;
  players: Players;
};

type ShowdownResult = {
  results: Array<{
    board: 'A' | 'B' | 'C';
    type: string;
    winner: 0 | 1 | 2;
    winner_hand: string;
    p1_hand: string;
    p2_hand: string;
    p1_type?: 'PLO' | 'NL';
    p2_type?: 'PLO' | 'NL';
    pot: number;
  }>;
  p1_total: number;
  p2_total: number;
  sweep_bonus: boolean;
  final_bankrolls?: Record<number, number>;
};

// suit helpers moved into CardView component

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('Player');
  const [joinCode, setJoinCode] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [betAmount, setBetAmount] = useState(50);
  const [chat, setChat] = useState<Array<{ from: string; message: string }>>([]);
  const dragged = useRef<{ id: number; from: string } | null>(null);
  const [showdownResults, setShowdownResults] = useState<ShowdownResult | null>(null);
  const [showingShowdown, setShowingShowdown] = useState(false);

  // Initialize Socket.IO
  useEffect(() => {
    const backendUrl = window.location.origin;
    const s = io(backendUrl, {
      transports: ['polling'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connected', () => {
      // no-op visual indicator handled by CSS
      // console.log('connected', data.session_id);
    });

    s.on('disconnect', () => {
      // visual indicator via CSS could be added
    });

    s.on('room_created', (data: { room_id: string; player_id: number }) => {
      setRoomId(data.room_id);
      setMyPlayerId(data.player_id);
    });

    s.on('room_joined', (data: { room_id: string; player_id: number }) => {
      setRoomId(data.room_id);
      setMyPlayerId(data.player_id);
      // go to game screen
      setShowBetModal(false);
    });

    s.on('player_joined', () => {
      // optional system message
    });

    s.on('ready_to_bet', () => {
      setShowBetModal(true);
    });

    s.on('bet_placed', () => {});

    s.on('game_started', (state: GameState) => {
      setGame(state);
      setShowBetModal(false);
    });

    s.on('game_state', (state: GameState) => {
      // Check if turn/river cards were just dealt
      if (game && state.phase === 'showdown' && game.phase === 'placing') {
        // Animate community cards being revealed with staggered timing (1.2s each)
        setTimeout(() => {
          document.querySelectorAll('.community-cards').forEach((communityDiv, boardIdx) => {
            const cards = communityDiv.querySelectorAll('.card');
            // Turn card (index 3) - starts after board delay
            if (cards[3]) {
              setTimeout(() => {
                cards[3].classList.add('revealing');
                setTimeout(() => cards[3].classList.remove('revealing'), 1200);
              }, boardIdx * 400 + 500);
            }
            // River card (index 4) - starts 1.2s after turn
            if (cards[4]) {
              setTimeout(() => {
                cards[4].classList.add('revealing');
                setTimeout(() => cards[4].classList.remove('revealing'), 1200);
              }, boardIdx * 400 + 1700);
            }
          });
        }, 300);
      }
      setGame(state);
    });

    s.on('showdown_results', (data: ShowdownResult) => {
      // Add staggered card flip animations for opponent cards reveal
      document.querySelectorAll('.player-cards[data-owner="opponent"] .card').forEach((card, idx) => {
        setTimeout(() => {
          card.classList.add('revealing');
          setTimeout(() => card.classList.remove('revealing'), 1200);
        }, idx * 300 + 1000); // 300ms between each card, start after 1s
      });
      
      setShowdownResults(data);
      setShowingShowdown(true);
      // Hide after 12 seconds (longer for new animations)
      setTimeout(() => setShowingShowdown(false), 12000);
    });

    s.on('error', (data: any) => {
      alert(`Error: ${data?.message ?? 'Unknown error'}`);
    });

    s.on('chat_message', (data: { player_name: string; message: string }) => {
      setChat((prev: Array<{ from: string; message: string }>) => prev.concat({ from: data.player_name, message: data.message }));
    });

    s.on('rematch_requested', () => {
      setChat((prev: Array<{ from: string; message: string }>) => prev.concat({ from: 'System', message: 'Opponent wants a rematch!' }));
    });

    setSocket(s);
    return () => {
      s.close();
    };
  }, []);

  const me = useMemo(() => (myPlayerId && game ? game.players[myPlayerId] : undefined), [myPlayerId, game]);
  const opponent = useMemo(() => {
    if (!myPlayerId || !game) return undefined;
    const oppId = myPlayerId === 1 ? 2 : 1;
    return game.players[oppId];
  }, [myPlayerId, game]);
  const playerCount = useMemo(() => (game ? Object.keys(game.players || {}).length : 0), [game]);
  const copyRoomCode = async () => {
    try { await navigator.clipboard.writeText(roomId); } catch {}
  };

  // Lobby actions
  const createRoom = () => {
    if (!socket) return;
    socket.emit('create_room', { player_name: playerName || 'Player' });
  };
  const joinRoom = () => {
    if (!socket) return;
    if (!joinCode || joinCode.length !== 6) {
      alert('Please enter a valid 6-character room code');
      return;
    }
    socket.emit('join_room', { room_id: joinCode.toUpperCase(), player_name: playerName || 'Player' });
  };

  // Betting
  useEffect(() => {
    const bankroll = me?.bankroll ?? 1000;
    setBetAmount(Math.min(50, bankroll));
  }, [me?.bankroll]);
  const placeBet = () => socket?.emit('place_bet', { amount: betAmount });

  // DnD helpers
  const allowDrag = game?.phase === 'placing' && game?.current_player === myPlayerId;

  const handleDragStart = (id: number, from: string) => (e: React.DragEvent) => {
    if (!allowDrag) return;
    dragged.current = { id, from };
    (e.target as HTMLElement).classList.add('dragging');
  };
  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging');
    dragged.current = null;
  };
  const handleDrop = (to: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragged.current) return;
    socket?.emit('move_card', { card_id: dragged.current.id, from: dragged.current.from, to });
    dragged.current = null;
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!allowDrag) return;
    e.preventDefault();
  };

  const confirmPlacement = () => socket?.emit('confirm_placement', {});
  const requestRematch = () => socket?.emit('request_rematch', {});
  const sendMessage = (message: string) => socket?.emit('send_message', { message });

  const phaseText = (phase?: GameState['phase']) => {
    if (!phase) return '';
    switch (phase) {
      case 'waiting':
        return 'Waiting for players';
      case 'betting':
        return 'Place your bets';
      case 'placing':
        return game?.current_player === myPlayerId ? 'Your turn - Place your cards' : 'Opponent is placing cards';
      case 'showdown':
        return 'Showdown!';
      case 'complete':
        return 'Game complete';
      default:
        return phase;
    }
  };

  // Helper functions moved to Board component

  // CardView moved to components/CardView.tsx

  // BoardView moved to components/Board.tsx

  const renderHand = () => {
    const hand = me?.hand ?? [];
    if (!hand.length) return <div style={{ color: 'rgba(255,255,255,0.3)' }}>Your cards will appear here</div>;
    return hand.map((c, idx) => (
      <CardView
        key={idx}
        card={c}
        canDrag={Boolean(allowDrag && c && c.id != null)}
        onDragStart={c && c.id != null ? handleDragStart(c.id, 'hand') : undefined}
        onDragEnd={handleDragEnd}
      />
    ));
  };

  const totalPlaced = useMemo(() => {
    if (!game || !myPlayerId) return 0;
    return (['A', 'B', 'C'] as const).reduce((sum, id) => {
      const board = game.boards[id];
      const cards = myPlayerId === 1 ? board.p1_cards : board.p2_cards;
      return sum + (cards?.length ?? 0);
    }, 0);
  }, [game, myPlayerId]);

  const showConfirm = game?.phase === 'placing' && game?.current_player === myPlayerId && totalPlaced === 8;
  const showRematch = game?.phase === 'complete' || (showdownResults && !showingShowdown);
  
  const closeShowdown = () => setShowingShowdown(false);

  return (
    <div className="page">
      <h1>🎰 Eight Cards Poker - Multiplayer 🎰</h1>

      {/* Lobby */}
      {!roomId && (
        <div className="lobby">
          <h2>Welcome to Eight Cards Poker</h2>
          <input className="lobby-input" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name" />
          <div style={{ margin: 20 }}>
            <button className="lobby-button" onClick={createRoom}>Create New Room</button>
            <div style={{ margin: 20, color: 'rgba(255,255,255,0.5)' }}>— OR —</div>
            <input className="lobby-input" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter Room Code" maxLength={6} style={{ textTransform: 'uppercase' }} />
            <button className="lobby-button" onClick={joinRoom}>Join Room</button>
          </div>
        </div>
      )}

      {/* Game */}
      {roomId && (
        <div className="game-container">
          <div className="info-panel">
            <div className="pot-info">POT: ${game?.pot ?? 0}</div>
            <div className="phase-indicator">
              <span>{phaseText(game?.phase)}</span>
              <span className="status-indicator status-connected" />
            </div>
            <div>Room: <span style={{ fontWeight: 'bold' }}>{roomId}</span></div>
            {playerCount < 2 && (
              <div className="room-code" style={{ marginTop: 10 }}>
                <p>Share this code with your opponent:</p>
                <div className="room-code-display" style={{ marginTop: 8 }}>{roomId}</div>
                <button style={{ marginTop: 10 }} onClick={copyRoomCode}>Copy</button>
              </div>
            )}
          </div>

          <div className="boards-container">
            {(['A', 'B', 'C'] as const).map(id => (
              <BoardComponent 
                key={id} 
                id={id} 
                board={game?.boards?.[id]} 
                myPlayerId={myPlayerId}
                allowDrag={allowDrag}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={onDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>

          <div className="player-section">
            <div className="player-header">
              <span>{opponent?.name ?? 'Opponent'}</span>
              <span className="player-bankroll">${opponent?.bankroll ?? 1000}</span>
            </div>
          </div>

          <div className="player-section">
            <div className="player-header">
              <span>{(me?.name ?? 'You') + ' (You)'}</span>
              <span className="player-bankroll">${me?.bankroll ?? 1000}</span>
            </div>
            <div className="player-hand" data-location="hand" onDragOver={onDragOver} onDrop={handleDrop('hand')}>
              {renderHand()}
            </div>
          </div>

          <div className="controls">
            {showConfirm && <button onClick={confirmPlacement}>🎯 Confirm Placement</button>}
            {showRematch && <button className="play-again-btn" onClick={requestRematch}>🎰 Play Again 🎰</button>}
          </div>

          {/* Chat */}
          <div className="chat-container">
            <div className="chat-messages">
              {chat.map((m, idx) => (
                <div key={idx}><strong>{m.from}:</strong> {m.message}</div>
              ))}
            </div>
            <ChatInput onSend={sendMessage} />
          </div>

          {/* Betting Modal */}
          {showBetModal && (
            <div className="modal show">
              <div className="modal-content">
                <h2>Place Your Bet</h2>
                <p>Your bankroll: ${me?.bankroll ?? 1000}</p>
                <input className="bet-input" type="number" min={10} max={me?.bankroll ?? 1000} value={betAmount} onChange={e => setBetAmount(parseInt(e.target.value || '0', 10))} />
                <br />
                <button onClick={placeBet}>Place Bet</button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Showdown Overlay */}
      {showingShowdown && showdownResults && (
        <ShowdownOverlay 
          results={showdownResults} 
          myPlayerId={myPlayerId} 
          onClose={closeShowdown}
        />
      )}
    </div>
  );
}

// ShowdownOverlay moved to components/ShowdownOverlay.tsx

// ChatInput moved to components/ChatInput.tsx


