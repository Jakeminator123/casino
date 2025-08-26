import React from 'react';

export type Card = { rank?: string; suit?: string; id?: number; hidden?: boolean };

type CardViewProps = {
  card?: Card;
  canDrag?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
};

const SUITS: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
const SUIT_COLORS: Record<string, string> = { '♣': 'black', '♦': 'red', '♥': 'red', '♠': 'black' };

export default function CardView({ card, canDrag, onDragStart, onDragEnd }: CardViewProps) {
  if (!card) return null;
  if (card.hidden) return <div className="card back" />;
  const suitSymbol = SUITS[card.suit ?? ''] ?? '?';
  const color = SUIT_COLORS[suitSymbol] ?? 'black';
  const isDraggable = Boolean(canDrag && card.id != null);
  return (
    <div
      className={`card ${color} ${isDraggable ? 'draggable' : ''}`}
      draggable={isDraggable}
      onDragStart={isDraggable ? onDragStart : undefined}
      onDragEnd={isDraggable ? onDragEnd : undefined}
    >
      {(card.rank ?? '?') + suitSymbol}
    </div>
  );
}


