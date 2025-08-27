import { useState, useEffect } from 'react';

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
    winning_cards?: string[]; // Cards that made the winning hand
    p1_used_cards?: number[];
    p2_used_cards?: number[];
    winner_used_cards?: number[];
  }>;
  p1_total: number;
  p2_total: number;
  sweep_bonus: boolean;
  final_bankrolls?: Record<number, number>;
};

type ShowdownOverlayProps = {
  results: ShowdownResult;
  myPlayerId: number | null;
  onClose: () => void;
};

export default function ShowdownOverlay({ results, myPlayerId, onClose }: ShowdownOverlayProps) {
  const [currentBoard, setCurrentBoard] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  
  useEffect(() => {
    // Show each board result with delay
    const timer1 = setTimeout(() => setCurrentBoard(1), 1500);
    const timer2 = setTimeout(() => setCurrentBoard(2), 3000);
    const timer3 = setTimeout(() => setShowFinal(true), 4500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);
  
  const getWinnerColor = (winner: number) => {
    if (winner === 0) return '#f39c12'; // tie
    if (winner === myPlayerId) return '#2ecc71'; // win
    return '#e74c3c'; // loss
  };
  
  const getWinnerText = (winner: number) => {
    if (winner === 0) return '🤝 TIE';
    if (winner === myPlayerId) return '🏆 YOU WIN';
    return '💔 YOU LOSE';
  };
  
  return (
    <div className="showdown-overlay">
      <div className="showdown-content">
        <div className="showdown-header">
          <h2>🎰 SHOWDOWN RESULTS 🎰</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="boards-results">
          {results.results.map((result, idx) => (
            <div 
              key={result.board}
              className={`board-result ${idx <= currentBoard ? 'revealed' : ''} ${result.winner === myPlayerId ? 'winner' : result.winner === 0 ? 'tie' : 'loser'}`}
              style={{ animationDelay: `${idx * 0.5}s` }}
            >
              <div className="board-title">Board {result.board}</div>
              <div className="board-type">{result.type.toUpperCase()}</div>
              <div className="hands">
                <div className="hand-result">
                  <span className="player">P1 ({result.p1_type}):</span>
                  <span className="hand-name">{result.p1_hand}</span>
                </div>
                <div className="vs">VS</div>
                <div className="hand-result">
                  <span className="player">P2 ({result.p2_type}):</span>
                  <span className="hand-name">{result.p2_hand}</span>
                </div>
              </div>
              <div 
                className="winner-announcement"
                style={{ color: getWinnerColor(result.winner) }}
              >
                {getWinnerText(result.winner)}
                <div className="winning-hand">
                  <div className="hand-name">{result.winner_hand}</div>
                  {result.winning_cards && (
                    <div className="winning-cards">
                      Cards: {result.winning_cards.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="pot-amount">${result.pot}</div>
            </div>
          ))}
        </div>
        
        {showFinal && (
          <div className="final-results">
            {results.sweep_bonus && (
              <div className="sweep-bonus">
                🎉 SWEEP BONUS! 2X POT! 🎉
              </div>
            )}
            <div className="totals">
              <div className={`total ${results.p1_total > results.p2_total ? 'winner' : ''}`}>
                <span className="label">Player 1</span>
                <span className="amount">${results.p1_total}</span>
              </div>
              <div className={`total ${results.p2_total > results.p1_total ? 'winner' : ''}`}>
                <span className="label">Player 2</span>
                <span className="amount">${results.p2_total}</span>
              </div>
            </div>
            <div className="game-winner">
              {results.p1_total > results.p2_total ? '🏆 PLAYER 1 WINS!' : 
               results.p2_total > results.p1_total ? '🏆 PLAYER 2 WINS!' : 
               '🤝 IT\'S A TIE!'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
