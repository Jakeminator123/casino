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
};

export default function BoardComponent({ id, board, myPlayerId, allowDrag, onDragStart, onDragEnd, onDragOver, onDrop }: BoardProps) {
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
        {(board.community || []).map((c, idx) => (
          <CardView key={idx} card={c} canDrag={false} />
        ))}
      </div>
      <div className="player-cards" data-board={id} data-owner="opponent">
        {oppCards.map((c, idx) => (
          <CardView key={idx} card={c} canDrag={false} />
        ))}
      </div>
      <div
        className="player-cards"
        data-board={id}
        data-owner="me"
        onDragOver={onDragOver}
        onDrop={onDrop(`board-${id}`)}
      >
        {myCards.map((c, idx) => (
          <CardView
            key={idx}
            card={c}
            canDrag={Boolean(allowDrag && c && c.id != null)}
            onDragStart={c && c.id != null ? onDragStart(c.id, `board-${id}`) : undefined}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
