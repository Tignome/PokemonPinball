const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const multiplierEl = document.getElementById('multiplier');
const ballsEl = document.getElementById('balls');
const badgesEl = document.getElementById('badges');

const GAME_STATES = {
    TITLE: 'TITLE',
    READY: 'READY',
    PLAYING: 'PLAYING',
    BALL_LOST: 'BALL_LOST',
    GAME_OVER: 'GAME_OVER'
};

const badgeData = [
    { key: 'fire', label: 'Fire', color: '#ff4c40', shot: 'leftOrbit' },
    { key: 'grass', label: 'Grass', color: '#3fc04d', shot: 'leftRamp' },
    { key: 'rock', label: 'Rock', color: '#b6b6b6', shot: 'bash' },
    { key: 'electric', label: 'Electric', color: '#ffd447', shot: 'rightRamp' },
    { key: 'water', label: 'Water', color: '#4dc0ff', shot: 'rightOrbit' },
    { key: 'ground', label: 'Ground', color: '#c98b45', shot: 'rolloverLeft' },
    { key: 'psychic', label: 'Psychic', color: '#c048ff', shot: 'rolloverMid' },
    { key: 'fairy', label: 'Fairy', color: '#ff93d3', shot: 'rolloverRight' }
];

const badgeProgress = {};
badgeData.forEach(b => badgeProgress[b.key] = 0);

const TOTAL_BALLS = 3;
let score = 0;
let multiplier = 1;
let ballsRemaining = TOTAL_BALLS;
let currentBallNumber = 1;
let currentState = GAME_STATES.TITLE;
let celebrationTimer = 0;
let ballLossTimer = 0;

const ball = new Ball(canvas.width - 80, canvas.height - 140);
const leftFlipper = new Flipper(250, 880, 'left');
const rightFlipper = new Flipper(550, 880, 'right');

const bashTarget = { x: 400, y: 380, radius: 30 };

const shotCooldowns = {};
const cooldownDuration = 0.5;

const shots = createShots();
renderBadges();
showMessage('TITLE', 'Gym Badge Pinball', 'Press Space to Start');

let lastTime = 0;
requestAnimationFrame(loop);

function createShots() {
    const leftOrbit = new Path2D();
    leftOrbit.moveTo(80, 80);
    leftOrbit.lineTo(140, 80);
    leftOrbit.lineTo(140, 820);
    leftOrbit.lineTo(80, 700);
    leftOrbit.closePath();

    const rightOrbit = new Path2D();
    rightOrbit.moveTo(720, 80);
    rightOrbit.lineTo(660, 80);
    rightOrbit.lineTo(660, 820);
    rightOrbit.lineTo(720, 700);
    rightOrbit.closePath();

    const leftRamp = new Path2D();
    leftRamp.moveTo(200, 600);
    leftRamp.lineTo(320, 500);
    leftRamp.lineTo(260, 350);
    leftRamp.lineTo(160, 420);
    leftRamp.closePath();

    const rightRamp = new Path2D();
    rightRamp.moveTo(600, 600);
    rightRamp.lineTo(480, 500);
    rightRamp.lineTo(540, 350);
    rightRamp.lineTo(640, 420);
    rightRamp.closePath();

    const rolloverLeft = new Path2D();
    rolloverLeft.rect(220, 140, 100, 40);
    const rolloverMid = new Path2D();
    rolloverMid.rect(350, 110, 100, 40);
    const rolloverRight = new Path2D();
    rolloverRight.rect(480, 140, 100, 40);

    return [
        { id: 'leftOrbit', path: leftOrbit, color: '#ff4c40', badge: 'fire', score: 100 },
        { id: 'leftRamp', path: leftRamp, color: '#3fc04d', badge: 'grass', score: 100 },
        { id: 'bash', circle: bashTarget, color: '#b6b6b6', badge: 'rock', score: 150 },
        { id: 'rightRamp', path: rightRamp, color: '#ffd447', badge: 'electric', score: 100 },
        { id: 'rightOrbit', path: rightOrbit, color: '#4dc0ff', badge: 'water', score: 100 },
        { id: 'rolloverLeft', path: rolloverLeft, color: '#c98b45', badge: 'ground', score: 75 },
        { id: 'rolloverMid', path: rolloverMid, color: '#c048ff', badge: 'psychic', score: 75 },
        { id: 'rolloverRight', path: rolloverRight, color: '#ff93d3', badge: 'fairy', score: 75 }
    ];
}

