// ====================
// MULTIPLAYER SETUP
// ====================

let socket = null;
let gameMode = 'singleplayer'; // 'singleplayer' or 'multiplayer'
let multiplayerData = {
    roomId: null,
    playerNumber: null, // 1 or 2
    opponentId: null
};

// ====================
// GAME CONSTANTS
// ====================

const CONFIG = {
    // Physics
    GRAVITY: 1200,
    JUMP_POWER: 500,
    MOVE_SPEED: 250,
    BALL_GRAVITY: 800,
    SHOT_POWER_MIN: 400,
    SHOT_POWER_MAX: 700,
    SHOT_ANGLE_MIN: -60,
    SHOT_ANGLE_MAX: 60,

    // Player dimensions
    PLAYER_WIDTH: 30,
    PLAYER_HEIGHT: 60,

    // Ball
    BALL_RADIUS: 10,

    // Court
    COURT_FLOOR_Y: 500,
    HOOP_LEFT_X: 100,
    HOOP_RIGHT_X: 700,
    HOOP_Y: 250,
    HOOP_RADIUS: 35,

    // Gameplay
    SHOOT_TIMING_WINDOW: 0.3, // seconds - sweet spot in jump
    BLOCK_RANGE: 80,
    STEAL_RANGE: 40,
    WIN_SCORE: 21, // First to 21 wins (street ball rules)
    GAME_TIME: 300, // 5 minutes in seconds

    // AI
    AI_REACTION_TIME: 0.3,
    AI_SHOOT_CHANCE: 0.6,
};

// ====================
// GAME STATE
// ====================

const STATES = {
    PLAYING: 'playing',
    SCORED: 'scored',
    GAME_OVER: 'gameover'
};

const game = {
    state: STATES.PLAYING,
    score: { player: 0, cpu: 0 },
    timeRemaining: CONFIG.GAME_TIME,

    player: {
        x: 600,
        y: CONFIG.COURT_FLOOR_Y,
        vx: 0,
        vy: 0,
        width: CONFIG.PLAYER_WIDTH,
        height: CONFIG.PLAYER_HEIGHT,
        isGrounded: true,
        hasJumped: false,
        jumpTime: 0,
        facingLeft: true,
        defending: false,
    },

    cpu: {
        x: 200,
        y: CONFIG.COURT_FLOOR_Y,
        vx: 0,
        vy: 0,
        width: CONFIG.PLAYER_WIDTH,
        height: CONFIG.PLAYER_HEIGHT,
        isGrounded: true,
        hasJumped: false,
        jumpTime: 0,
        facingLeft: false,
        defending: false,
        nextAction: 0,
    },

    ball: {
        x: 600,
        y: CONFIG.COURT_FLOOR_Y - 20,
        vx: 0,
        vy: 0,
        owner: 'player', // 'player', 'cpu', or null
        inAir: false,
        shotFrom: null, // { x, y, shooter } - track shot origin
    },

    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    scale: 1,
    keys: {},
    muted: false,

    // Shooting mechanic
    shotCharging: false,
    shotStage: 0, // 0 = not shooting, 1 = power meter, 2 = accuracy meter
    shotPower: 0,
    lockedPower: 0, // Locked in power from stage 1
    shotAccuracy: 0,
    accuracyDirection: 1, // 1 or -1 for oscillating
    timeScale: 1, // 1 = normal, 0 = frozen, 0.1 = slow-mo
};

// ====================
// INITIALIZATION
// ====================

function init() {
    game.canvas = document.getElementById('game-canvas');
    game.ctx = game.canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setupInputHandlers();
    setupUI();

    // Start game loop
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = lastTime ? (timestamp - lastTime) / 1000 : 0;
        lastTime = timestamp;

        update(Math.min(deltaTime, 0.1));
        render();

        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = game.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;
    game.canvas.width = rect.width * dpr;
    game.canvas.height = rect.height * dpr;
    game.canvas.style.width = rect.width + 'px';
    game.canvas.style.height = rect.height + 'px';

    game.scale = rect.width / game.width;
    game.ctx.scale(dpr, dpr);
}

// ====================
// INPUT HANDLING
// ====================

function setupInputHandlers() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        game.keys[e.key.toLowerCase()] = true;

        if (e.key === ' ' && game.player.isGrounded && !game.player.hasJumped) {
            jump(game.player);
        }
        if (e.key.toLowerCase() === 'd') {
            game.player.defending = true;
        }
        if (e.key.toLowerCase() === 'r') {
            resetGame();
        }
    });

    document.addEventListener('keyup', (e) => {
        game.keys[e.key.toLowerCase()] = false;
        if (e.key.toLowerCase() === 'd') {
            game.player.defending = false;
        }
    });

    // Mouse/touch for shooting
    game.canvas.addEventListener('mousedown', handleShoot);
    game.canvas.addEventListener('touchstart', handleShoot);
}

