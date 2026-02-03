// Level definitions for Hoop Physics
// Each level contains:
// - ball: starting position {x, y}
// - hoop: position {x, y}
// - obstacles: array of blocks {x, y, w, h, moving (optional)}

const LEVELS = [
    // BEGINNER LEVELS (1-5): Direct shots
    {
        name: "First Shot",
        ball: { x: 100, y: 400 },
        hoop: { x: 600, y: 300 },
        obstacles: []
    },
    {
        name: "Easy Arc",
        ball: { x: 100, y: 450 },
        hoop: { x: 650, y: 350 },
        obstacles: [
            { x: 350, y: 500, w: 100, h: 20 }
        ]
    },
    {
        name: "Simple Wall",
        ball: { x: 100, y: 300 },
        hoop: { x: 600, y: 300 },
        obstacles: [
            { x: 350, y: 200, w: 20, h: 150 }
        ]
    },
    {
        name: "Low Ceiling",
        ball: { x: 150, y: 450 },
        hoop: { x: 550, y: 450 },
        obstacles: [
            { x: 100, y: 100, w: 600, h: 20 },
            { x: 300, y: 350, w: 80, h: 20 }
        ]
    },
    {
        name: "First Platform",
        ball: { x: 100, y: 450 },
        hoop: { x: 600, y: 250 },
        obstacles: [
            { x: 550, y: 300, w: 120, h: 15 },
            { x: 200, y: 380, w: 100, h: 15 }
        ]
    },

    // INTERMEDIATE LEVELS (6-10): Bank shots and tunnels
    {
        name: "Bank Shot",
        ball: { x: 100, y: 400 },
        hoop: { x: 200, y: 300 },
        obstacles: [
            { x: 500, y: 150, w: 20, h: 350 },
            { x: 300, y: 450, w: 150, h: 20 }
        ]
    },
    {
        name: "Tunnel Vision",
        ball: { x: 100, y: 250 },
        hoop: { x: 650, y: 250 },
        obstacles: [
            { x: 300, y: 150, w: 300, h: 20 },
            { x: 300, y: 320, w: 300, h: 20 },
            { x: 400, y: 240, w: 20, h: 80 }
        ]
    },
    {
        name: "Stairs Up",
        ball: { x: 100, y: 500 },
        hoop: { x: 650, y: 150 },
        obstacles: [
            { x: 200, y: 450, w: 80, h: 15 },
            { x: 320, y: 380, w: 80, h: 15 },
            { x: 440, y: 310, w: 80, h: 15 },
            { x: 560, y: 240, w: 80, h: 15 }
        ]
    },
    {
        name: "The Gap",
        ball: { x: 100, y: 350 },
        hoop: { x: 600, y: 350 },
        obstacles: [
            { x: 100, y: 150, w: 250, h: 20 },
            { x: 450, y: 150, w: 250, h: 20 },
            { x: 100, y: 450, w: 250, h: 20 },
            { x: 450, y: 450, w: 250, h: 20 }
        ]
    },
    {
        name: "Zig Zag",
        ball: { x: 100, y: 500 },
        hoop: { x: 650, y: 500 },
        obstacles: [
            { x: 200, y: 300, w: 150, h: 20 },
            { x: 400, y: 200, w: 150, h: 20 },
            { x: 550, y: 350, w: 120, h: 20 }
        ]
    },

    // ADVANCED LEVELS (11-15): Tight spaces and precision
    {
        name: "Narrow Path",
        ball: { x: 100, y: 300 },
        hoop: { x: 650, y: 300 },
        obstacles: [
            { x: 0, y: 200, w: 350, h: 20 },
            { x: 400, y: 200, w: 400, h: 20 },
            { x: 0, y: 380, w: 350, h: 20 },
            { x: 400, y: 380, w: 400, h: 20 }
        ]
    },
    {
        name: "The Chimney",
        ball: { x: 350, y: 500 },
        hoop: { x: 350, y: 150 },
        obstacles: [
            { x: 250, y: 100, w: 20, h: 400 },
            { x: 480, y: 100, w: 20, h: 400 },
            { x: 270, y: 350, w: 80, h: 15 },
            { x: 400, y: 250, w: 80, h: 15 }
        ]
    },
    {
        name: "Under and Over",
        ball: { x: 100, y: 450 },
        hoop: { x: 650, y: 450 },
        obstacles: [
            { x: 250, y: 300, w: 20, h: 250 },
            { x: 250, y: 100, w: 150, h: 20 },
            { x: 500, y: 100, w: 20, h: 300 },
            { x: 350, y: 380, w: 150, h: 20 }
        ]
    },
    {
        name: "Pocket Shot",
        ball: { x: 100, y: 200 },
        hoop: { x: 600, y: 450 },
        obstacles: [
            { x: 450, y: 350, w: 250, h: 20 },
            { x: 450, y: 500, w: 250, h: 20 },
            { x: 450, y: 370, w: 20, h: 130 },
            { x: 200, y: 280, w: 300, h: 20 }
        ]
    },
    {
        name: "Maze Entry",
        ball: { x: 100, y: 500 },
        hoop: { x: 350, y: 200 },
        obstacles: [
            { x: 200, y: 400, w: 20, h: 150 },
            { x: 220, y: 400, w: 150, h: 20 },
            { x: 350, y: 300, w: 20, h: 120 },
            { x: 250, y: 300, w: 100, h: 20 },
            { x: 250, y: 150, w: 20, h: 150 }
        ]
    },

    // EXPERT LEVELS (16-20): Moving obstacles and timing challenges
    {
        name: "Moving Block",
        ball: { x: 100, y: 450 },
        hoop: { x: 650, y: 300 },
        obstacles: [
            { x: 350, y: 250, w: 100, h: 20, moving: { axis: 'y', range: [150, 450], speed: 2 } }
        ]
    },
    {
        name: "Sliding Platform",
        ball: { x: 100, y: 500 },
        hoop: { x: 650, y: 200 },
        obstacles: [
            { x: 300, y: 350, w: 120, h: 15, moving: { axis: 'x', range: [200, 500], speed: 1.5 } },
            { x: 500, y: 250, w: 100, h: 15 }
        ]
    },
    {
        name: "Double Trouble",
        ball: { x: 100, y: 300 },
        hoop: { x: 650, y: 300 },
        obstacles: [
            { x: 250, y: 200, w: 80, h: 20, moving: { axis: 'y', range: [150, 400], speed: 2.5 } },
            { x: 500, y: 350, w: 80, h: 20, moving: { axis: 'y', range: [150, 400], speed: -2.5 } }
        ]
    },
    {
        name: "The Pendulum",
        ball: { x: 100, y: 450 },
        hoop: { x: 600, y: 450 },
        obstacles: [
            { x: 350, y: 100, w: 20, h: 200, moving: { axis: 'x', range: [300, 450], speed: 1.8 } },
            { x: 200, y: 380, w: 100, h: 15 },
            { x: 450, y: 380, w: 100, h: 15 }
        ]
    },
    {
        name: "Final Challenge",
        ball: { x: 100, y: 500 },
        hoop: { x: 650, y: 150 },
        obstacles: [
            { x: 250, y: 400, w: 100, h: 15, moving: { axis: 'x', range: [150, 350], speed: 1.2 } },
            { x: 450, y: 300, w: 100, h: 15, moving: { axis: 'x', range: [400, 550], speed: -1.5 } },
            { x: 300, y: 200, w: 80, h: 15 },
            { x: 500, y: 500, w: 20, h: 150 }
        ]
    },

    // BONUS LEVELS (21-25): Extra challenges
    {
        name: "Spiral",
        ball: { x: 100, y: 500 },
        hoop: { x: 400, y: 250 },
        obstacles: [
            { x: 200, y: 450, w: 150, h: 15 },
            { x: 300, y: 350, w: 200, h: 15 },
            { x: 250, y: 250, w: 100, h: 15 },
            { x: 350, y: 200, w: 20, h: 100 }
        ]
    },
    {
        name: "Cross Fire",
        ball: { x: 100, y: 300 },
        hoop: { x: 650, y: 300 },
        obstacles: [
            { x: 350, y: 150, w: 20, h: 150, moving: { axis: 'y', range: [150, 350], speed: 2 } },
            { x: 200, y: 290, w: 150, h: 20, moving: { axis: 'x', range: [200, 450], speed: -1.8 } }
        ]
    },
    {
        name: "The Gauntlet",
        ball: { x: 100, y: 250 },
        hoop: { x: 650, y: 450 },
        obstacles: [
            { x: 200, y: 200, w: 20, h: 100 },
            { x: 300, y: 350, w: 20, h: 100 },
            { x: 400, y: 200, w: 20, h: 100 },
            { x: 500, y: 350, w: 20, h: 100 }
        ]
    },
    {
        name: "Bounce House",
        ball: { x: 100, y: 500 },
        hoop: { x: 650, y: 500 },
        obstacles: [
            { x: 250, y: 450, w: 80, h: 15 },
            { x: 380, y: 350, w: 80, h: 15 },
            { x: 510, y: 450, w: 80, h: 15 },
            { x: 350, y: 250, w: 100, h: 15 }
        ]
    },
    {
        name: "Perfect Timing",
        ball: { x: 100, y: 300 },
        hoop: { x: 650, y: 300 },
        obstacles: [
            { x: 250, y: 200, w: 20, h: 100, moving: { axis: 'y', range: [150, 400], speed: 3 } },
            { x: 400, y: 350, w: 20, h: 100, moving: { axis: 'y', range: [150, 400], speed: -3 } },
            { x: 550, y: 200, w: 20, h: 100, moving: { axis: 'y', range: [150, 400], speed: 2.5 } }
        ]
    }
];

// Export for main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LEVELS;
}
