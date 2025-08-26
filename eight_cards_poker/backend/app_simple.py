"""
Eight Cards Poker - Simple Server (No eventlet, guaranteed to work)
Fallback server if main app.py has issues
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import os
import sys

# Add parent directory to path to import game_engine
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from game_engine import GameEngine, GamePhase, BoardType
import random
import string
from typing import Dict

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'app', 'dist'))
app.config['SECRET_KEY'] = 'dev-secret-key-simple'

# Maximum CORS compatibility
CORS(app, resources={r"/*": {"origins": "*"}})

# Use threading mode - no eventlet needed!
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    ping_timeout=60,
    ping_interval=25,
    logger=False,
    engineio_logger=False
)

# Store active game rooms
game_rooms: Dict[str, GameEngine] = {}
# Map session IDs to room and player info  
sessions: Dict[str, Dict] = {}

def generate_room_id() -> str:
    """Generate a random 6-character room ID"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/')
def index():
    """Serve the game client (built React app in prod)"""
    dist_path = app.static_folder
    index_path = os.path.join(dist_path, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(dist_path, 'index.html')
    # fallback to legacy static
    legacy_frontend = os.path.join(os.path.dirname(__file__), '..', 'frontend')
    return send_from_directory(legacy_frontend, 'index.html')

@app.route('/assets/<path:path>')
def serve_assets(path):
    """Serve built assets from Vite prod build"""
    dist_assets = os.path.join(app.static_folder, 'assets')
    if os.path.exists(dist_assets):
        return send_from_directory(dist_assets, path)
    legacy_static = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'static')
    return send_from_directory(legacy_static, path)

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'rooms': len(game_rooms)})

