const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8000;

// Serve static files - use 'dist' folder in production, root in development
const staticDir = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'dist')
    : __dirname;
app.use(express.static(staticDir));

// Game rooms storage
const rooms = new Map();
const waitingPlayers = [];

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Handle player looking for match
    socket.on('findMatch', () => {
        // Check if there's a waiting player
        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.shift();
            const roomId = `room_${socket.id}_${opponent.id}`;

            // Create room
            socket.join(roomId);
            opponent.join(roomId);

            // Initialize room state with ready status
            rooms.set(roomId, {
                player1: socket.id,
                player2: opponent.id,
                player1Ready: false,
                player2Ready: false,
                score: { player1: 0, player2: 0 },
                timeRemaining: 300,
                ballOwner: 'player1',
                gameStarted: false
            });

            // Notify both players
            socket.emit('matchFound', {
                roomId,
                playerNumber: 1,
                opponentId: opponent.id
            });
            opponent.emit('matchFound', {
                roomId,
                playerNumber: 2,
                opponentId: socket.id
            });

            console.log('Match created:', roomId);
        } else {
            // Add to waiting list
            waitingPlayers.push(socket);
            socket.emit('waitingForOpponent');
            console.log('Player waiting:', socket.id);
        }
    });

    // Handle player movement
    socket.on('playerMove', (data) => {
        socket.to(data.roomId).emit('opponentMove', {
            x: data.x,
            y: data.y,
            vx: data.vx,
            vy: data.vy,
            isGrounded: data.isGrounded,
            defending: data.defending
        });
    });

    // Handle ball updates (from host/player 1)
    socket.on('ballUpdate', (data) => {
        socket.to(data.roomId).emit('ballSync', {
            x: data.x,
            y: data.y,
            vx: data.vx,
            vy: data.vy,
            inAir: data.inAir,
            owner: data.owner,
            shotFrom: data.shotFrom
        });
    });

    // Handle ball pickup (from host/player 1)
    socket.on('ballPickup', (data) => {
        socket.to(data.roomId).emit('ballPickupSync', {
            owner: data.owner
        });
    });

    // Handle shooting
    socket.on('playerShoot', (data) => {
        socket.to(data.roomId).emit('opponentShoot', {
            shotPower: data.shotPower,
            shotAccuracy: data.shotAccuracy,
            lockedPower: data.lockedPower
        });
    });

    // Handle scoring
    socket.on('playerScored', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            // Update score
            if (data.scorer === 1) {
                room.score.player1 += data.points;
            } else {
                room.score.player2 += data.points;
            }

            // Broadcast score update
            io.to(data.roomId).emit('scoreUpdate', {
                score: room.score,
                scorer: data.scorer,
                points: data.points
            });
        }
    });

    // Handle game state updates
    socket.on('gameStateUpdate', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            room.timeRemaining = data.timeRemaining;
            room.ballOwner = data.ballOwner;

            // Broadcast to other player
            socket.to(data.roomId).emit('gameStateSync', {
                timeRemaining: data.timeRemaining,
                ballOwner: data.ballOwner
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);

        // Remove from waiting list
        const waitingIndex = waitingPlayers.indexOf(socket);
        if (waitingIndex > -1) {
            waitingPlayers.splice(waitingIndex, 1);
        }

        // Find and cleanup room
        rooms.forEach((room, roomId) => {
            if (room.player1 === socket.id || room.player2 === socket.id) {
                // Notify other player
                socket.to(roomId).emit('opponentDisconnected');
                rooms.delete(roomId);
                console.log('Room deleted:', roomId);
            }
        });
    });

    // Handle player ready state
    socket.on('playerReady', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            // Update ready state
            if (room.player1 === socket.id) {
                room.player1Ready = data.ready;
            } else if (room.player2 === socket.id) {
                room.player2Ready = data.ready;
            }

            // Notify opponent of ready state change
            socket.to(data.roomId).emit('opponentReadyState', {
                ready: data.ready
            });

            // Check if both players are ready
            if (room.player1Ready && room.player2Ready && !room.gameStarted) {
                room.gameStarted = true;
                io.to(data.roomId).emit('bothReady');
                console.log('Both players ready in room:', data.roomId);
            }
        }
    });

    // Handle cancel matchmaking search
    socket.on('cancelSearch', () => {
        const waitingIndex = waitingPlayers.indexOf(socket);
        if (waitingIndex > -1) {
            waitingPlayers.splice(waitingIndex, 1);
            console.log('Player cancelled search:', socket.id);
        }
    });

    // Handle leaving the ready lobby (before game starts)
    socket.on('leaveLobby', (data) => {
        if (data.roomId) {
            const room = rooms.get(data.roomId);
            if (room && !room.gameStarted) {
                // Notify opponent
                socket.to(data.roomId).emit('opponentLeftLobby');
                socket.leave(data.roomId);

                // Delete the room
                rooms.delete(data.roomId);
                console.log('Player left lobby, room deleted:', data.roomId);
            }
        }
    });

    // Handle return to menu (during game)
    socket.on('leaveRoom', (data) => {
        if (data.roomId) {
            socket.to(data.roomId).emit('opponentLeft');
            socket.leave(data.roomId);

            // Cleanup room if both players left
            const room = rooms.get(data.roomId);
            if (room) {
                rooms.delete(data.roomId);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
