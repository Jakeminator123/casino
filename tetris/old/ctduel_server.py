
# ctduel_server.py
from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room
from ctduel_engine import DuelGame
import time, os

app = Flask(__name__, static_folder='.')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

GAMES = {}         # room -> DuelGame
SESS = {}          # sid -> (room, pid)

@app.route('/')
def root():
    return send_from_directory('.', 'ctduel_client.html')

@app.route('/health')
def health():
    return 'ok', 200

def broadcast(room):
    game = GAMES[room]
    s = game.snapshot()
    socketio.emit('state', s, to=room)

@socketio.on('create_room')
def create_room(data):
    room = data.get('room','lobby')
    if room in GAMES:
        emit('error', {'message':'Rummet finns redan.'})
        return
    name = data.get('name','P1')
    ante = int(data.get('ante',10))
    seed = int(data.get('seed',42))
    pieces = int(data.get('pieces',20))
    g = DuelGame(room=room, ante=ante, seed=seed, piece_count=pieces)
    g.players['P1'].name = name
    GAMES[room] = g
    join_room(room)
    SESS[request.sid] = (room,'P1')
    emit('joined', {'room': room, 'as':'P1'})
    broadcast(room)

@socketio.on('join_room')
def join_room_evt(data):
    room = data.get('room','lobby')
    if room not in GAMES:
        emit('error', {'message':'Finns inget sådant rum.'})
        return
    # already has P2?
    if any(val==(room,'P2') for val in SESS.values()):
        emit('error', {'message':'Rummet är fullt.'}); return
    name = data.get('name','P2')
    join_room(room)
    SESS[request.sid] = (room,'P2')
    GAMES[room].players['P2'].name = name
    emit('joined', {'room': room, 'as':'P2'})
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
    # kräver båda spelarna
    # simple check: if any SESS entry has (room,'P2')
    if not any(v==(room,'P2') for v in SESS.values()):
        emit('error', {'message':'Väntar på motståndare.'}); return
    g.start()
    broadcast(room)

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
    emit('place_result', {'ok':ok, 'message': msg})
    broadcast(room)

@socketio.on('valid')
def valid_evt(data):
    sid = request.sid
    if sid not in SESS: 
        emit('error', {'message':'Inte i ett rum.'}); return
    room, pid = SESS[sid]
    g = GAMES[room]
    rot = int(data.get('rot',0)) % 4
    cols = g.valid_columns(pid, rot) if g.phase == 'PLAYING' else []
    emit('valid_result', {'rot': rot, 'cols': cols})

@socketio.on('tick')
def tick_evt():
    sid = request.sid
    if sid not in SESS: return
    room, pid = SESS[sid]
    g = GAMES[room]
    g.tick()
    broadcast(room)

@socketio.on('disconnect')
def disc():
    if request.sid in SESS:
        room, pid = SESS.pop(request.sid)
        # leave game as-is; opponent can wait or reload
        socketio.emit('info', {'message': f'{pid} kopplade från.'}, to=room)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