function handleShoot(e) {
    e.preventDefault();

    // Player must be in air and have the ball
    if (!game.player.isGrounded && game.ball.owner === 'player') {
        if (game.shotStage === 0) {
            // Stage 1: Start power meter - FREEZE TIME
            game.shotCharging = true;
            game.shotStage = 1;
            game.shotPower = 0;
            game.timeScale = 0; // Freeze time
            playSound('jump'); // Audio feedback for freeze
        } else if (game.shotStage === 1) {
            // Stage 2: Lock power, start accuracy meter
            game.lockedPower = game.shotPower;
            game.shotStage = 2;
            game.shotAccuracy = 50; // Start at middle
            playSound('jump'); // Audio feedback
        } else if (game.shotStage === 2) {
            // Stage 3: Release the shot - RESUME TIME
            shoot(game.player);
            game.shotCharging = false;
            game.shotStage = 0;
            game.timeScale = 1; // Resume normal time
        }
    }
}

// ====================
// GAME MECHANICS
// ====================

function jump(entity) {
    if (entity.isGrounded) {
        entity.vy = -CONFIG.JUMP_POWER;
        entity.isGrounded = false;
        entity.hasJumped = true;
        entity.jumpTime = 0;
        playSound('jump');
    }
}

function shoot(entity) {
    if (game.ball.owner !== (entity === game.player ? 'player' : 'cpu')) return;

    // Calculate shot quality based on jump timing
    const jumpProgress = entity.jumpTime / 0.5; // 0.5s is typical jump duration
    const timingQuality = 1 - Math.abs(jumpProgress - 0.5) * 2; // Best at apex

    // Check if defender is blocking
    const opponent = entity === game.player ? game.cpu : game.player;
    const isBlocked = opponent.defending &&
                     Math.abs(opponent.x - entity.x) < CONFIG.BLOCK_RANGE &&
                     Math.abs(opponent.y - entity.y) < 60;

    if (isBlocked && Math.random() > 0.3) {
        // Shot blocked!
        game.ball.vx = (Math.random() - 0.5) * 200;
        game.ball.vy = -100;
        game.ball.owner = null;
        game.ball.inAir = true;
        game.ball.shotFrom = null; // Reset shot tracking
        playSound('block');
        return;
    }

    // Calculate shot
    const targetX = entity === game.player ? CONFIG.HOOP_LEFT_X : CONFIG.HOOP_RIGHT_X;
    const targetY = CONFIG.HOOP_Y;

    const dx = targetX - entity.x;
    const dy = targetY - (entity.y - entity.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // For player: use skill-based mechanics
    let shotPowerMultiplier = 1;
    let accuracyQuality = 0.5; // Default medium accuracy

    if (entity === game.player && game.shotCharging) {
        // Power: 50-100 is optimal (full power), below is weaker
        const powerScore = game.shotPower <= 50
            ? game.shotPower / 50
            : 1;
        shotPowerMultiplier = 0.5 + powerScore * 0.5; // Range: 0.5 to 1.0

        // Accuracy: IN GREEN ZONE (40-60) = perfect, outside = gets worse
        const distanceFromCenter = Math.abs(game.shotAccuracy - 50);
        if (distanceFromCenter <= 10) {
            // In green zone - PERFECT accuracy
            accuracyQuality = 1.0;
        } else if (distanceFromCenter <= 20) {
            // Close to green - good accuracy
            accuracyQuality = 0.8;
        } else {
            // Far from green - poor accuracy
            accuracyQuality = 0.3 - (distanceFromCenter - 20) / 30 * 0.3;
        }
    } else if (entity === game.cpu) {
        // CPU has decent but not perfect accuracy
        accuracyQuality = 0.7 + Math.random() * 0.2;
        shotPowerMultiplier = 0.9 + Math.random() * 0.1;
    }

    // Calculate accuracy variance - MUCH more punishing for bad timing
    const totalAccuracy = (timingQuality * 0.2 + accuracyQuality * 0.8); // Accuracy meter is most important

    // Distance-based difficulty multiplier
    const distanceFromHoop = Math.abs(entity.x - targetX);
    let difficultyMultiplier = 1;

    if (distanceFromHoop <= 150) {
        // 2-pointer: EASIER - more forgiving
        difficultyMultiplier = 0.5;
    } else if (distanceFromHoop < 350) {
        // 3-pointer: HARDER - less forgiving
        difficultyMultiplier = 2.0;
    } else {
        // Half-court (350+ distance): ALMOST IMPOSSIBLE - very unforgiving
        difficultyMultiplier = 5.0;
    }

    // Perfect accuracy (green zone) = PERFECT shot with NO spread
    // Good = small spread
    // Bad = massive spread
    let accuracyVariance = 0;
    if (totalAccuracy >= 0.95) {
        // PERFECT - guaranteed straight shot (even for half-court)
        accuracyVariance = 0;
    } else if (totalAccuracy >= 0.8) {
        // Very good - tiny spread (affected by distance)
        accuracyVariance = 3 * difficultyMultiplier;
    } else if (totalAccuracy >= 0.6) {
        // Good - small spread (more affected by distance)
        accuracyVariance = 15 * difficultyMultiplier;
    } else {
        // Bad - large spread (heavily affected by distance)
        accuracyVariance = (1 - totalAccuracy) * 250 * difficultyMultiplier;
    }

    const angleOffset = (Math.random() - 0.5) * accuracyVariance;

    const angle = Math.atan2(dy, dx) + angleOffset * Math.PI / 180;

    // Power calculation based on player's locked power and distance
    let powerQuality = 1;
    if (entity === game.player && game.shotStage === 2) {
        // Use locked power from stage 1
        if (game.lockedPower >= 75) {
            powerQuality = 1.0; // Perfect power
        } else if (game.lockedPower >= 50) {
            powerQuality = 0.8 + (game.lockedPower - 50) / 25 * 0.2;
        } else {
            powerQuality = 0.5 + game.lockedPower / 50 * 0.3;
        }
    }

    // Calculate base power - ensure minimum power for proper arc
    // Short shots need less horizontal power but still need arc
    const basePower = CONFIG.SHOT_POWER_MIN + (distance / 500) * (CONFIG.SHOT_POWER_MAX - CONFIG.SHOT_POWER_MIN);
    const horizontalPower = basePower * powerQuality;

    // Calculate trajectory with proper arc
    // For skill-based shooting, ensure the ball goes UP first
    const horizontalVelocity = Math.cos(angle) * horizontalPower;
    let verticalVelocity = Math.sin(angle) * horizontalPower;

    // Ensure minimum arc for close shots (2-pointers)
    // Perfect power should give a nice arc even for close shots
    if (entity === game.player && game.shotStage === 2 && distanceFromHoop <= 150) {
        // For 2-pointers, ensure good arc based on power quality
        const minArc = -350 * powerQuality; // Negative = upward
        if (verticalVelocity > minArc) {
            verticalVelocity = minArc;
        }
    } else if (entity === game.player && game.shotStage === 2) {
        // For 3-pointers and half-court, ensure sufficient arc
        const minArc = -450 * powerQuality;
        if (verticalVelocity > minArc) {
            verticalVelocity = minArc;
        }
    }

    game.ball.vx = horizontalVelocity;
    game.ball.vy = verticalVelocity;
    game.ball.owner = null;
    game.ball.inAir = true;

    // Track shot origin for distance-based scoring
    game.ball.shotFrom = {
        x: entity.x,
        y: entity.y,
        shooter: entity === game.player ? 'player' : 'cpu',
        targetHoop: targetX
    };

    playSound('shoot');
}

function resetGame() {
    game.score = { player: 0, cpu: 0 };
    game.timeRemaining = CONFIG.GAME_TIME;
    game.state = STATES.PLAYING;
    resetPositions('player');
    updateScoreDisplay();
    hideMessage();
}

function resetPositions(lastScorer) {
    // Reset players - they always return to their own sides
    // Player defends right side, CPU defends left side
    game.player.x = 600; // Always on right side
    game.player.y = CONFIG.COURT_FLOOR_Y;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.isGrounded = true;
    game.player.hasJumped = false;
    game.player.defending = false;

    game.cpu.x = 200; // Always on left side
    game.cpu.y = CONFIG.COURT_FLOOR_Y;
    game.cpu.vx = 0;
    game.cpu.vy = 0;
    game.cpu.isGrounded = true;
    game.cpu.hasJumped = false;
    game.cpu.defending = false;

    // Give ball to the team that got scored on (defender gets ball after being scored on)
    game.ball.owner = lastScorer === 'player' ? 'cpu' : 'player';
    game.ball.inAir = false;
    game.ball.vx = 0;
    game.ball.vy = 0;

    if (game.ball.owner === 'player') {
        game.ball.x = game.player.x;
        game.ball.y = game.player.y - 20;
    } else {
        game.ball.x = game.cpu.x;
        game.ball.y = game.cpu.y - 20;
    }
}

// ====================
// UPDATE LOGIC
// ====================

function update(dt) {
    if (dt <= 0 || game.state === STATES.GAME_OVER) return;

    // Apply time scale (for slow-mo/freeze effect)
    const scaledDt = dt * game.timeScale;

    // Update game timer (only when not frozen)
    if (game.state === STATES.PLAYING && game.timeScale > 0) {
        game.timeRemaining -= dt;
        if (game.timeRemaining <= 0) {
            game.timeRemaining = 0;
            endGameByTime();
            return;
        }
    }

    updatePlayer(scaledDt);
    updateCPU(scaledDt);
    updateBall(scaledDt);
    checkScoring();

    // Update shot charging mechanics (always at normal speed for UI responsiveness)
    if (game.shotCharging) {
        if (game.shotStage === 1) {
            // Stage 1: Power meter cycles
            game.shotPower += dt * 100;
            if (game.shotPower >= 100) {
                game.shotPower = 0; // Reset to 0 when it reaches max
            }
        } else if (game.shotStage === 2) {
            // Stage 2: Accuracy meter oscillates
            game.shotAccuracy += game.accuracyDirection * dt * 150;
            if (game.shotAccuracy >= 100) {
                game.shotAccuracy = 100;
                game.accuracyDirection = -1;
            } else if (game.shotAccuracy <= 0) {
                game.shotAccuracy = 0;
                game.accuracyDirection = 1;
            }
        }
    }
}

function updatePlayer(dt) {
    const p = game.player;

    // Horizontal movement
    if (game.keys['arrowleft'] || game.keys['a']) {
        p.vx = -CONFIG.MOVE_SPEED;
        p.facingLeft = true;
    } else if (game.keys['arrowright'] || game.keys['d']) {
        p.vx = CONFIG.MOVE_SPEED;
        p.facingLeft = false;
    } else {
        p.vx = 0;
    }

    // Apply gravity
    if (!p.isGrounded) {
        p.vy += CONFIG.GRAVITY * dt;
        p.jumpTime += dt;
    }

    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Keep on screen
    p.x = Math.max(50, Math.min(game.width - 50, p.x));

    // Ground collision
    if (p.y >= CONFIG.COURT_FLOOR_Y) {
        p.y = CONFIG.COURT_FLOOR_Y;
        p.vy = 0;
        p.isGrounded = true;
        p.hasJumped = false;
        p.jumpTime = 0;

        // Cancel shot charging when landing
        if (game.shotCharging) {
            game.shotCharging = false;
            game.shotStage = 0;
            game.timeScale = 1; // Resume normal time
        }
    }

    // Emit player position for multiplayer
    emitPlayerMove();
}

function updateCPU(dt) {
    // In multiplayer, opponent position is synced from server
    if (gameMode === 'multiplayer') return;

    const cpu = game.cpu;
    cpu.nextAction -= dt;

    // Simple AI
    if (game.ball.owner === 'cpu') {
        // CPU has ball - move toward hoop and shoot
        const targetX = CONFIG.HOOP_RIGHT_X - 150;

        if (Math.abs(cpu.x - targetX) > 20) {
            cpu.vx = cpu.x < targetX ? CONFIG.MOVE_SPEED : -CONFIG.MOVE_SPEED;
            cpu.facingLeft = cpu.vx < 0;
        } else {
            cpu.vx = 0;

            // Try to shoot
            if (cpu.isGrounded && cpu.nextAction <= 0) {
                jump(cpu);
                cpu.nextAction = 0.3;
            } else if (!cpu.isGrounded && cpu.jumpTime > 0.2 && cpu.jumpTime < 0.4) {
                shoot(cpu);
            }
        }
    } else if (game.ball.owner === 'player') {
        // Defend
        const distToPlayer = Math.abs(cpu.x - game.player.x);

        if (distToPlayer > 50) {
            cpu.vx = cpu.x < game.player.x ? CONFIG.MOVE_SPEED * 0.8 : -CONFIG.MOVE_SPEED * 0.8;
            cpu.facingLeft = cpu.vx < 0;
        } else {
            cpu.vx = 0;
            cpu.defending = !game.player.isGrounded && Math.random() > 0.5;
        }

        // Sometimes jump to contest
        if (cpu.isGrounded && !game.player.isGrounded && cpu.nextAction <= 0 && Math.random() > 0.7) {
            jump(cpu);
            cpu.nextAction = 1;
        }
    } else {
        // Chase loose ball
        if (Math.abs(cpu.x - game.ball.x) > 20) {
            cpu.vx = cpu.x < game.ball.x ? CONFIG.MOVE_SPEED : -CONFIG.MOVE_SPEED;
            cpu.facingLeft = cpu.vx < 0;
        } else {
            cpu.vx = 0;
        }
    }

    // Apply physics
    if (!cpu.isGrounded) {
        cpu.vy += CONFIG.GRAVITY * dt;
        cpu.jumpTime += dt;
    }

    cpu.x += cpu.vx * dt;
    cpu.y += cpu.vy * dt;

    cpu.x = Math.max(50, Math.min(game.width - 50, cpu.x));

    if (cpu.y >= CONFIG.COURT_FLOOR_Y) {
        cpu.y = CONFIG.COURT_FLOOR_Y;
        cpu.vy = 0;
        cpu.isGrounded = true;
        cpu.hasJumped = false;
        cpu.jumpTime = 0;
    }
}

function updateBall(dt) {
    if (game.ball.owner === 'player') {
        // Ball follows player
        game.ball.x = game.player.x;
        game.ball.y = game.player.y - game.player.height / 2 - CONFIG.BALL_RADIUS - 5;
        game.ball.vx = 0;
        game.ball.vy = 0;
    } else if (game.ball.owner === 'cpu') {
        // Ball follows CPU
        game.ball.x = game.cpu.x;
        game.ball.y = game.cpu.y - game.cpu.height / 2 - CONFIG.BALL_RADIUS - 5;
        game.ball.vx = 0;
        game.ball.vy = 0;
    } else if (game.ball.inAir) {
        // Ball physics
        game.ball.vy += CONFIG.BALL_GRAVITY * dt;
        game.ball.x += game.ball.vx * dt;
        game.ball.y += game.ball.vy * dt;

        // Floor bounce
        if (game.ball.y >= CONFIG.COURT_FLOOR_Y) {
            game.ball.y = CONFIG.COURT_FLOOR_Y;
            game.ball.vy *= -0.6;
            game.ball.vx *= 0.8;

            if (Math.abs(game.ball.vy) < 20) {
                game.ball.inAir = false;
                game.ball.vy = 0;
            }
        }

        // Wall bounce
        if (game.ball.x < CONFIG.BALL_RADIUS || game.ball.x > game.width - CONFIG.BALL_RADIUS) {
            game.ball.vx *= -0.7;
            game.ball.x = Math.max(CONFIG.BALL_RADIUS, Math.min(game.width - CONFIG.BALL_RADIUS, game.ball.x));
        }
    } else {
        // Ball on ground - check pickup
        const distToPlayer = Math.sqrt(
            Math.pow(game.ball.x - game.player.x, 2) +
            Math.pow(game.ball.y - game.player.y, 2)
        );
        const distToCPU = Math.sqrt(
            Math.pow(game.ball.x - game.cpu.x, 2) +
            Math.pow(game.ball.y - game.cpu.y, 2)
        );

        if (distToPlayer < CONFIG.STEAL_RANGE && distToPlayer < distToCPU) {
            game.ball.owner = 'player';
            playSound('pickup');
        } else if (distToCPU < CONFIG.STEAL_RANGE && distToCPU <= distToPlayer) {
            game.ball.owner = 'cpu';
            playSound('pickup');
        }
    }
}

function checkScoring() {
    // Check if ball goes through hoop
    const hoopLeft = { x: CONFIG.HOOP_LEFT_X, y: CONFIG.HOOP_Y };
    const hoopRight = { x: CONFIG.HOOP_RIGHT_X, y: CONFIG.HOOP_Y };

    // Player's hoop (left) - detection radius varies by shot distance
    if (game.ball.inAir &&
        game.ball.vy > 0 &&
        game.ball.shotFrom) {

        const distanceFromHoop = Math.abs(game.ball.shotFrom.x - game.ball.shotFrom.targetHoop);

        // Adjust detection radius based on shot distance
        let detectionRadius = CONFIG.HOOP_RADIUS;
        if (distanceFromHoop <= 150) {
            // 2-pointer: Much easier - big detection radius
            detectionRadius = CONFIG.HOOP_RADIUS + 20;
        } else if (distanceFromHoop < 350) {
            // 3-pointer: Harder - smaller detection radius
            detectionRadius = CONFIG.HOOP_RADIUS + 5;
        } else {
            // Half-court (350+): Almost impossible - tiny detection radius
            detectionRadius = CONFIG.HOOP_RADIUS - 5;
        }

        if (Math.abs(game.ball.x - hoopLeft.x) < detectionRadius &&
            Math.abs(game.ball.y - hoopLeft.y) < 30) {

            const points = calculatePoints(game.ball.shotFrom);
            game.ball.shotFrom = null; // Prevent multiple scoring
            score('player', points);
        }
    }

    // CPU's hoop (right) - detection radius varies by shot distance
    if (game.ball.inAir &&
        game.ball.vy > 0 &&
        game.ball.shotFrom) {

        const distanceFromHoop = Math.abs(game.ball.shotFrom.x - game.ball.shotFrom.targetHoop);

        // Adjust detection radius based on shot distance
        let detectionRadius = CONFIG.HOOP_RADIUS;
        if (distanceFromHoop <= 150) {
            // 2-pointer: Much easier - big detection radius
            detectionRadius = CONFIG.HOOP_RADIUS + 20;
        } else if (distanceFromHoop < 350) {
            // 3-pointer: Harder - smaller detection radius
            detectionRadius = CONFIG.HOOP_RADIUS + 5;
        } else {
            // Half-court (350+): Almost impossible - tiny detection radius
            detectionRadius = CONFIG.HOOP_RADIUS - 5;
        }

        if (Math.abs(game.ball.x - hoopRight.x) < detectionRadius &&
            Math.abs(game.ball.y - hoopRight.y) < 30) {

            const points = calculatePoints(game.ball.shotFrom);
            game.ball.shotFrom = null; // Prevent multiple scoring
            score('cpu', points);
        }
    }
}

function calculatePoints(shotFrom) {
    // Calculate horizontal distance from shot to target hoop
    const distanceFromHoop = Math.abs(shotFrom.x - shotFrom.targetHoop);

    // 5 points: Half-court shot (shooting from at or past halfway line)
    // Midline is at 400, but we make it slightly easier at 350+ distance
    if (distanceFromHoop >= 350) {
        return 5;
    }
    // 3 points: Outside the three-point arc (150 pixels from hoop)
    else if (distanceFromHoop > 150) {
        return 3;
    }
    // 2 points: Inside the arc
    else {
        return 2;
    }
}

function score(scorer, points) {
    game.score[scorer] += points;
    updateScoreDisplay();
    playSound('score');

    // Emit scoring for multiplayer
    if (scorer === 'player') {
        emitScored(points);
    }

    // Determine message based on points
    let pointMsg = '';
    if (points === 5) pointMsg = '🔥 5 POINTS! Half-court shot!';
    else if (points === 3) pointMsg = '🎯 3-Pointer!';
    else pointMsg = '+2 Points';

    const message = scorer === 'player' ? pointMsg : `CPU Scores ${points} pts`;

    if (game.score[scorer] >= CONFIG.WIN_SCORE) {
        game.state = STATES.GAME_OVER;
        showMessage(scorer === 'player' ? 'YOU WIN! 🏆' : 'CPU WINS!', null);
    } else {
        showMessage(message, 1500);
        setTimeout(() => {
            resetPositions(scorer);
            hideMessage();
        }, 1500);
    }
}

function endGameByTime() {
    game.state = STATES.GAME_OVER;

    if (game.score.player > game.score.cpu) {
        showMessage('TIME\'S UP! YOU WIN! 🏆', null);
    } else if (game.score.cpu > game.score.player) {
        showMessage('TIME\'S UP! CPU WINS!', null);
    } else {
        showMessage('TIME\'S UP! TIE GAME! 🤝', null);
    }
}

// ====================
// RENDERING
// ====================

function render() {
    const ctx = game.ctx;

    // Clear
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, game.width, game.height);

    // Draw court
    drawCourt();

    // Draw hoops
    drawHoop(CONFIG.HOOP_LEFT_X, CONFIG.HOOP_Y, true);
    drawHoop(CONFIG.HOOP_RIGHT_X, CONFIG.HOOP_Y, false);

    // Draw players
    drawPlayer(game.cpu, '#e94560');
    drawPlayer(game.player, '#4CAF50');

    // Draw ball
    drawBall();

    // Draw shooting meters and time freeze effect
    if (game.shotCharging) {
        // Draw subtle overlay to show time is frozen
        ctx.fillStyle = 'rgba(0, 50, 100, 0.15)';
        ctx.fillRect(0, 0, game.width, game.height);

        drawShootingMeters();
    }

    // Draw controls hint
    drawControls();
}

