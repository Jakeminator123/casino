
# ctduel_engine.py
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional
import time, random, copy

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

def grid_to_strings(grid):
    rows = []
    for y in range(HEIGHT):
        row = ''.join(grid[y][x] if grid[y][x] else '.' for x in range(WIDTH))
        rows.append(row)
    return rows

def strings_to_grid(rows):
    g = make_grid()
    for y in range(min(HEIGHT, len(rows))):
        for x in range(min(WIDTH, len(rows[y]))):
            ch = rows[y][x]
            g[y][x] = None if ch == '.' else ch
    return g

def hard_drop_position(grid, piece_name, rotation, x_offset):
    cells = TETROMINOS[piece_name][rotation % 4]
    # compute lowest y such that piece does not collide (spawn from top)
    y = 0
    # ensure in-bounds horizontally
    min_x = min(x for x,y0 in cells)
    max_x = max(x for x,y0 in cells)
    if x_offset + min_x < 0 or x_offset + max_x >= WIDTH:
        return None
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
            # step back
            y -= 1
            final_cells = [(x_offset + cx, y + cy) for (cx,cy) in cells]
            # ensure final within bounds
            for (fx,fy) in final_cells:
                if fy < 0 or fy >= HEIGHT or fx < 0 or fx >= WIDTH:
                    return None
                if grid[fy][fx] is not None:
                    return None
            return final_cells
        y += 1

def lock_and_clear(grid, piece_name, cells) -> int:
    for (x,y) in cells:
        if y < 0:  # topped out
            return -1
        grid[y][x] = piece_name
    # clear lines
    cleared = 0
    y = HEIGHT-1
    while y >= 0:
        if all(grid[y][x] is not None for x in range(WIDTH)):
            # remove row
            del grid[y]
            grid.insert(0, [None]*WIDTH)
            cleared += 1
        else:
            y -= 1
    return cleared

@dataclass
class Player:
    name: str
    grid: List[List[Optional[str]]] = field(default_factory=make_grid)
    lines: int = 0
    tetris: int = 0
    tops: bool = False  # topped out

@dataclass
class DuelGame:
    room: str
    ante: int = 10
    seed: int = 42
    piece_count: int = 20
    phase: str = 'LOBBY'  # LOBBY -> PLAYING -> SHOWDOWN
    players: Dict[str, Player] = field(default_factory=lambda: {'P1': Player('P1'), 'P2': Player('P2')})
    queue: List[str] = field(default_factory=list)
    piece_idx: int = 0
    deadline_ts: float = 0.0
    pending: Dict[str, Optional[Dict]] = field(default_factory=lambda: {'P1': None, 'P2': None})

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
        self.deadline_ts = time.time() + 20.0  # 20s timebank per piece
        self.pending = {'P1': None, 'P2': None}

    def valid_columns(self, pid: str, rotation: int) -> List[int]:
        # based on current board
        g = self.players[pid].grid
        piece = self.queue[self.piece_idx]
        cols = []
        # x can range such that piece fits
        min_x = -min(x for x,y in TETROMINOS[piece][rotation%4])
        max_x = WIDTH - 1 - max(x for x,y in TETROMINOS[piece][rotation%4])
        for x in range(min_x, max_x+1):
            cells = hard_drop_position(g, piece, rotation, x)
            if cells is not None:
                cols.append(x)
        return cols

    def place(self, pid: str, rotation: int, x: int):
        if self.phase != 'PLAYING':
            return False, 'Fel fas.'
        if pid not in self.players:
            return False, 'Okänd spelare.'
        rotation = rotation % 4
        valid = self.valid_columns(pid, rotation)
        if x not in valid:
            return False, 'Ogiltigt X för den rotationen.'
        self.pending[pid] = {'rot': rotation, 'x': x}
        # resolve if both submitted or time up
        if self.pending['P1'] and self.pending['P2']:
            self._resolve_piece()
        else:
            # If time expired already, also resolve
            if time.time() > self.deadline_ts:
                self._resolve_piece()
        return True, 'OK'

    def _auto_fill(self, pid: str):
        # choose center-most valid at rotation 0
        for rot in range(4):
            valid = self.valid_columns(pid, rot)
            if valid:
                mid = valid[len(valid)//2]
                return {'rot': rot, 'x': mid}
        # no valid -> top out
        return {'rot': 0, 'x': 0}

    def _resolve_piece(self):
        # fill missing
        for pid in ['P1','P2']:
            if not self.pending[pid]:
                self.pending[pid] = self._auto_fill(pid)
        piece = self.queue[self.piece_idx]
        # apply P1 then P2 (order doesn't matter since separate grids)
        for pid in ['P1','P2']:
            mv = self.pending[pid]
            grid = self.players[pid].grid
            cells = hard_drop_position(grid, piece, mv['rot'], mv['x'])
            if cells is None:
                # cannot place -> topped
                self.players[pid].tops = True
            else:
                cleared = lock_and_clear(grid, piece, cells)
                if cleared < 0:
                    self.players[pid].tops = True
                else:
                    self.players[pid].lines += cleared
                    if cleared == 4:
                        self.players[pid].tetris += 1
        self.pending = {'P1': None, 'P2': None}
        self.piece_idx += 1
        if self.piece_idx >= len(self.queue) or any(p.tops for p in self.players.values()):
            self.phase = 'SHOWDOWN'
        else:
            self.deadline_ts = time.time() + 20.0

    def tick(self):
        # call periodically to auto-resolve on timeout
        if self.phase == 'PLAYING' and time.time() > self.deadline_ts:
            self._resolve_piece()

    def result(self):
        # compute winner and payout
        pot = self.ante * 2
        p1 = self.players['P1']
        p2 = self.players['P2']
        # primary: lines
        if p1.lines > p2.lines:
            return {'winner':'P1','payout':{'P1':pot,'P2':0}}
        if p2.lines > p1.lines:
            return {'winner':'P2','payout':{'P1':0,'P2':pot}}
        # tie-break 1: tetris count
        if p1.tetris > p2.tetris:
            return {'winner':'P1','payout':{'P1':pot,'P2':0}}
        if p2.tetris > p1.tetris:
            return {'winner':'P2','payout':{'P1':0,'P2':pot}}
        # tie-break 2: fewer tops (i.e., not topped wins)
        if p1.tops and not p2.tops:
            return {'winner':'P2','payout':{'P1':0,'P2':pot}}
        if p2.tops and not p1.tops:
            return {'winner':'P1','payout':{'P1':pot,'P2':0}}
        # split
        return {'winner':None,'payout':{'P1':pot//2,'P2':pot - pot//2}}

    def snapshot(self):
        # Return lightweight state for clients
        s = {
            'phase': self.phase,
            'queue_len': len(self.queue),
            'piece_idx': self.piece_idx,
            'current_piece': self.queue[self.piece_idx] if self.phase=='PLAYING' and self.piece_idx < len(self.queue) else None,
            'next_piece': self.queue[self.piece_idx+1] if self.phase=='PLAYING' and self.piece_idx+1 < len(self.queue) else None,
            'ante': self.ante,
            'pot': self.ante*2,
            'deadline_ts': self.deadline_ts,
            'pending': self.pending.copy(),
            'players': {
                pid: {
                    'name': p.name,
                    'lines': p.lines,
                    'tetris': p.tetris,
                    'tops': p.tops,
                    'grid': grid_to_strings(p.grid)
                } for pid,p in self.players.items()
            }
        }
        if self.phase == 'SHOWDOWN':
            s['result'] = self.result()
        return s