@socketio.on('connect')
def handle_connect():
    print(f'✅ Client connected: {request.sid}')
    emit('connected', {'session_id': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'❌ Client disconnected: {request.sid}')
    
    if request.sid in sessions:
        session = sessions[request.sid]
        room_id = session['room_id']
        player_id = session['player_id']
        
        leave_room(room_id)
        emit('player_left', {'player_id': player_id}, room=room_id, skip_sid=request.sid)
        
        if room_id in game_rooms:
            game = game_rooms[room_id]
            game.remove_player(request.sid)
            if len(game.players) == 0:
                del game_rooms[room_id]
                print(f'🗑️ Room {room_id} closed')
        
        del sessions[request.sid]

@socketio.on('create_room')
def handle_create_room(data):
    player_name = data.get('player_name', 'Player 1')
    room_id = generate_room_id()
    
    game = GameEngine(room_id)
    player_id = game.add_player(request.sid, player_name)
    
    if player_id:
        game_rooms[room_id] = game
        sessions[request.sid] = {
            'room_id': room_id,
            'player_id': player_id,
            'player_name': player_name
        }
        
        join_room(room_id)
        
        emit('room_created', {
            'room_id': room_id,
            'player_id': player_id,
            'player_name': player_name
        })
        
        emit('game_state', game.get_game_state(player_id))
        print(f'🎮 Room {room_id} created by {player_name}')
    else:
        emit('error', {'message': 'Failed to create room'})

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('room_id', '').upper()
    player_name = data.get('player_name', 'Player 2')
    
    if room_id not in game_rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    game = game_rooms[room_id]
    player_id = game.add_player(request.sid, player_name)
    
    if player_id:
        sessions[request.sid] = {
            'room_id': room_id,
            'player_id': player_id,
            'player_name': player_name
        }
        
        join_room(room_id)
        
        emit('room_joined', {
            'room_id': room_id,
            'player_id': player_id,
            'player_name': player_name
        })
        
        emit('player_joined', {
            'player_id': player_id,
            'player_name': player_name
        }, room=room_id)
        
        # Send game state to all players
        for sid, session in sessions.items():
            if session['room_id'] == room_id:
                socketio.emit('game_state', 
                            game.get_game_state(session['player_id']),
                            room=sid)
        
        print(f'👥 {player_name} joined room {room_id}')
        
        if len(game.players) == 2:
            emit('ready_to_bet', {}, room=room_id)
    else:
        emit('error', {'message': 'Room is full'})

@socketio.on('place_bet')
def handle_place_bet(data):
    if request.sid not in sessions:
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_id = session['player_id']
    bet_amount = data.get('amount', 50)
    
    if room_id not in game_rooms:
        return
    
    game = game_rooms[room_id]
    
    if not hasattr(game, 'pending_bets'):
        game.pending_bets = {}
    
    game.pending_bets[player_id] = bet_amount
    
    if len(game.pending_bets) == 2:
        if game.place_bets(game.pending_bets):
            game.start_game()
            game.pending_bets = {}
            
            for sid, sess in sessions.items():
                if sess['room_id'] == room_id:
                    socketio.emit('game_started', 
                                game.get_game_state(sess['player_id']),
                                room=sid)
            
            print(f'🎲 Game started in room {room_id}')
    else:
        emit('bet_placed', {
            'player_id': player_id,
            'amount': bet_amount
        }, room=room_id)

@socketio.on('move_card')
def handle_move_card(data):
    if request.sid not in sessions:
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_id = session['player_id']
    
    if room_id not in game_rooms:
        return
    
    game = game_rooms[room_id]
    
    if game.move_card(player_id, data.get('card_id'), data.get('from'), data.get('to')):
        for sid, sess in sessions.items():
            if sess['room_id'] == room_id:
                socketio.emit('game_state', 
                            game.get_game_state(sess['player_id']),
                            room=sid)

@socketio.on('confirm_placement')
def handle_confirm_placement(data):
    if request.sid not in sessions:
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_id = session['player_id']
    
    if room_id not in game_rooms:
        return
    
    game = game_rooms[room_id]
    
    if game.confirm_placement(player_id):
        for sid, sess in sessions.items():
            if sess['room_id'] == room_id:
                socketio.emit('game_state', 
                            game.get_game_state(sess['player_id']),
                            room=sid)
        
        if game.phase == GamePhase.SHOWDOWN:
            results = game.calculate_showdown()
            print(f'🏆 Showdown in room {room_id}')
            print(f'Results being sent: {results}')  # Debug log
            emit('showdown_results', results, room=room_id)

@socketio.on('request_rematch')
def handle_rematch(data):
    if request.sid not in sessions:
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_id = session['player_id']
    
    if room_id not in game_rooms:
        return
    
    game = game_rooms[room_id]
    
    # Track rematch requests
    if not hasattr(game, 'rematch_requests'):
        game.rematch_requests = set()
    
    game.rematch_requests.add(player_id)
    
    if len(game.rematch_requests) == 2:
        # Both want rematch - reset for new game
        game.rematch_requests = set()
        game.phase = GamePhase.WAITING
        
        # Reset player bets and ready status
        for player in game.players.values():
            player.bet = 0
            player.ready = False
            player.hand = []
        
        # Clear boards
        for board in game.boards.values():
            board.community = []
            board.p1_cards = []
            board.p2_cards = []
            board.type = BoardType.PENDING
        
        print(f'🔄 Rematch starting in room {room_id}')
        emit('ready_to_bet', {}, room=room_id)
    else:
        emit('rematch_requested', {'player_id': player_id}, room=room_id)

@socketio.on('send_message')
def handle_message(data):
    if request.sid not in sessions:
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_name = session['player_name']
    message = data.get('message', '')
    
    if message and len(message) < 200:
        emit('chat_message', {
            'player_name': player_name,
            'message': message
        }, room=room_id)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    print(f"""
    ╔════════════════════════════════════════════╗
    ║   Eight Cards Poker - Multiplayer Server   ║
    ║           (Simple/Safe Version)            ║
    ╠════════════════════════════════════════════╣
    ║  Server starting on port {port}...            ║
    ║                                            ║
    ║  LOCAL PLAY:                               ║
    ║  → http://localhost:{port}                   ║
    ║                                            ║
    ║  ONLINE PLAY (with ngrok):                ║
    ║  1. Keep this running                      ║
    ║  2. Open new terminal                      ║
    ║  3. Run: ngrok http {port}                   ║
    ║  4. Share the ngrok URL                    ║
    ╚════════════════════════════════════════════╝
    """)
    
    # Run with threading - no eventlet needed!
    socketio.run(app, host='0.0.0.0', port=port, debug=False, use_reloader=False)
