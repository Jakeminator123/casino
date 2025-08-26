"""
Eight Cards Poker - Multiplayer Server
Flask + Socket.IO backend for real-time multiplayer
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import os
import random
import string
from typing import Dict
from game_engine import GameEngine, GamePhase

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app, origins="*")
# Use threading mode for compatibility with Python 3.12+
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Store active game rooms
game_rooms: Dict[str, GameEngine] = {}
# Map session IDs to room and player info
sessions: Dict[str, Dict] = {}

def generate_room_id() -> str:
    """Generate a random 6-character room ID"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@app.route('/')
def index():
    """Serve the game client"""
    import os
    frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
    return send_from_directory(frontend_path, 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    import os
    frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'static')
    return send_from_directory(frontend_path, path)

@app.route('/health')
def health_check():
    """Health check endpoint for deployment"""
    return jsonify({'status': 'healthy', 'rooms': len(game_rooms)})

# Socket.IO Events

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    emit('connected', {'session_id': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')
    
    # Leave any active game
    if request.sid in sessions:
        session = sessions[request.sid]
        room_id = session['room_id']
        player_id = session['player_id']
        
        leave_room(room_id)
        
        # Notify other players
        emit('player_left', {
            'player_id': player_id
        }, room=room_id, skip_sid=request.sid)
        
        # Clean up if room is empty
        if room_id in game_rooms:
            game = game_rooms[room_id]
            game.remove_player(request.sid)
            if len(game.players) == 0:
                del game_rooms[room_id]
                print(f'Room {room_id} closed')
        
        del sessions[request.sid]

@socketio.on('create_room')
def handle_create_room(data):
    """Create a new game room"""
    player_name = data.get('player_name', 'Player 1')
    room_id = generate_room_id()
    
    # Create new game
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
        
        # Send initial game state
        emit('game_state', game.get_game_state(player_id))
        
        print(f'Room {room_id} created by {player_name}')
    else:
        emit('error', {'message': 'Failed to create room'})

@socketio.on('join_room')
def handle_join_room(data):
    """Join an existing game room"""
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
        
        # Notify all players in room
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
        
        print(f'{player_name} joined room {room_id}')
        
        # Auto-start betting if both players present
        if len(game.players) == 2:
            emit('ready_to_bet', {}, room=room_id)
    else:
        emit('error', {'message': 'Room is full'})

@socketio.on('place_bet')
def handle_place_bet(data):
    """Handle bet placement"""
    if request.sid not in sessions:
        emit('error', {'message': 'Not in a game'})
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_id = session['player_id']
    bet_amount = data.get('amount', 50)
    
    if room_id not in game_rooms:
        emit('error', {'message': 'Game not found'})
        return
    
    game = game_rooms[room_id]
    
    # Store bet intent
    if not hasattr(game, 'pending_bets'):
        game.pending_bets = {}
    
    game.pending_bets[player_id] = bet_amount
    
    # Check if both players have bet
    if len(game.pending_bets) == 2:
        if game.place_bets(game.pending_bets):
            game.start_game()
            game.pending_bets = {}
            
            # Send updated game state to all players
            for sid, sess in sessions.items():
                if sess['room_id'] == room_id:
                    socketio.emit('game_started', 
                                game.get_game_state(sess['player_id']),
                                room=sid)
            
            print(f'Game started in room {room_id}')
        else:
            emit('error', {'message': 'Invalid bet amount'}, room=room_id)
    else:
        # Notify that we're waiting for other player
        emit('bet_placed', {
            'player_id': player_id,
            'amount': bet_amount
        }, room=room_id)

@socketio.on('move_card')
def handle_move_card(data):
    """Handle card movement"""
    if request.sid not in sessions:
        emit('error', {'message': 'Not in a game'})
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_id = session['player_id']
    
    if room_id not in game_rooms:
        emit('error', {'message': 'Game not found'})
        return
    
    game = game_rooms[room_id]
    
    card_id = data.get('card_id')
    from_location = data.get('from')
    to_location = data.get('to')
    
    if game.move_card(player_id, card_id, from_location, to_location):
        # Send updated state to both players
        for sid, sess in sessions.items():
            if sess['room_id'] == room_id:
                socketio.emit('game_state', 
                            game.get_game_state(sess['player_id']),
                            room=sid)
    else:
        emit('error', {'message': 'Invalid move'})

@socketio.on('confirm_placement')
def handle_confirm_placement(data):
    """Handle placement confirmation"""
    if request.sid not in sessions:
        emit('error', {'message': 'Not in a game'})
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_id = session['player_id']
    
    if room_id not in game_rooms:
        emit('error', {'message': 'Game not found'})
        return
    
    game = game_rooms[room_id]
    
    if game.confirm_placement(player_id):
        # Send updated state
        for sid, sess in sessions.items():
            if sess['room_id'] == room_id:
                socketio.emit('game_state', 
                            game.get_game_state(sess['player_id']),
                            room=sid)
        
        # Check if ready for showdown
        if game.phase == GamePhase.SHOWDOWN:
            results = game.calculate_showdown()
            emit('showdown_results', results, room=room_id)
    else:
        emit('error', {'message': 'Invalid placement'})

@socketio.on('request_rematch')
def handle_rematch(data):
    """Handle rematch request"""
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
        game.phase = GamePhase.BETTING
        
        # Reset player bets and ready status
        for player in game.players.values():
            player.bet = 0
            player.ready = False
            player.hand = []
        
        emit('ready_to_bet', {}, room=room_id)
    else:
        emit('rematch_requested', {'player_id': player_id}, room=room_id)

@socketio.on('send_message')
def handle_message(data):
    """Handle chat messages"""
    if request.sid not in sessions:
        return
    
    session = sessions[request.sid]
    room_id = session['room_id']
    player_name = session['player_name']
    message = data.get('message', '')
    
    if message and len(message) < 200:  # Limit message length
        emit('chat_message', {
            'player_name': player_name,
            'message': message
        }, room=room_id)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    print(f"""
    ===================================
    Eight Cards Poker - Multiplayer Server
    Starting on port {port}
    
    To play locally:
    1. Run this server
    2. Open http://localhost:{port} in two browser windows
    3. Create room in first window
    4. Join room in second window
    ===================================
    """)
    
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
