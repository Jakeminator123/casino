
# ctshared_engine.py
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional
import time, random

WIDTH, HEIGHT = 10, 20

TETROMINOS = {
    'I': [
        [(0,1),(1,1),(2,1),(3,1)],
        [(2,0),(2,1),(2,2),(2,3)],
        [(0,2),(1,2),(2,2),(3,2)],
        [(1,0),(1,1),(1,2),(1,3)],
    ],
    'O': [
        [(1,0),(2,0),(1,1),(2,1)],
        [(1,0),(2,0),(1,1),(2,1)],
        [(1,0),(2,0),(1,1),(2,1)],
        [(1,0),(2,0),(1,1),(2,1)],
    ],
    'T': [
        [(1,0),(0,1),(1,1),(2,1)],
        [(1,0),(1,1),(2,1),(1,2)],
        [(0,1),(1,1),(2,1),(1,2)],
        [(1,0),(0,1),(1,1),(1,2)],
    ],
    'J': [
        [(0,0),(0,1),(1,1),(2,1)],
        [(1,0),(2,0),(1,1),(1,2)],
        [(0,1),(1,1),(2,1),(2,2)],
        [(1,0),(1,1),(0,2),(1,2)],
    ],
    'L': [
        [(2,0),(0,1),(1,1),(2,1)],
        [(1,0),(1,1),(1,2),(2,2)],
        [(0,1),(1,1),(2,1),(0,2)],
        [(0,0),(1,0),(1,1),(1,2)],
    ],
    'S': [
        [(1,0),(2,0),(0,1),(1,1)],
        [(1,0),(1,1),(2,1),(2,2)],
        [(1,1),(2,1),(0,2),(1,2)],
        [(0,0),(0,1),(1,1),(1,2)],
    ],
    'Z': [
        [(0,0),(1,0),(1,1),(2,1)],
        [(2,0),(1,1),(2,1),(1,2)],
        [(0,1),(1,1),(1,2),(2,2)],
        [(1,0),(0,1),(1,1),(0,2)],
    ]
}

def make_grid():
    return [[None for _ in range(WIDTH)] for _ in range(HEIGHT)]

def grid_to_strings(grid: List[List[Optional[str]]]) -> List[str]:
    return [''.join(c if c else '.' for c in row) for row in grid]

def hard_drop_position(grid, piece_name, rotation, x_offset):
    cells = TETROMINOS[piece_name][rotation % 4]
    # horizontal bounds check
    min_x = min(x for x,_ in cells)
    max_x = max(x for x,_ in cells)
    if x_offset + min_x < 0 or x_offset + max_x >= WIDTH:
        return None
    y = 0
    while True:
        collided = False
        out = False
        for (cx, cy) in cells:
            xx = x_offset + cx
            yy = y + cy
            if yy >= HEIGHT:
                out = True
                break
            if yy >= 0 and grid[yy][xx] is not None:
                collided = True
                break
        if collided or out:
            y -= 1
            final = [(x_offset + cx, y + cy) for (cx,cy) in cells]
            # validate
            for (fx,fy) in final:
                if fy < 0 or fy >= HEIGHT or fx < 0 or fx >= WIDTH:
                    return None
                if grid[fy][fx] is not None:
                    return None
            return final
        y += 1

def lock_and_clear(grid, piece_name, cells) -> int:
    for (x,y) in cells:
        if y < 0:
            return -1  # topped
        grid[y][x] = piece_name
    # clear lines
    cleared = 0
    y = HEIGHT-1
    while y >= 0:
        if all(grid[y][x] is not None for x in range(WIDTH)):
            del grid[y]
            grid.insert(0, [None]*WIDTH)
            cleared += 1
        else:
            y -= 1
    return cleared

@dataclass
class PState:
    name: str = 'P'
    lines: int = 0
    tetris: int = 0
    tops: bool = False