function drawCourt() {
    const ctx = game.ctx;

    // Floor
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, CONFIG.COURT_FLOOR_Y, game.width, game.height - CONFIG.COURT_FLOOR_Y);

    // Court lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    // Midline
    ctx.beginPath();
    ctx.moveTo(game.width / 2, 0);
    ctx.lineTo(game.width / 2, CONFIG.COURT_FLOOR_Y);
    ctx.stroke();

    // Three-point arcs (simplified)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CONFIG.HOOP_LEFT_X, CONFIG.COURT_FLOOR_Y, 150, 0, Math.PI, true);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(CONFIG.HOOP_RIGHT_X, CONFIG.COURT_FLOOR_Y, 150, 0, Math.PI, true);
    ctx.stroke();
}

function drawHoop(x, y, facingRight) {
    const ctx = game.ctx;

    // Backboard
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(x - 3, y - 60, 6, 80);

    // Rim
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.HOOP_RADIUS, 0, Math.PI);
    ctx.stroke();

    // Net
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 20, y);
        ctx.lineTo(x + i * 15, y + 40);
        ctx.stroke();
    }
}

function drawPlayer(player, color) {
    const ctx = game.ctx;
    const x = player.x;
    const y = player.y - player.height;

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(x - player.width / 2, y, player.width, player.height);

    // Head
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Arms (defending)
    if (player.defending) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - player.width / 2, y + 15);
        ctx.lineTo(x - player.width / 2 - 20, y - 10);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + player.width / 2, y + 15);
        ctx.lineTo(x + player.width / 2 + 20, y - 10);
        ctx.stroke();
    }

    // Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - player.width / 2, y, player.width, player.height);
}

