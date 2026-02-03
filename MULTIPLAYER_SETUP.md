# Basketball 1v1 - Multiplayer Setup

## Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

## Running the Server

**Start the multiplayer server:**
```bash
npm start
```

The server will start on `http://localhost:8000`

## How to Play

1. Open your browser and go to `http://localhost:8000`
2. You'll see a main menu with two options:
   - **Play vs CPU**: Single-player mode against AI
   - **Play Online**: Multiplayer mode against another player

### Playing Online (Multiplayer)

1. Click "Play Online"
2. The game will show "Waiting for opponent..."
3. Open another browser window or have a friend connect to the same server
4. When both players are ready, the match will start automatically!

### Controls

**Desktop:**
- Arrow Keys or A/D - Move left/right
- SPACE - Jump
- CLICK (while in air) - Start shooting sequence
  - First click: Set power (aim for gold zone)
  - Second click: Set accuracy (aim for green zone)
- D (hold) - Defend/Block

**Mobile:**
- Touch screen edges to move
- Tap to jump
- Tap while jumping to shoot

## Game Features

- **Real-time multiplayer** using Socket.io
- **3-minute timed games**
- **Distance-based scoring:**
  - 2 points: Close range (inside arc)
  - 3 points: Medium range (outside arc)
  - 5 points: Half-court shots
- **Skill-based shooting** with power and accuracy meters
- **First to 21 wins** or most points when time runs out

## Server Features

- Automatic player matching
- Real-time game state synchronization
- Disconnect handling
- Multiple simultaneous games supported

## Troubleshooting

### Port Already in Use

If port 8000 is already in use, you can change it by setting the PORT environment variable:

```bash
PORT=3000 npm start
```

### Connection Issues

- Make sure the server is running
- Check that your firewall isn't blocking the connection
- Try refreshing the browser

### Playing Over Network

To play with someone on your local network:

1. Find your IP address:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

2. Start the server:
   ```bash
   npm start
   ```

3. Share your IP with others:
   ```
   http://YOUR_IP_ADDRESS:8000
   ```

## Development

The game consists of:
- `server.js`: Node.js server handling multiplayer logic
- `main.js`: Client-side game engine
- `index.html`: Game UI with menu
- `style.css`: Styling

Socket.io events:
- `findMatch`: Request to join a game
- `matchFound`: Match was created
- `playerMove`: Send player position
- `opponentMove`: Receive opponent position
- `ballUpdate`: Sync ball state
- `playerScored`: Report scoring
- `scoreUpdate`: Receive score updates

Enjoy the game!