@dataclass
class SharedGame:
    room: str
    ante: int = 10
    seed: int = 42
    piece_count: int = 20
    phase: str = 'LOBBY'          # LOBBY -> PLAYING -> SHOWDOWN
    grid: List[List[Optional[str]]] = field(default_factory=make_grid)
    players: Dict[str, PState] = field(default_factory=lambda: {'P1': PState('P1'), 'P2': PState('P2')})
    queue: List[str] = field(default_factory=list)
    piece_idx: int = 0
    turn: str = 'P1'              # whose turn it is
    deadline_ts: float = 0.0      # time limit per move

    def __post_init__(self):
        self.rng = random.Random(self.seed)
        self._build_queue()

    def _build_queue(self):
        names = list(TETROMINOS.keys())
        q = []
        while len(q) < self.piece_count:
            bag = names[:]
            self.rng.shuffle(bag)
            q.extend(bag)
        self.queue = q[:self.piece_count]

    def start(self):
        self.phase = 'PLAYING'
        self.piece_idx = 0
        self.turn = 'P1' if self.rng.random() < 0.5 else 'P2'
        self.deadline_ts = time.time() + 20.0

    def valid_columns(self, rotation: int) -> List[int]:
        if self.phase != 'PLAYING': return []
        if self.piece_idx >= len(self.queue): return []
        piece = self.queue[self.piece_idx]
        cells = TETROMINOS[piece][rotation % 4]
        min_x = -min(x for x,_ in cells)
        max_x = WIDTH - 1 - max(x for x,_ in cells)
        cols = []
        for x in range(min_x, max_x+1):
            pos = hard_drop_position(self.grid, piece, rotation, x)
            if pos is not None:
                cols.append(x)
        return cols

    def _auto_choice(self) -> Dict[str,int]:
        # Choose center-most valid at rot 0, else other rotations
        for rot in [0,1,2,3]:
            cols = self.valid_columns(rot)
            if cols:
                return {'rot': rot, 'x': cols[len(cols)//2]}
        # If none valid -> top out
        return {'rot': 0, 'x': 0}

    def place(self, pid: str, rotation: int, x: int):
        if self.phase != 'PLAYING':
            return False, 'Fel fas.'
        if pid != self.turn:
            return False, 'Inte din tur.'
        rotation = rotation % 4
        valid = self.valid_columns(rotation)
        if x not in valid:
            return False, 'Ogiltig kolumn för den rotationen.'
        piece = self.queue[self.piece_idx]
        cells = hard_drop_position(self.grid, piece, rotation, x)
        if cells is None:
            # treat as top out
            self.players[pid].tops = True
            self._advance_turn(end_after=True)
            return True, 'Top-out.'
        cleared = lock_and_clear(self.grid, piece, cells)
        if cleared < 0:
            self.players[pid].tops = True
        else:
            self.players[pid].lines += cleared
            if cleared == 4:
                self.players[pid].tetris += 1
        self._advance_turn()
        return True, 'OK'

    def _advance_turn(self, end_after: bool=False):
        self.piece_idx += 1
        if end_after or self.piece_idx >= len(self.queue) or any(p.tops for p in self.players.values()):
            self.phase = 'SHOWDOWN'
            return
        # switch player and set deadline
        self.turn = 'P1' if self.turn == 'P2' else 'P2'
        self.deadline_ts = time.time() + 20.0

    def tick(self):
        if self.phase != 'PLAYING':
            return
        if time.time() > self.deadline_ts:
            # auto place for current player
            choice = self._auto_choice()
            self.place(self.turn, choice['rot'], choice['x'])

    def result(self):
        pot = self.ante * 2
        p1, p2 = self.players['P1'], self.players['P2']
        if p1.lines > p2.lines:
            return {'winner':'P1','payout':{'P1':pot,'P2':0}}
        if p2.lines > p1.lines:
            return {'winner':'P2','payout':{'P1':0,'P2':pot}}
        if p1.tetris > p2.tetris:
            return {'winner':'P1','payout':{'P1':pot,'P2':0}}
        if p2.tetris > p1.tetris:
            return {'winner':'P2','payout':{'P1':0,'P2':pot}}
        if p1.tops and not p2.tops:
            return {'winner':'P2','payout':{'P1':0,'P2':pot}}
        if p2.tops and not p1.tops:
            return {'winner':'P1','payout':{'P1':pot,'P2':0}}
        return {'winner':None,'payout':{'P1':pot//2,'P2':pot - pot//2}}

    def snapshot(self):
        s = {
            'phase': self.phase,
            'turn': self.turn,
            'queue_len': len(self.queue),
            'piece_idx': self.piece_idx,
            'current_piece': self.queue[self.piece_idx] if self.phase=='PLAYING' and self.piece_idx < len(self.queue) else None,
            'next_piece': self.queue[self.piece_idx+1] if self.phase=='PLAYING' and self.piece_idx+1 < len(self.queue) else None,
            'ante': self.ante,
            'pot': self.ante*2,
            'deadline_ts': self.deadline_ts,
            'grid': grid_to_strings(self.grid),
            'players': {
                pid: {'name': p.name, 'lines': p.lines, 'tetris': p.tetris, 'tops': p.tops}
                for pid,p in self.players.items()
            }
        }
        if self.phase == 'SHOWDOWN':
            s['result'] = self.result()
        return s
