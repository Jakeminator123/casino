import React from 'react';
import CardView from './CardView';

export type Card = { rank?: string; suit?: string; id?: number; hidden?: boolean };
export type Board = {
  type: string;
  actual_type?: string;
  community: Card[];
  p1_cards: Card[];
  p2_cards: Card[];
};

type BoardProps = {
  id: 'A' | 'B' | 'C';
  board?: Board;
  myPlayerId: number | null;
  allowDrag: boolean;
  onDragStart: (id: number, from: string) => (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (to: string) => (e: React.DragEvent) => void;
  onTouchStart?: (id: number, from: string) => (e: React.TouchEvent) => void;
  onTouchEnd?: (to: string) => (e: React.TouchEvent) => void;
  gamePhase?: string;
};

export default function BoardComponent({ id, board, myPlayerId, allowDrag, onDragStart, onDragEnd, onDragOver, onDrop, onTouchStart, onTouchEnd, gamePhase }: BoardProps) {
  if (!board) return null;
  
  const actualType = board.actual_type || board.type;
  let label = '?';
  let cls = 'pending';
  
  if (actualType === 'both_plo' || board.type === 'plo') {
    label = 'PLO';
    cls = 'plo';
  } else if (actualType === 'p1_plo') {
    label = 'P1:PLO';
    cls = 'plo';
  } else if (actualType === 'p2_plo') {
    label = 'P2:PLO';
    cls = 'plo';
  } else if (board.type === 'nlhe') {
    label = 'NLHE';
    cls = 'nlhe';
  }

  const myCards = (myPlayerId === 1 ? board.p1_cards : board.p2_cards) || [];
  const oppCards = (myPlayerId === 1 ? board.p2_cards : board.p1_cards) || [];

  return (
    <div className="board" data-board={id}>
      <div className="board-header">
        Board {id} <span className={`board-type ${cls}`}>{label}</span>
      </div>
      <div className="community-cards">
        {[0, 1, 2, 3, 4].map((idx) => {
          const c = (board.community || [])[idx];
          // Turn (idx 3) and River (idx 4) should ALWAYS be hidden until showdown
          const isTurnOrRiver = idx === 3 || idx === 4;
          const shouldHideInitially = isTurnOrRiver && !!c && !!c.rank && (gamePhase !== 'showdown' && gamePhase !== 'complete');
          
          if (!c) {
            // If Turn/River not yet dealt, show back design instead of empty white
            if (isTurnOrRiver) {
              return <div key={idx} className="card back placeholder" />;
            }
            // For flop slots that aren't yet filled (shouldn't happen), keep empty
            return <div key={idx} className="card empty" />;
          }
          
          return (
            <CardView 
              key={idx} 
              card={c} 
              canDrag={false}
              initiallyHidden={shouldHideInitially}
              cardIndex={idx}
            />
          );
        })}
      </div>
      <div className="player-cards" data-board={id} data-owner="opponent">
        {oppCards.map((c, idx) => {
          // Show opponent cards as backs until showdown/complete
          const hideOpponentCard = gamePhase !== 'showdown' && gamePhase !== 'complete' && c && !c.hidden;
          return (
            <CardView 
              key={idx} 
              card={c} 
              canDrag={false}
              isOpponentCard={hideOpponentCard}
            />
          );
        })}
      </div>
      <div
        className="player-cards"
        data-board={id}
        data-owner="me"
        onDragOver={onDragOver}
        onDrop={onDrop(`board-${id}`)}
        onTouchEnd={onTouchEnd?.(`board-${id}`)}
      >
        {myCards.map((c, idx) => (
          <CardView
            key={idx}
            card={c}
            canDrag={Boolean(allowDrag && c && c.id != null)}
            onDragStart={c && c.id != null ? onDragStart(c.id, `board-${id}`) : undefined}
            onDragEnd={onDragEnd}
            onTouchStart={c && c.id != null ? onTouchStart?.(c.id, `board-${id}`) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