function drawBall() {
    const ctx = game.ctx;

    const gradient = ctx.createRadialGradient(
        game.ball.x - 3, game.ball.y - 3, 2,
        game.ball.x, game.ball.y, CONFIG.BALL_RADIUS
    );
    gradient.addColorStop(0, '#ff8c42');
    gradient.addColorStop(1, '#ff6b35');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d64933';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawShootingMeters() {
    const ctx = game.ctx;

    // Draw aiming line to target hoop
    const targetX = CONFIG.HOOP_LEFT_X;
    const targetY = CONFIG.HOOP_Y;

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(game.player.x, game.player.y - game.player.height / 2);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw target reticle at hoop
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 30, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(targetX - 40, targetY);
    ctx.lineTo(targetX + 40, targetY);
    ctx.moveTo(targetX, targetY - 40);
    ctx.lineTo(targetX, targetY + 40);
    ctx.stroke();

    const meterX = game.width / 2 - 100;
    const meterY = 120;
    const meterWidth = 200;
    const meterHeight = 25;

    // Stage indicator
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(game.shotStage === 1 ? 'STEP 1: SET POWER' : 'STEP 2: SET ACCURACY', game.width / 2, meterY - 20);

    if (game.shotStage === 1) {
        // STAGE 1: Power meter
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(meterX - 5, meterY - 5, meterWidth + 10, meterHeight + 10);

        // Power bar background
        ctx.fillStyle = '#333';
        ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

        // Optimal power zone (75-100 = perfect, 50-75 = good)
        ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
        ctx.fillRect(meterX + meterWidth * 0.5, meterY, meterWidth * 0.5, meterHeight);

        // PERFECT zone (75-100)
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.fillRect(meterX + meterWidth * 0.75, meterY, meterWidth * 0.25, meterHeight);

        // Current power
        let powerColor = '#FF5722'; // Red for low
        if (game.shotPower >= 75) {
            powerColor = '#FFD700'; // Gold for perfect
        } else if (game.shotPower >= 50) {
            powerColor = '#4CAF50'; // Green for good
        }

        ctx.fillStyle = powerColor;
        ctx.fillRect(meterX, meterY, meterWidth * (game.shotPower / 100), meterHeight);

        // Power label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('POWER', meterX + meterWidth / 2, meterY - 10);

        // Instructions
        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('Click when in GOLD zone!', meterX + meterWidth / 2, meterY + 50);
    } else if (game.shotStage === 2) {
        // Show locked power value
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        let powerText = 'Power: ';
        if (game.lockedPower >= 75) {
            powerText += 'PERFECT! ⭐';
        } else if (game.lockedPower >= 50) {
            powerText += 'Good';
        } else {
            powerText += 'Weak';
        }
        ctx.fillText(powerText, game.width / 2, meterY - 40);
    }

    // Accuracy meter (only show in stage 2)
    if (game.shotStage === 2) {
        const accMeterY = meterY;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(meterX - 5, accMeterY - 5, meterWidth + 10, meterHeight + 10);

        // Accuracy bar background
        ctx.fillStyle = '#333';
        ctx.fillRect(meterX, accMeterY, meterWidth, meterHeight);

        // Optimal accuracy zone (center 40-60) - BRIGHT GREEN for perfect zone
        ctx.fillStyle = 'rgba(76, 175, 80, 0.6)';
        ctx.fillRect(meterX + meterWidth * 0.4, accMeterY, meterWidth * 0.2, meterHeight);

        // Extra highlight for dead center
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
        ctx.fillRect(meterX + meterWidth * 0.45, accMeterY, meterWidth * 0.1, meterHeight);

        // Moving accuracy indicator
        const indicatorX = meterX + meterWidth * (game.shotAccuracy / 100);
        ctx.fillStyle = '#FF5722';
        ctx.fillRect(indicatorX - 3, accMeterY - 2, 6, meterHeight + 4);

        // Accuracy label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('ACCURACY', meterX + meterWidth / 2, accMeterY - 10);

        // Instructions
        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('Click when PERFECT!', meterX + meterWidth / 2, accMeterY + 50);

        // Show current accuracy quality
        const distanceFromCenter = Math.abs(game.shotAccuracy - 50);
        let qualityText = '';
        let qualityColor = '';
        if (distanceFromCenter <= 10) {
            qualityText = 'PERFECT! ⭐';
            qualityColor = '#FFD700';
        } else if (distanceFromCenter <= 20) {
            qualityText = 'Good';
            qualityColor = '#4CAF50';
        } else {
            qualityText = 'Poor';
            qualityColor = '#FF5722';
        }

        ctx.fillStyle = qualityColor;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(qualityText, meterX + meterWidth / 2, accMeterY + 70);
    }
}

