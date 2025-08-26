"""
Eight Cards Poker - Game Engine
Core game logic separated from I/O
"""

import random
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum

class GamePhase(Enum):
    WAITING = "waiting"
    BETTING = "betting"
    PLACING = "placing"
    SHOWDOWN = "showdown"
    COMPLETE = "complete"

class BoardType(Enum):
    PENDING = "pending"
    PLO = "plo"
    NLHE = "nlhe"
    P1_PLO = "p1_plo"  # Player 1's PLO board
    P2_PLO = "p2_plo"  # Player 2's PLO board
    BOTH_PLO = "both_plo"  # Both players chose same PLO board

RANKS = "23456789TJQKA"
SUITS = "cdhs"

@dataclass
class Card:
    rank: str
    suit: str
    id: int
    
    def to_dict(self):
        return {
            'rank': self.rank,
            'suit': self.suit,
            'id': self.id
        }
    
    @classmethod
    def from_dict(cls, data):
        return cls(**data)

@dataclass
class Board:
    id: str
    type: BoardType = BoardType.PENDING
    community: List[Card] = field(default_factory=list)
    p1_cards: List[Card] = field(default_factory=list)
    p2_cards: List[Card] = field(default_factory=list)
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type.value,
            'community': [c.to_dict() for c in self.community],
            'p1_cards': [c.to_dict() for c in self.p1_cards],
            'p2_cards': [c.to_dict() for c in self.p2_cards]
        }
    
    def get_player_cards(self, player: int):
        return self.p1_cards if player == 1 else self.p2_cards
    
    def set_player_cards(self, player: int, cards: List[Card]):
        if player == 1:
            self.p1_cards = cards
        else:
            self.p2_cards = cards

@dataclass
class Player:
    id: int
    name: str
    bankroll: int = 1000
    bet: int = 0
    hand: List[Card] = field(default_factory=list)
    session_id: Optional[str] = None
    ready: bool = False
    
    def to_dict(self, hide_hand=False):
        return {
            'id': self.id,
            'name': self.name,
            'bankroll': self.bankroll,
            'bet': self.bet,
            'hand': [] if hide_hand else [c.to_dict() for c in self.hand],
            'ready': self.ready
        }

