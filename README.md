# Basketball 1v1 - Player vs CPU

A fast-paced side-view basketball game where you compete against a CPU opponent. Jump, shoot, and defend your way to victory!

## Features

- **1v1 Gameplay** - Battle against a smart CPU opponent
- **Side-view Action** - NBA Jam-style perspective
- **Jump & Shoot Mechanics** - Jump with SPACE, click in the air to shoot
- **Defense System** - Put your hands up to block opponent shots
- **Timing-based Shooting** - Shoot at the apex of your jump for best accuracy
- **Smart AI** - CPU that moves, shoots, and defends
- **First to 11 Wins** - Classic street ball scoring
- **Web Audio** - Procedurally generated sound effects

## How to Play

### Running the Game

1. **Option 1: Local Static Server (Recommended)**
   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000

   # Using Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```
   Then open `http://localhost:8000` in your browser.

2. **Option 2: Open Directly**
   - Simply open `index.html` in a modern web browser

### Controls

**Desktop:**
- **Arrow Keys or A/D** - Move left and right
- **SPACE** - Jump
- **CLICK (while in air)** - Shoot the ball
- **D Key (hold)** - Put hands up to defend/block
- **R** - Restart game
- Click restart button (↻) to restart
- Click speaker icon to mute/unmute

**Mobile:**
- **Touch left/right** on screen edges to move
- **Tap** to jump
- **Tap again while jumping** to shoot
- Tap speaker icon to mute/unmute

### Gameplay Tips

1. **Timing is Everything**: Shoot at the peak of your jump for maximum accuracy
2. **Defense Wins Games**: Hold D to put your hands up when the CPU is shooting - you can block their shot!
3. **Chase Loose Balls**: If a shot misses or gets blocked, be the first to grab the ball
4. **Position Matters**: Get closer to the hoop for easier shots
5. **Watch the CPU**: The CPU will try to defend you - fake them out or take quick shots

## Game Mechanics

### Shooting System

- Jump with SPACE, then click while in the air to shoot
- Shooting at the **apex of your jump** (middle of the jump) gives best accuracy
- Shooting too early or too late adds randomness to your shot
- Distance from hoop affects shot power automatically

### Defense & Blocking

- Hold **D** to put your hands up in defensive stance
- If you're close to the shooter with hands up, you have a chance to block
- Blocked shots become loose balls - be ready to grab them!

### Ball Possession

- Ball stays with you until you shoot
- After scoring, the other player gets the ball
- Loose balls on the ground can be picked up by running over them
- First player to reach a loose ball gets possession

### AI Opponent

The CPU opponent will:
- Move toward the hoop when it has the ball
- Shoot when in good position
- Chase you when you have the ball
- Try to block your shots when you jump
- Pick up loose balls

## Project Structure

```
basketball-1v1/
├── index.html          # HTML structure with canvas and UI
├── style.css           # Responsive styling
├── main.js             # Complete game engine and AI
└── README.md           # This file
```

## Tunable Constants

Want to adjust the game feel? Edit these constants in [main.js:5-38](main.js#L5-L38):

```javascript
GRAVITY: 1200           // How fast players/ball fall (800-1600)
JUMP_POWER: 500         // Jump height (400-600)
MOVE_SPEED: 250         // Player movement speed (200-350)
BALL_GRAVITY: 800       // How fast ball falls (600-1000)
SHOT_POWER_MIN: 400     // Minimum shot strength (300-500)
SHOT_POWER_MAX: 700     // Maximum shot strength (600-900)
BLOCK_RANGE: 80         // How close to block shots (60-120)
WIN_SCORE: 11           // Points needed to win (5-21)
```

### Tuning Tips

- **Game too slow?** Increase `MOVE_SPEED` and decrease `GRAVITY`
- **Shots too weak?** Increase `SHOT_POWER_MAX`
- **Too easy to score?** Decrease `HOOP_RADIUS` or increase shot variance
- **CPU too hard?** Decrease `AI_SHOOT_CHANCE` or increase `AI_REACTION_TIME`
- **Want faster games?** Decrease `WIN_SCORE` to 5 or 7

## Game States

The game progresses through these states:
1. **Playing** - Active gameplay with player vs CPU
2. **Scored** - Someone scored, brief pause before reset
3. **Game Over** - A player reached 11 points

## Technical Details

### Physics System

- Simple 2D physics with gravity and velocity
- Jump arc controlled by initial velocity and gravity
- Ball has independent physics when shot
- Ground collision detection for players and ball

### Rendering

- HTML5 Canvas with 60 FPS via `requestAnimationFrame`
- Side-view court with hoops on left and right
- Players rendered as rectangles with circular heads
- Defense stance shows raised arms
- Ball has gradient shading

### AI Implementation

Simple but effective AI that:
- Uses state machine (has ball / defending / chasing loose ball)
- Moves toward optimal shooting position
- Times jumps and shoots at apex
- Defends based on player position
- Has reaction delays to be fair

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- ES6 JavaScript
- Web Audio API (optional, for sound)

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Development

### Customizing Gameplay

**Adjust AI Difficulty:**
```javascript
// In main.js CONFIG
AI_REACTION_TIME: 0.3,  // Lower = faster CPU reactions
AI_SHOOT_CHANCE: 0.6,   // Higher = CPU shoots more often
```

**Change Court Layout:**
```javascript
COURT_FLOOR_Y: 500,     // Floor position
HOOP_LEFT_X: 100,       // Left hoop position
HOOP_RIGHT_X: 700,      // Right hoop position
HOOP_Y: 250,            // Hoop height
```

**Modify Player Size:**
```javascript
PLAYER_WIDTH: 30,       // Player width
PLAYER_HEIGHT: 60,      // Player height
```

## Known Limitations

- Simple 2D side-view (not top-down or 3D)
- Basic stick-figure character rendering
- No dribbling animations
- No steal mechanic (only loose ball pickup)
- CPU has simple AI (not adaptive)

## Future Enhancements

Possible additions:
- Multiplayer (local 2-player)
- Power-ups (speed boost, larger hoop, etc.)
- Different difficulty levels
- Tournament mode
- Character customization
- Better animations
- Dribbling and stealing mechanics
- Shot clock / game clock
- Different courts/themes

## Credits

Side-view basketball game built from scratch with HTML5 Canvas and vanilla JavaScript.

## License

Free to use and modify for personal and educational purposes.

---

**Have fun and dominate the court!** 🏀