function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(loop);
}

function update(dt) {
    updateState(dt);
    updateHUD();
}

function updateState(dt) {
    switch (currentState) {
        case GAME_STATES.TITLE:
            break;
        case GAME_STATES.READY:
            leftFlipper.update(dt);
            rightFlipper.update(dt);
            ball.x = canvas.width - 80;
            ball.y = canvas.height - 180;
            break;
        case GAME_STATES.PLAYING:
            audioManager.init();
            leftFlipper.update(dt);
            rightFlipper.update(dt);
            ball.applyPhysics(dt);
            bounceWalls(ball, canvas.width, canvas.height);
            leftFlipper.collide(ball);
            rightFlipper.collide(ball);
            detectShots(dt);
            if (circleCollision(ball, bashTarget)) {
                if ((shotCooldowns['bash'] || 0) === 0) {
                    registerShot('bash');
                    audioManager.play('bash');
                    shotCooldowns['bash'] = cooldownDuration;
                }
            }
            if (ball.y - ball.radius > canvas.height + 40) {
                loseBall();
            }
            break;
        case GAME_STATES.BALL_LOST:
            ballLossTimer -= dt;
            if (ballLossTimer <= 0) {
                if (ballsRemaining > 0) {
                    currentState = GAME_STATES.READY;
                    resetBall();
                    showMessage('READY', 'Ball Ready', 'Press Space to Launch');
                } else {
                    currentState = GAME_STATES.GAME_OVER;
                    showMessage('GAME OVER', 'Game Over', `Score: ${score.toLocaleString()}\nPress Space to Restart`);
                }
            }
            break;
        case GAME_STATES.GAME_OVER:
            break;
    }

    if (celebrationTimer > 0) {
        celebrationTimer -= dt;
    }
}

function detectShots(dt) {
    shots.forEach(shot => {
        shotCooldowns[shot.id] = Math.max(0, (shotCooldowns[shot.id] || 0) - dt);
        if (shot.path) {
            if (ctx.isPointInPath(shot.path, ball.x, ball.y) && shotCooldowns[shot.id] === 0) {
                registerShot(shot.id);
                shotCooldowns[shot.id] = cooldownDuration;
                audioManager.play('lane');
            }
        }
    });
}

function registerShot(shotId) {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;
    addScore(shot.score);
    incrementBadge(shot.badge);
}

function incrementBadge(key) {
    const current = badgeProgress[key];
    if (current >= 3) return;
    badgeProgress[key]++;
    addScore(250);
    if (badgeProgress[key] === 3) {
        addScore(1000);
        multiplier = Math.min(2, multiplier + 0.1);
        audioManager.play('badge');
        if (allBadgesLit()) {
            score += Math.floor(10000 * multiplier);
            celebrationTimer = 2;
            audioManager.play('champion');
        }
    } else {
        audioManager.play('progress');
    }
    renderBadges();
}

function addScore(base) {
    score += Math.floor(base * multiplier);
}

function allBadgesLit() {
    return badgeData.every(b => badgeProgress[b.key] === 3);
}

function resetBall() {
    ball.reset(canvas.width - 80, canvas.height - 140);
    ball.active = false;
}

function launchBall() {
    if (ball.active) return;
    ball.active = true;
    ball.vx = -150;
    ball.vy = -650;
}

function loseBall() {
    ball.active = false;
    ballsRemaining--;
    if (ballsRemaining === 0) {
        currentBallNumber = TOTAL_BALLS;
    } else {
        currentBallNumber = TOTAL_BALLS - ballsRemaining + 1;
    }
    ballLossTimer = 1.5;
    currentState = GAME_STATES.BALL_LOST;
    showMessage('BALL LOST', 'Ball Drained', 'Hold tight! Next ball arriving...');
}

function updateHUD() {
    scoreEl.textContent = score.toLocaleString();
    multiplierEl.textContent = `${multiplier.toFixed(1)}x`;
    ballsEl.textContent = `${currentBallNumber} / ${TOTAL_BALLS}`;
}

