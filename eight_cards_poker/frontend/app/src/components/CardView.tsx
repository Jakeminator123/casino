import React from 'react';

export type Card = { rank?: string; suit?: string; id?: number; hidden?: boolean };

type CardViewProps = {
  card?: Card;
  canDrag?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  initiallyHidden?: boolean;
  cardIndex?: number;
  isOpponentCard?: boolean;
};

const SUITS: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
const SUIT_COLORS: Record<string, string> = { '♣': 'black', '♦': 'red', '♥': 'red', '♠': 'black' };

export default function CardView({ card, canDrag, onDragStart, onDragEnd, onTouchStart, initiallyHidden, cardIndex, isOpponentCard }: CardViewProps) {
  if (!card) return null;
  
  // Handle hidden cards (from backend)
  if (card.hidden) {
    return (
      <div 
        className="card back opponent-card-hidden" 
        data-rank={card.rank} 
        data-suit={card.suit}
      />
    );
  }
  
  const suitSymbol = SUITS[card.suit ?? ''] ?? '?';
  const color = SUIT_COLORS[suitSymbol] ?? 'black';
  
  // For Turn/River cards, show back initially then flip at showdown
  if (initiallyHidden) {
    return (
      <div 
        className="card back reveal-on-flip" 
        data-rank={card.rank} 
        data-suit={card.suit}
        data-card-index={cardIndex}
      >
        <span className="card-content" style={{ display: 'none' }}>
          {(card.rank ?? '?') + suitSymbol}
        </span>
      </div>
    );
  }
  
  // For opponent cards that should be hidden until showdown
  if (isOpponentCard) {
    return (
      <div 
        className="card back opponent-card" 
        data-rank={card.rank} 
        data-suit={card.suit}
      >
        <span className="card-content" style={{ display: 'none' }}>
          {(card.rank ?? '?') + suitSymbol}
        </span>
      </div>
    );
  }
  
  const isDraggable = Boolean(canDrag && card.id != null);
  return (
    <div
      className={`card ${color} ${isDraggable ? 'draggable' : ''}`}
      draggable={isDraggable}
      onDragStart={isDraggable ? onDragStart : undefined}
      onDragEnd={isDraggable ? onDragEnd : undefined}
      onTouchStart={isDraggable ? onTouchStart : undefined}
    >
      {(card.rank ?? '?') + suitSymbol}
    </div>
  );
}