class GameEngine:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.players: Dict[int, Player] = {}
        self.boards: Dict[str, Board] = {
            'A': Board('A'),
            'B': Board('B'),
            'C': Board('C')
        }
        self.deck: List[Card] = []
        self.phase = GamePhase.WAITING
        self.current_player = 1
        self.pot = 0
        self.seed = None
        
    def add_player(self, session_id: str, name: str) -> Optional[int]:
        """Add a player to the game. Returns player ID (1 or 2) or None if full."""
        if len(self.players) >= 2:
            return None
        
        player_id = 1 if 1 not in self.players else 2
        self.players[player_id] = Player(
            id=player_id,
            name=name,
            session_id=session_id
        )
        return player_id
    
    def remove_player(self, session_id: str) -> bool:
        """Remove player by session ID"""
        for player_id, player in self.players.items():
            if player.session_id == session_id:
                del self.players[player_id]
                return True
        return False
    
    def place_bets(self, bets: Dict[int, int]) -> bool:
        """Place bets for both players"""
        for player_id, amount in bets.items():
            if player_id not in self.players:
                return False
            player = self.players[player_id]
            if amount > player.bankroll:
                return False
            player.bet = amount
            player.bankroll -= amount
        
        self.pot = sum(p.bet for p in self.players.values())
        return True
    
    def start_game(self, seed: Optional[int] = None) -> bool:
        """Start a new game"""
        if len(self.players) != 2:
            return False
        
        # Reset boards
        self.boards = {
            'A': Board('A'),
            'B': Board('B'),
            'C': Board('C')
        }
        
        # Create and shuffle deck
        self.seed = seed if seed else random.randint(0, 1000000)
        self.deck = self._create_deck()
        random.Random(self.seed).shuffle(self.deck)
        
        # Deal cards
        for player in self.players.values():
            player.hand = self.deck[:8]
            self.deck = self.deck[8:]
            player.ready = False
        
        # Deal flops
        for board_id in ['A', 'B', 'C']:
            self.boards[board_id].community = self.deck[:3]
            self.deck = self.deck[3:]
        
        self.phase = GamePhase.PLACING
        self.current_player = 1
        return True
    
    def _create_deck(self) -> List[Card]:
        """Create a standard 52-card deck"""
        deck = []
        card_id = 0
        for suit in SUITS:
            for rank in RANKS:
                deck.append(Card(rank, suit, card_id))
                card_id += 1
        return deck
    
    def move_card(self, player_id: int, card_id: int, from_location: str, to_location: str) -> bool:
        """Move a card from one location to another"""
        if self.phase != GamePhase.PLACING:
            return False
        if player_id != self.current_player:
            return False
        
        # Find the card
        card = self._find_card_by_id(card_id)
        if not card:
            return False
        
        # Remove from source
        if not self._remove_card_from_location(card, from_location, player_id):
            return False
        
        # Add to destination
        if not self._add_card_to_location(card, to_location, player_id):
            # Rollback
            self._add_card_to_location(card, from_location, player_id)
            return False
        
        # Auto-determine board types
        self._determine_board_types()
        return True
    
    def _find_card_by_id(self, card_id: int) -> Optional[Card]:
        """Find a card by its ID"""
        # Check hands
        for player in self.players.values():
            for card in player.hand:
                if card.id == card_id:
                    return card
        
        # Check boards
        for board in self.boards.values():
            for card in board.p1_cards + board.p2_cards:
                if card.id == card_id:
                    return card
        
        return None
    
    def _remove_card_from_location(self, card: Card, location: str, player_id: int) -> bool:
        """Remove card from specified location"""
        if location.startswith('hand'):
            player = self.players.get(player_id)
            if player and card in player.hand:
                player.hand.remove(card)
                return True
        elif location.startswith('board'):
            board_id = location.split('-')[1]
            board = self.boards.get(board_id)
            if board:
                player_cards = board.get_player_cards(player_id)
                if card in player_cards:
                    player_cards.remove(card)
                    board.set_player_cards(player_id, player_cards)
                    return True
        return False
    
    def _add_card_to_location(self, card: Card, location: str, player_id: int) -> bool:
        """Add card to specified location"""
        if location.startswith('hand'):
            player = self.players.get(player_id)
            if player:
                player.hand.append(card)
                return True
        elif location.startswith('board'):
            board_id = location.split('-')[1]
            board = self.boards.get(board_id)
            if board:
                # Check capacity based on current cards
                player_cards = board.get_player_cards(player_id)
                
                # Allow max 4 cards per board per player
                # The actual PLO/NL determination happens automatically
                if len(player_cards) >= 4:
                    return False
                
                player_cards.append(card)
                board.set_player_cards(player_id, player_cards)
                return True
        return False
    
    def _determine_board_types(self):
        """Auto-determine board types based on card placement"""
        # Reset all types
        for board in self.boards.values():
            board.type = BoardType.PENDING
        
        # Find PLO boards for each player
        p1_plo_board = None
        p2_plo_board = None
        
        for board_id, board in self.boards.items():
            if len(board.p1_cards) == 4:
                p1_plo_board = board_id
            if len(board.p2_cards) == 4:
                p2_plo_board = board_id
        
        # Set board types based on PLO choices
        for board_id, board in self.boards.items():
            if board_id == p1_plo_board and board_id == p2_plo_board:
                # Both players chose same board for PLO
                board.type = BoardType.BOTH_PLO
            elif board_id == p1_plo_board:
                # Only player 1 chose this for PLO
                board.type = BoardType.P1_PLO
            elif board_id == p2_plo_board:
                # Only player 2 chose this for PLO
                board.type = BoardType.P2_PLO
            else:
                # Neither player chose this for PLO
                board.type = BoardType.NLHE
    
    def confirm_placement(self, player_id: int) -> bool:
        """Confirm card placement for current player"""
        if self.phase != GamePhase.PLACING:
            return False
        if player_id != self.current_player:
            return False
        
        # Validate placement
        if not self._validate_placement(player_id):
            return False
        
        self.players[player_id].ready = True
        
        # Switch to next player or showdown
        if self.current_player == 1:
            self.current_player = 2
        else:
            # Both players done, proceed to showdown
            self.phase = GamePhase.SHOWDOWN
            self._deal_turn_river()
        
        return True
    
    def _validate_placement(self, player_id: int) -> bool:
        """Validate that player has placed all cards correctly"""
        player = self.players.get(player_id)
        if not player:
            return False
        
        # Count placed cards
        total_placed = 0
        has_plo = False
        
        for board in self.boards.values():
            player_cards = board.get_player_cards(player_id)
            count = len(player_cards)
            total_placed += count
            
            if count == 4:
                has_plo = True
            elif count != 2 and count != 0:
                return False
        
        # Must place all 8 cards with 1 PLO and 2 NLHE
        return total_placed == 8 and has_plo
    
    def _deal_turn_river(self):
        """Deal turn and river for all boards"""
        for board in self.boards.values():
            board.community.extend(self.deck[:2])
            self.deck = self.deck[2:]
    
    def calculate_showdown(self) -> Dict:
        """Calculate showdown results"""
        if self.phase != GamePhase.SHOWDOWN:
            return {}
        
        results = []
        subpot = self.pot // 3
        p1_wins = 0
        p2_wins = 0
        
        for board_id, board in self.boards.items():
            # Determine if each player should use PLO rules for this board
            p1_is_plo = board.type in [BoardType.P1_PLO, BoardType.BOTH_PLO]
            p2_is_plo = board.type in [BoardType.P2_PLO, BoardType.BOTH_PLO]
            
            # Evaluate hands with correct rules for each player
            p1_eval = self._evaluate_best_hand(board.p1_cards, board.community, p1_is_plo)
            p2_eval = self._evaluate_best_hand(board.p2_cards, board.community, p2_is_plo)
            
            winner = self._compare_hands(p1_eval, p2_eval)
            winner_hand = None
            if winner == 1:
                p1_wins += 1
                winner_hand = p1_eval['name'] if p1_eval else 'No valid hand'
            elif winner == 2:
                p2_wins += 1
                winner_hand = p2_eval['name'] if p2_eval else 'No valid hand'
            else:
                # Tie - show both hands
                winner_hand = f"Tie: {p1_eval['name'] if p1_eval else 'No valid hand'}"
            
            results.append({
                'board': board_id,
                'type': board.type.value,
                'winner': winner,
                'winner_hand': winner_hand,  # What the winner won with
                'p1_hand': p1_eval['name'] if p1_eval else 'No valid hand',
                'p2_hand': p2_eval['name'] if p2_eval else 'No valid hand',
                'p1_type': 'PLO' if p1_is_plo else 'NL',  # Show what rules P1 used
                'p2_type': 'PLO' if p2_is_plo else 'NL',  # Show what rules P2 used
                'pot': subpot
            })
        
        # Calculate payouts with sweep bonus
        p1_total = 0
        p2_total = 0
        sweep_bonus = False
        
        if p1_wins == 3:
            # Player 1 sweeps - 2x pot!
            p1_total = self.pot * 2
            self.players[1].bankroll += p1_total
            sweep_bonus = True
        elif p2_wins == 3:
            # Player 2 sweeps - 2x pot!
            p2_total = self.pot * 2
            self.players[2].bankroll += p2_total
            sweep_bonus = True
        else:
            # Normal distribution
            for result in results:
                if result['winner'] == 1:
                    p1_total += result['pot']
                elif result['winner'] == 2:
                    p2_total += result['pot']
                else:
                    p1_total += result['pot'] // 2
                    p2_total += result['pot'] // 2
            
            # Handle remainder
            remainder = self.pot - (p1_total + p2_total)
            if remainder > 0:
                p1_total += remainder
            
            self.players[1].bankroll += p1_total
            self.players[2].bankroll += p2_total
        
        self.phase = GamePhase.COMPLETE
        
        return {
            'results': results,
            'p1_total': p1_total,
            'p2_total': p2_total,
            'sweep_bonus': sweep_bonus,
            'final_bankrolls': {
                1: self.players[1].bankroll,
                2: self.players[2].bankroll
            }
        }
    
    def _evaluate_best_hand(self, hole_cards: List[Card], community: List[Card], is_plo: bool) -> Dict:
        """Evaluate the best possible hand"""
        import itertools
        
        if not hole_cards or not community:
            return {'rank': 0, 'value': 0, 'name': 'No cards'}
        
        best_eval = None
        
        if is_plo:
            # PLO: Must use exactly 2 hole and 3 community
            for h2 in itertools.combinations(hole_cards, 2):
                for c3 in itertools.combinations(community, 3):
                    hand = list(h2) + list(c3)
                    eval = self._eval_five_cards(hand)
                    if best_eval is None or eval['rank'] > best_eval['rank'] or \
                       (eval['rank'] == best_eval['rank'] and eval['value'] > best_eval['value']):
                        best_eval = eval
        else:
            # NLHE: Best 5 of 7
            all_cards = hole_cards + community
            for combo in itertools.combinations(all_cards, 5):
                eval = self._eval_five_cards(list(combo))
                if best_eval is None or eval['rank'] > best_eval['rank'] or \
                   (eval['rank'] == best_eval['rank'] and eval['value'] > best_eval['value']):
                    best_eval = eval
        
        return best_eval if best_eval else {'rank': 0, 'value': 0, 'name': 'No valid hand'}
    
    def _eval_five_cards(self, cards: List[Card]) -> Dict:
        """Basic 5-card poker hand evaluation"""
        if len(cards) != 5:
            return {'rank': 0, 'value': 0, 'name': 'Invalid'}
        
        rank_values = {r: i+2 for i, r in enumerate(RANKS)}
        values = sorted([rank_values[c.rank] for c in cards], reverse=True)
        suits = [c.suit for c in cards]
        
        # Count ranks
        counts = {}
        for v in values:
            counts[v] = counts.get(v, 0) + 1
        groups = sorted([(cnt, v) for v, cnt in counts.items()], reverse=True)
        
        is_flush = len(set(suits)) == 1
        is_straight = self._check_straight(values)
        
        # Determine hand rank
        if is_flush and is_straight:
            return {'rank': 8, 'value': max(values), 'name': 'Straight Flush'}
        elif groups[0][0] == 4:
            return {'rank': 7, 'value': groups[0][1] * 100, 'name': 'Four of a Kind'}
        elif groups[0][0] == 3 and len(groups) >= 2 and groups[1][0] == 2:
            return {'rank': 6, 'value': groups[0][1] * 100 + groups[1][1], 'name': 'Full House'}
        elif is_flush:
            return {'rank': 5, 'value': sum(v * (10 ** (4-i)) for i, v in enumerate(values)), 'name': 'Flush'}
        elif is_straight:
            return {'rank': 4, 'value': max(values), 'name': 'Straight'}
        elif groups[0][0] == 3:
            return {'rank': 3, 'value': groups[0][1] * 100, 'name': 'Three of a Kind'}
        elif groups[0][0] == 2 and len(groups) >= 2 and groups[1][0] == 2:
            return {'rank': 2, 'value': groups[0][1] * 100 + groups[1][1], 'name': 'Two Pair'}
        elif groups[0][0] == 2:
            return {'rank': 1, 'value': groups[0][1] * 100, 'name': 'One Pair'}
        else:
            return {'rank': 0, 'value': sum(v * (10 ** (4-i)) for i, v in enumerate(values)), 'name': 'High Card'}
    
    def _check_straight(self, values: List[int]) -> bool:
        """Check if values form a straight"""
        unique = sorted(set(values), reverse=True)
        if len(unique) < 5:
            return False
        
        # Check wheel (A-2-3-4-5)
        if set(values) == {14, 5, 4, 3, 2}:
            return True
        
        # Check normal straight
        for i in range(len(unique) - 4):
            if unique[i] - unique[i+4] == 4:
                return True
        
        return False
    
    def _compare_hands(self, eval1: Dict, eval2: Dict) -> int:
        """Compare two hand evaluations. Returns 1, 2, or 0 (tie)"""
        if eval1['rank'] > eval2['rank']:
            return 1
        elif eval2['rank'] > eval1['rank']:
            return 2
        elif eval1['value'] > eval2['value']:
            return 1
        elif eval2['value'] > eval1['value']:
            return 2
        else:
            return 0
    
    def get_game_state(self, player_id: Optional[int] = None) -> Dict:
        """Get current game state (filtered for specific player if provided)"""
        state = {
            'room_id': self.room_id,
            'phase': self.phase.value,
            'current_player': self.current_player,
            'pot': self.pot,
            'boards': {}
        }
        
        # Add board info
        for board_id, board in self.boards.items():
            # Simplify board type for frontend display
            display_type = board.type.value
            if board.type == BoardType.BOTH_PLO:
                display_type = 'plo'
            elif board.type in [BoardType.P1_PLO, BoardType.P2_PLO]:
                # Show as mixed during placement, PLO/NL based on player perspective
                if player_id == 1 and board.type == BoardType.P1_PLO:
                    display_type = 'plo'
                elif player_id == 2 and board.type == BoardType.P2_PLO:
                    display_type = 'plo'
                elif board.type != BoardType.PENDING:
                    display_type = 'nlhe'
            
            board_data = {
                'type': display_type,
                'actual_type': board.type.value,  # Keep actual type for debugging
                'community': [c.to_dict() for c in board.community]
            }
            
            # Show cards based on phase and player
            if self.phase in [GamePhase.SHOWDOWN, GamePhase.COMPLETE]:
                # Show all cards
                board_data['p1_cards'] = [c.to_dict() for c in board.p1_cards]
                board_data['p2_cards'] = [c.to_dict() for c in board.p2_cards]
            else:
                # Show only own cards during placement
                if player_id == 1:
                    board_data['p1_cards'] = [c.to_dict() for c in board.p1_cards]
                    board_data['p2_cards'] = [{'hidden': True}] * len(board.p2_cards)
                elif player_id == 2:
                    board_data['p1_cards'] = [{'hidden': True}] * len(board.p1_cards)
                    board_data['p2_cards'] = [c.to_dict() for c in board.p2_cards]
                else:
                    # Observer sees card backs
                    board_data['p1_cards'] = [{'hidden': True}] * len(board.p1_cards)
                    board_data['p2_cards'] = [{'hidden': True}] * len(board.p2_cards)
            
            state['boards'][board_id] = board_data
        
        # Add player info
        state['players'] = {}
        for pid, player in self.players.items():
            # Hide opponent's hand
            hide_hand = (player_id != pid) and self.phase != GamePhase.COMPLETE
            state['players'][pid] = player.to_dict(hide_hand=hide_hand)
        
        return state