function drawControls() {
    const ctx = game.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('CONTROLS: Arrow Keys/WASD = Move | SPACE = Jump | CLICK = Shoot | D = Defend', 10, 20);
    ctx.fillText('First to 21 wins! | 2pts (inside arc) | 3pts (outside arc) | 5pts (half-court)', 10, 40);

    // Draw timer
    const minutes = Math.floor(game.timeRemaining / 60);
    const seconds = Math.floor(game.timeRemaining % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = game.timeRemaining < 30 ? '#FF5722' : '#fff';
    ctx.fillText(timeString, game.width / 2, 60);
}

// ====================
// UI MANAGEMENT
// ====================

function setupUI() {
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    document.getElementById('mute-btn').addEventListener('click', toggleMute);
    updateScoreDisplay();
}

function updateScoreDisplay() {
    document.getElementById('level-number').textContent = `${game.score.player} - ${game.score.cpu}`;
}

function showMessage(text, duration) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.classList.add('show');

    if (duration) {
        setTimeout(() => hideMessage(), duration);
    }
}

function hideMessage() {
    document.getElementById('message').classList.remove('show');
}

function toggleMute() {
    game.muted = !game.muted;
    document.getElementById('mute-btn').textContent = game.muted ? '🔇' : '🔊';
}

// ====================
// AUDIO
// ====================

