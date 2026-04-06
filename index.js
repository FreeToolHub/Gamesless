const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreEl');
const highScoreEl = document.getElementById('highScoreEl');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const focusOverlay = document.getElementById('focusOverlay');

// Canvas Sizing
let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Game State Variables
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('gamesless_tap_escape_highscore') || 0;
highScoreEl.innerText = `Best: ${highScore}`;
let gameSpeed = 6;
let isPlaying = false; 
let animationId;
let obstacles = [];
let isFocusModeActive = false;

// Audio Context 
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }
}

// Player Object
const player = {
    x: window.innerWidth < 600 ? 50 : 150,
    y: height / 2,
    radius: 12,
    dy: 0,
    gravity: 0.5,
    jumpPower: -9,
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0ff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
    },
    update() {
        this.dy += this.gravity;
        this.y += this.dy;

        if (this.y + this.radius > height) {
            this.y = height - this.radius;
            this.dy = 0;
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.dy = 0;
        }
        this.draw();
    },
    jump() {
        this.dy = this.jumpPower;
        playSound('jump');
    }
};

// Obstacle Class Setup
class Obstacle {
    constructor() {
        this.width = 30 + Math.random() * 30;
        this.height = 60 + Math.random() * (height / 2.5);
        this.x = width;
        this.y = Math.random() > 0.5 ? height - this.height : 0;
        this.isFake = Math.random() < 0.25;}

    draw() {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = this.isFake ? '#a020f0' : '#ff0055';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.isFake ? '#a020f0' : '#ff0055';
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
    }

    update() {
        this.x -= gameSpeed;
        this.draw();
    }
}

function handleObstacles() {
    let spawnRate = Math.max(40, Math.floor(100 - gameSpeed * 2));
    if (frames % spawnRate === 0) {
        obstacles.push(new Obstacle());
    }

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.update();

        if (!obs.isFake) {
            let testX = player.x;
            let testY = player.y;

            if (player.x < obs.x) testX = obs.x;
            else if (player.x > obs.x + obs.width) testX = obs.x + obs.width;
            
            if (player.y < obs.y) testY = obs.y;
            else if (player.y > obs.y + obs.height) testY = obs.y + obs.height;

            let distX = player.x - testX;
            let distY = player.y - testY;
            let distance = Math.sqrt((distX * distX) + (distY * distY));

            if (distance <= player.radius) {
                gameOver();
            }
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            i--;
        }
    }
}

function triggerFocusMode() {
    if (!isFocusModeActive && Math.random() < 0.002) { 
        isFocusModeActive = true;
        focusOverlay.style.opacity = '1';
        
        setTimeout(() => {
            focusOverlay.style.opacity = '0';
            isFocusModeActive = false;
        }, 3000 + Math.random() * 2000);
    }
}

function gameLoop() {
    if (!isPlaying) return;
    
    ctx.clearRect(0, 0, width, height);
    
    player.update();
    handleObstacles();
    triggerFocusMode();

    frames++;
    if (frames % 10 === 0) {
        score++;
        scoreEl.innerText = `Score: ${score}`;
        
        if (score % 150 === 0) {
            gameSpeed += 0.5;
        }
    }

    animationId = requestAnimationFrame(gameLoop);
}

function startGame(e) {
    if (e && e.type === 'touchstart') {
        e.preventDefault();
    }

    // Hide UI
    startScreen.style.display = "none";
    gameOverScreen.style.display = "none";
    
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Reset Core Variables
    player.y = height / 2;
    player.dy = 0;
    obstacles = [];
    score = 0;
    frames = 0;
    gameSpeed = 6;
    scoreEl.innerText = `Score: ${score}`;
    focusOverlay.style.opacity = '0';
    isFocusModeActive = false;
    
    // Start State
    isPlaying = true;
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    playSound('crash');
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('gamesless_tap_escape_highscore', highScore);
        highScoreEl.innerText = `Best: ${highScore}`;
    }
    
    finalScoreEl.innerText = `Score: ${score}`;
    gameOverScreen.style.display = "block";
}

// Attach Event Listeners Ensure DOM is Loaded
document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    // Click and Touch events for buttons
    startBtn.addEventListener("click", startGame);
    startBtn.addEventListener("touchstart", startGame, { passive: false });
    
    restartBtn.addEventListener("click", startGame);
    restartBtn.addEventListener("touchstart", startGame, { passive: false });

    // Gameplay Controls
    window.addEventListener('mousedown', (e) => {
        if (e.target.tagName !== 'BUTTON' && isPlaying) player.jump();
    });

    window.addEventListener('touchstart', (e) => {
        if (e.target.tagName !== 'BUTTON' && isPlaying) {
            e.preventDefault(); 
            player.jump();
        }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
        if ((e.code === 'Space' || e.code === 'ArrowUp') && isPlaying) {
            e.preventDefault();
            player.jump();
        }
    });
});