function renderBadges() {
    badgesEl.innerHTML = '';
    badgeData.forEach(({ key, label, color }) => {
        const badge = document.createElement('div');
        badge.className = `badge${badgeProgress[key] === 3 ? ' lit' : ''}`;
        badge.style.borderColor = color;
        const labelEl = document.createElement('div');
        labelEl.className = 'label';
        labelEl.textContent = label;
        const segments = document.createElement('div');
        segments.className = 'segments';
        for (let i = 0; i < 3; i++) {
            const seg = document.createElement('span');
            if (i < badgeProgress[key]) {
                seg.style.background = color;
            }
            segments.appendChild(seg);
        }
        badge.appendChild(labelEl);
        badge.appendChild(segments);
        badgesEl.appendChild(badge);
    });
}

function showMessage(state, title, message) {
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="message"><h2>${title}</h2><p>${message.replace(/\n/g, '<br>')}</p></div>`;
}

function hideMessage() {
    overlay.classList.add('hidden');
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTable();
    drawShots();
    drawBashTarget();
    drawCreatures();
    drawBall();
    drawFlippers();
    if (celebrationTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 * Math.sin(celebrationTimer * 20) + 0.5})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawTable() {
    ctx.strokeStyle = '#4a6fa5';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.fillStyle = '#0f1b2d';
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 160);

    ctx.fillStyle = '#132640';
    ctx.beginPath();
    ctx.moveTo(100, canvas.height - 60);
    ctx.lineTo(canvas.width - 100, canvas.height - 60);
    ctx.lineTo(canvas.width - 200, canvas.height - 20);
    ctx.lineTo(200, canvas.height - 20);
    ctx.closePath();
    ctx.fill();
}

function drawShots() {
    shots.forEach(shot => {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = shot.color;
        if (shot.path) {
            ctx.fill(shot.path);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        if (shot.path) ctx.stroke(shot.path);
    });
}

function drawBashTarget() {
    ctx.beginPath();
    ctx.fillStyle = '#777';
    ctx.arc(bashTarget.x, bashTarget.y, bashTarget.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
}

function drawCreatures() {
    const silhouettes = [
        { x: 150, y: 500, color: '#ff4c40' },
        { x: 650, y: 500, color: '#ffd447' },
        { x: 220, y: 150, color: '#c98b45' },
        { x: 580, y: 150, color: '#ff93d3' }
    ];
    silhouettes.forEach(creature => {
        ctx.fillStyle = creature.color;
        ctx.beginPath();
        ctx.arc(creature.x, creature.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(creature.x - 10, creature.y - 10, 8, 0, Math.PI * 2);
        ctx.arc(creature.x + 10, creature.y - 10, 8, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBall() {
    ctx.beginPath();
    ctx.fillStyle = '#fefefe';
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#aaa';
    ctx.stroke();
}

function drawFlippers() {
    [leftFlipper, rightFlipper].forEach(flip => {
        const { pivot, tip } = flip.getEndpoints();
        ctx.strokeStyle = '#f5f5f5';
        ctx.lineWidth = flip.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pivot.x, pivot.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
    });
}

function startGame() {
    score = 0;
    multiplier = 1;
    ballsRemaining = TOTAL_BALLS;
    currentBallNumber = 1;
    for (const key in badgeProgress) {
        badgeProgress[key] = 0;
    }
    renderBadges();
    resetBall();
    currentState = GAME_STATES.READY;
    showMessage('READY', 'Ball Ready', 'Press Space to Launch');
}

function handleSpacebar() {
    if (currentState === GAME_STATES.TITLE) {
        startGame();
    } else if (currentState === GAME_STATES.READY) {
        launchBall();
        currentState = GAME_STATES.PLAYING;
        hideMessage();
    } else if (currentState === GAME_STATES.GAME_OVER) {
        startGame();
    }
}

window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleSpacebar();
    }
    if (e.code === 'ShiftLeft') {
        leftFlipper.setActive(true);
    }
    if (e.code === 'ShiftRight') {
        rightFlipper.setActive(true);
    }
});

window.addEventListener('keyup', e => {
    if (e.code === 'ShiftLeft') {
        leftFlipper.setActive(false);
    }
    if (e.code === 'ShiftRight') {
        rightFlipper.setActive(false);
    }
});