let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playSound(type) {
    if (game.muted) return;

    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'jump') {
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'shoot') {
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'score') {
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'block') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'pickup') {
            osc.frequency.setValueAtTime(400, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        }
    } catch (e) {
        console.warn('Audio error:', e);
    }
}

// ====================
// MULTIPLAYER FUNCTIONS
// ====================

function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('waitingForOpponent', () => {
        document.getElementById('connection-status').textContent = 'Waiting for opponent...';
    });

    socket.on('matchFound', (data) => {
        multiplayerData.roomId = data.roomId;
        multiplayerData.playerNumber = data.playerNumber;
        multiplayerData.opponentId = data.opponentId;

        document.getElementById('connection-status').textContent = 'Match found!';

        setTimeout(() => {
            startMultiplayerGame();
        }, 1000);
    });

    socket.on('opponentMove', (data) => {
        if (gameMode === 'multiplayer') {
            // Update opponent position
            game.cpu.x = data.x;
            game.cpu.y = data.y;
            game.cpu.vx = data.vx;
            game.cpu.vy = data.vy;
            game.cpu.isGrounded = data.isGrounded;
            game.cpu.defending = data.defending;
        }
    });

    socket.on('ballSync', (data) => {
        if (gameMode === 'multiplayer') {
            game.ball.x = data.x;
            game.ball.y = data.y;
            game.ball.vx = data.vx;
            game.ball.vy = data.vy;
            game.ball.inAir = data.inAir;
            game.ball.owner = data.owner;
            game.ball.shotFrom = data.shotFrom;
        }
    });

    socket.on('scoreUpdate', (data) => {
        if (gameMode === 'multiplayer') {
            if (multiplayerData.playerNumber === 1) {
                game.score.player = data.score.player1;
                game.score.cpu = data.score.player2;
            } else {
                game.score.player = data.score.player2;
                game.score.cpu = data.score.player1;
            }
            updateScoreDisplay();
        }
    });

    socket.on('opponentDisconnected', () => {
        showMessage('Opponent disconnected', null);
        setTimeout(() => {
            returnToMenu();
        }, 2000);
    });

    socket.on('opponentLeft', () => {
        showMessage('Opponent left the game', null);
        setTimeout(() => {
            returnToMenu();
        }, 2000);
    });
}

