
# ctshared_server_opt.py
from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room
from ctshared_engine import SharedGame
import os

app = Flask(__name__, static_folder='.')
# try to use eventlet (better WS); fallback to threading
async_mode = 'threading'
try:
    import eventlet  # noqa
    async_mode = 'eventlet'
except Exception:
    pass

socketio = SocketIO(app, cors_allowed_origins="*", async_mode=async_mode, ping_interval=25, ping_timeout=60)

GAMES = {}  # room -> SharedGame
SESS = {}   # sid -> (room, pid)
BG = {}     # room -> bg-task

@app.route('/')
def root():
    return send_from_directory('.', 'ctshared_client_opt.html')

@app.route('/health')
def health():
    return 'ok', 200

def broadcast(room):
    if room in GAMES:
        socketio.emit('state', GAMES[room].snapshot(), to=room)

def ensure_bg(room):
    if room in BG:
        return
    def loop():
        while room in GAMES and GAMES[room].phase == 'PLAYING':
            GAMES[room].tick()
            broadcast(room)
            socketio.sleep(0.2)  # 5 Hz
        BG.pop(room, None)
    BG[room] = socketio.start_background_task(loop)

@socketio.on('create_room')
def create_room(data):
    room = data.get('room','lobby')
    if room in GAMES:
        emit('error', {'message':'Rummet finns redan.'}); return
    name = data.get('name','P1')
    ante = int(data.get('ante',10))
    seed = int(data.get('seed',42))
    pieces = int(data.get('pieces',20))
    g = SharedGame(room=room, ante=ante, seed=seed, piece_count=pieces)
    g.players['P1'].name = name
    GAMES[room] = g
    join_room(room)
    SESS[request.sid] = (room,'P1')
    emit('joined', {'room': room, 'as':'P1', 'async_mode': async_mode})
    broadcast(room)

@socketio.on('join_room')
def join_room_evt(data):
    room = data.get('room','lobby')
    if room not in GAMES:
        emit('error', {'message':'Finns inget sådant rum.'}); return
    if any(val==(room,'P2') for val in SESS.values()):
        emit('error', {'message':'Rummet är fullt.'}); return
    name = data.get('name','P2')
    join_room(room)
    SESS[request.sid] = (room,'P2')
    GAMES[room].players['P2'].name = name
    emit('joined', {'room': room, 'as':'P2', 'async_mode': async_mode})
    broadcast(room)

@socketio.on('start')
def start_evt(data):
    sid = request.sid
    if sid not in SESS:
        emit('error', {'message':'Inte i ett rum.'}); return
    room, pid = SESS[sid]
    g = GAMES[room]
    if g.phase != 'LOBBY':
        emit('error', {'message':'Spelet har redan startat.'}); return
    if not any(v==(room,'P2') for v in SESS.values()):
        emit('error', {'message':'Väntar på motståndare.'}); return
    g.start()
    ensure_bg(room)
    broadcast(room)

@socketio.on('valid')
def valid_evt(data):
    sid = request.sid
    if sid not in SESS:
        emit('error', {'message':'Inte i ett rum.'}); return
    room, pid = SESS[sid]
    g = GAMES[room]
    rot = int(data.get('rot',0)) % 4
    cols = g.valid_columns(rot) if g.phase=='PLAYING' else []
    emit('valid_result', {'rot': rot, 'cols': cols})

@socketio.on('place')
def place_evt(data):
    sid = request.sid
    if sid not in SESS:
        emit('error', {'message':'Inte i ett rum.'}); return
    room, pid = SESS[sid]
    g = GAMES[room]
    rot = int(data.get('rot',0)) % 4
    x = int(data.get('x',0))
    ok, msg = g.place(pid, rot, x)
    emit('place_result', {'ok': ok, 'message': msg})
    broadcast(room)

@socketio.on('disconnect')
def disc():
    if request.sid in SESS:
        room, pid = SESS.pop(request.sid)
        socketio.emit('info', {'message': f'{pid} kopplade från.'}, to=room)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, use_reloader=False)