function startMultiplayerGame() {
    gameMode = 'multiplayer';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    init();
}

function startSinglePlayerGame() {
    gameMode = 'singleplayer';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    init();
}

function returnToMenu() {
    gameMode = 'singleplayer';
    multiplayerData = { roomId: null, playerNumber: null, opponentId: null };

    document.getElementById('game-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('connection-status').textContent = '';

    if (socket) {
        socket.emit('leaveRoom', { roomId: multiplayerData.roomId });
    }
}

function emitPlayerMove() {
    if (gameMode === 'multiplayer' && socket && multiplayerData.roomId) {
        socket.emit('playerMove', {
            roomId: multiplayerData.roomId,
            x: game.player.x,
            y: game.player.y,
            vx: game.player.vx,
            vy: game.player.vy,
            isGrounded: game.player.isGrounded,
            defending: game.player.defending
        });
    }
}

function emitBallUpdate() {
    if (gameMode === 'multiplayer' && socket && multiplayerData.roomId) {
        socket.emit('ballUpdate', {
            roomId: multiplayerData.roomId,
            x: game.ball.x,
            y: game.ball.y,
            vx: game.ball.vx,
            vy: game.ball.vy,
            inAir: game.ball.inAir,
            owner: game.ball.owner,
            shotFrom: game.ball.shotFrom
        });
    }
}

function emitScored(points) {
    if (gameMode === 'multiplayer' && socket && multiplayerData.roomId) {
        socket.emit('playerScored', {
            roomId: multiplayerData.roomId,
            scorer: multiplayerData.playerNumber,
            points: points
        });
    }
}

// ====================
// START
// ====================

window.addEventListener('DOMContentLoaded', () => {
    // Initialize socket connection
    initializeSocket();

    // Setup menu buttons
    document.getElementById('vs-cpu-btn').addEventListener('click', () => {
        startSinglePlayerGame();
    });

    document.getElementById('multiplayer-btn').addEventListener('click', () => {
        document.getElementById('connection-status').textContent = 'Connecting to server...';
        socket.emit('findMatch');
    });
});
