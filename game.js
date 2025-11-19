const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const multiplierEl = document.getElementById('multiplier');
const ballsEl = document.getElementById('balls');
const badgesEl = document.getElementById('badges');
const helpButton = document.getElementById('helpButton');
const helpPanel = document.getElementById('helpPanel');
const closeHelp = document.getElementById('closeHelp');

const playfieldPath = buildPlayfieldPath();
const wallSegments = buildWallSegments();

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

const ball = new Ball(canvas.width - 70, canvas.height - 190);
const leftFlipper = new Flipper(270, 900, 'left');
const rightFlipper = new Flipper(530, 900, 'right');

const bashTarget = { x: 400, y: 380, radius: 30 };

const shotCooldowns = {};
const cooldownDuration = 0.5;

const shots = createShots();
renderBadges();
showMessage('TITLE', 'Gym Badge Pinball', 'Press Space to Start');

let lastTime = 0;
requestAnimationFrame(loop);

helpButton.addEventListener('click', () => {
    helpPanel.classList.remove('hidden');
});

closeHelp.addEventListener('click', () => {
    helpPanel.classList.add('hidden');
});

helpPanel.addEventListener('click', e => {
    if (e.target === helpPanel) {
        helpPanel.classList.add('hidden');
    }
});

function createShots() {
    const leftOrbit = new Path2D();
    leftOrbit.moveTo(120, 130);
    leftOrbit.quadraticCurveTo(110, 300, 120, 560);
    leftOrbit.lineTo(155, 620);
    leftOrbit.quadraticCurveTo(150, 320, 170, 130);
    leftOrbit.closePath();

    const rightOrbit = new Path2D();
    rightOrbit.moveTo(680, 140);
    rightOrbit.quadraticCurveTo(690, 320, 675, 600);
    rightOrbit.lineTo(640, 660);
    rightOrbit.quadraticCurveTo(650, 320, 620, 150);
    rightOrbit.closePath();

    const leftRamp = new Path2D();
    leftRamp.moveTo(210, 720);
    leftRamp.quadraticCurveTo(320, 620, 300, 470);
    leftRamp.lineTo(250, 490);
    leftRamp.lineTo(180, 640);
    leftRamp.closePath();

    const rightRamp = new Path2D();
    rightRamp.moveTo(590, 720);
    rightRamp.quadraticCurveTo(480, 620, 500, 470);
    rightRamp.lineTo(550, 490);
    rightRamp.lineTo(620, 640);
    rightRamp.closePath();

    const rolloverLeft = new Path2D();
    rolloverLeft.moveTo(220, 150);
    rolloverLeft.arc(260, 150, 35, Math.PI, 0, false);
    rolloverLeft.lineTo(295, 170);
    rolloverLeft.lineTo(225, 170);
    rolloverLeft.closePath();

    const rolloverMid = new Path2D();
    rolloverMid.moveTo(360, 120);
    rolloverMid.arc(400, 120, 35, Math.PI, 0, false);
    rolloverMid.lineTo(435, 140);
    rolloverMid.lineTo(365, 140);
    rolloverMid.closePath();

    const rolloverRight = new Path2D();
    rolloverRight.moveTo(500, 150);
    rolloverRight.arc(540, 150, 35, Math.PI, 0, false);
    rolloverRight.lineTo(575, 170);
    rolloverRight.lineTo(505, 170);
    rolloverRight.closePath();

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
            ball.x = canvas.width - 70;
            ball.y = canvas.height - 190;
            break;
        case GAME_STATES.PLAYING:
            audioManager.init();
            leftFlipper.update(dt);
            rightFlipper.update(dt);
            ball.applyPhysics(dt);
            bounceOffSegments(ball, wallSegments);
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
    ball.reset(canvas.width - 70, canvas.height - 190);
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
    drawTableProps();
    drawBall();
    drawFlippers();
    if (celebrationTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 * Math.sin(celebrationTimer * 20) + 0.5})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawTable() {
    ctx.save();
    ctx.fillStyle = '#0c5b38';
    ctx.fill(playfieldPath);
    ctx.clip(playfieldPath);

    const feltGradient = ctx.createLinearGradient(0, 60, 0, canvas.height);
    feltGradient.addColorStop(0, '#2ca360');
    feltGradient.addColorStop(0.5, '#0f6a3b');
    feltGradient.addColorStop(1, '#04311f');
    ctx.fillStyle = feltGradient;
    ctx.fillRect(60, 40, 680, canvas.height);

    const weave = ctx.createLinearGradient(0, 0, 200, 200);
    weave.addColorStop(0, 'rgba(255,255,255,0.02)');
    weave.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = weave;
    for (let y = 80; y < canvas.height - 100; y += 80) {
        ctx.fillRect(120, y, 560, 4);
    }

    drawOrbitGuides();
    drawLaneLights();
    drawInstructionPlate();
    ctx.restore();

    ctx.save();
    const railGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    railGradient.addColorStop(0, '#fce7b4');
    railGradient.addColorStop(1, '#a26a2a');
    ctx.strokeStyle = railGradient;
    ctx.lineWidth = 24;
    ctx.lineJoin = 'round';
    ctx.stroke(playfieldPath);
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke(playfieldPath);
    ctx.restore();

    drawShooterLane();
    drawApron();
}

function drawOrbitGuides() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 14]);
    ctx.beginPath();
    ctx.moveTo(150, 220);
    ctx.quadraticCurveTo(110, 360, 150, 520);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(650, 220);
    ctx.quadraticCurveTo(690, 360, 640, 520);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawLaneLights() {
    const inserts = [
        { x: 140, y: 620, color: '#ff4c40' },
        { x: 660, y: 620, color: '#4dc0ff' },
        { x: 260, y: 500, color: '#3fc04d' },
        { x: 540, y: 500, color: '#ffd447' }
    ];
    inserts.forEach(light => {
        const gradient = ctx.createRadialGradient(light.x, light.y, 5, light.x, light.y, 45);
        gradient.addColorStop(0, `${light.color}cc`);
        gradient.addColorStop(1, `${light.color}00`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(light.x, light.y, 45, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawInstructionPlate() {
    const plateWidth = 360;
    const plateHeight = 120;
    const x = (canvas.width - plateWidth) / 2;
    const y = canvas.height - 280;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, x, y, plateWidth, plateHeight, 30);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Press Space to Shoot', canvas.width / 2, y + 50);
    ctx.font = '20px "Trebuchet MS", sans-serif';
    ctx.fillText('Fill every badge to claim the Champion Bonus', canvas.width / 2, y + 90);
    ctx.restore();
}

function drawShooterLane() {
    ctx.save();
    const laneX = canvas.width - 120;
    ctx.fillStyle = '#b78645';
    ctx.fillRect(laneX, 60, 90, canvas.height - 220);
    ctx.fillStyle = '#080e05';
    ctx.fillRect(laneX + 10, 70, 70, canvas.height - 240);
    ctx.strokeStyle = '#f5d48d';
    ctx.lineWidth = 5;
    ctx.strokeRect(laneX, 60, 90, canvas.height - 220);
    ctx.fillStyle = '#cfd6e0';
    ctx.beginPath();
    ctx.arc(canvas.width - 75, canvas.height - 150, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#777c8a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
}

function drawApron() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(180, canvas.height - 120);
    ctx.quadraticCurveTo(400, canvas.height - 20, canvas.width - 180, canvas.height - 120);
    ctx.lineTo(canvas.width - 150, canvas.height - 40);
    ctx.quadraticCurveTo(400, canvas.height + 60, 150, canvas.height - 40);
    ctx.closePath();
    const apronGradient = ctx.createLinearGradient(0, canvas.height - 160, 0, canvas.height);
    apronGradient.addColorStop(0, '#0b1d12');
    apronGradient.addColorStop(1, '#010603');
    ctx.fillStyle = apronGradient;
    ctx.fill();
    ctx.strokeStyle = '#f5d48d';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Shoot Again', canvas.width / 2, canvas.height - 60);
    ctx.restore();
}

function drawShots() {
    shots.forEach(shot => {
        if (!shot.path) return;
        ctx.save();
        const progress = badgeProgress[shot.badge] || 0;
        const intensity = 0.35 + (progress / 3) * 0.5;
        const gradient = ctx.createLinearGradient(0, 0, 0, 180);
        gradient.addColorStop(0, `${shot.color}33`);
        gradient.addColorStop(1, `${shot.color}`);
        ctx.shadowColor = `${shot.color}aa`;
        ctx.shadowBlur = 10 + progress * 10;
        ctx.fillStyle = gradient;
        ctx.globalAlpha = intensity;
        ctx.fill(shot.path);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + intensity * 0.2})`;
        ctx.stroke(shot.path);
        ctx.restore();
    });
}

function drawBashTarget() {
    const progress = badgeProgress['rock'] / 3;
    const outer = ctx.createRadialGradient(bashTarget.x, bashTarget.y, 10, bashTarget.x, bashTarget.y, 70);
    outer.addColorStop(0, `rgba(255,255,255,${0.35 + progress * 0.4})`);
    outer.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(bashTarget.x, bashTarget.y, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(bashTarget.x, bashTarget.y);
    ctx.rotate(-Math.PI / 8);
    const size = 60;
    ctx.fillStyle = '#f8f6f0';
    drawRoundedRect(ctx, -size / 2, -size / 2, size, size, 10);
    ctx.fill();
    ctx.strokeStyle = '#c92f24';
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, -size / 2, -size / 2, size, size, 10);
    ctx.stroke();
    ctx.fillStyle = '#c92f24';
    const pipPositions = [
        [-15, -15],
        [15, 15],
        [-15, 15],
        [15, -15],
        [0, 0]
    ];
    pipPositions.forEach(([x, y], index) => {
        if (index === 4 && progress < 0.66) return;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawTableProps() {
    drawDiceStack(130, 320);
    drawChipStack(230, 380, '#ff4c40');
    drawChipStack(570, 380, '#ffd447');
    drawCardFan();
    drawSlotMachine();
    drawSpinnerSign();
}

function drawDiceStack(baseX, baseY) {
    ctx.save();
    ctx.fillStyle = '#d9362c';
    const pipLayouts = [
        [[-15, -15], [0, 0], [15, 15]],
        [[-15, -15], [-15, 15], [15, -15], [15, 15]],
        [[-15, -18], [-15, 18], [0, 0], [15, -18], [15, 18]]
    ];
    for (let i = 0; i < 3; i++) {
        const x = baseX;
        const y = baseY - i * 40;
        drawRoundedRect(ctx, x - 35, y - 35, 70, 70, 12);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, x - 35, y - 35, 70, 70, 12);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        pipLayouts[i].forEach(([px, py]) => {
            ctx.beginPath();
            ctx.arc(x + px, y + py, 5, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = '#d9362c';
    }
    ctx.restore();
}

function drawChipStack(x, y, color) {
    ctx.save();
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y - i * 12, 45, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    ctx.restore();
}

function drawCardFan() {
    const cards = ['A♠', 'K♣', 'Q♦', 'J♥'];
    cards.forEach((label, index) => {
        ctx.save();
        ctx.translate(320 + index * 40, 110);
        ctx.rotate((-0.3 + index * 0.2));
        ctx.fillStyle = '#fff';
        drawRoundedRect(ctx, -50, -70, 100, 140, 12);
        ctx.fill();
        ctx.strokeStyle = '#d8d8d8';
        ctx.stroke();
        ctx.fillStyle = /♦|♥/.test(label) ? '#c0392b' : '#111';
        ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, -20);
        ctx.restore();
    });
}

function drawSlotMachine() {
    ctx.save();
    ctx.translate(610, 360);
    const bodyGradient = ctx.createLinearGradient(-70, -120, 70, 140);
    bodyGradient.addColorStop(0, '#ffe7a5');
    bodyGradient.addColorStop(1, '#d08e34');
    ctx.fillStyle = bodyGradient;
    drawRoundedRect(ctx, -70, -120, 140, 200, 18);
    ctx.fill();
    ctx.strokeStyle = '#5f320c';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#111';
    drawRoundedRect(ctx, -60, -90, 120, 90, 12);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px "Trebuchet MS", sans-serif';
    ctx.fillText('7 7 7', 0, -30);
    ctx.fillStyle = '#ffd447';
    ctx.font = '16px "Trebuchet MS", sans-serif';
    ctx.fillText('Jackpot', 0, 16);
    ctx.strokeStyle = '#ffd447';
    ctx.beginPath();
    ctx.moveTo(80, -70);
    ctx.lineTo(110, -90);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(110, -110, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd447';
    ctx.fill();
    ctx.restore();
}

function drawSpinnerSign() {
    ctx.save();
    ctx.translate(180, 450);
    ctx.fillStyle = '#ffe194';
    drawRoundedRect(ctx, -90, -30, 180, 60, 16);
    ctx.fill();
    ctx.strokeStyle = '#b6781f';
    ctx.stroke();
    ctx.fillStyle = '#312105';
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Spin and Win', 0, 0);
    ctx.restore();
}

function drawBall() {
    const shine = ctx.createRadialGradient(ball.x - 4, ball.y - 4, 2, ball.x, ball.y, ball.radius);
    shine.addColorStop(0, '#ffffff');
    shine.addColorStop(0.5, '#d5d5d5');
    shine.addColorStop(1, '#7f879c');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawFlippers() {
    [leftFlipper, rightFlipper].forEach(flip => {
        const { pivot, tip } = flip.getEndpoints();
        ctx.save();
        const gradient = ctx.createLinearGradient(pivot.x, pivot.y, tip.x, tip.y);
        gradient.addColorStop(0, '#0a0a0c');
        gradient.addColorStop(1, '#2a2d33');
        ctx.strokeStyle = '#d0d3df';
        ctx.lineWidth = flip.width + 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pivot.x, pivot.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = flip.width;
        ctx.beginPath();
        ctx.moveTo(pivot.x, pivot.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
        ctx.restore();
    });
}

function drawRoundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
}

function buildPlayfieldPath() {
    const path = new Path2D();
    path.moveTo(150, 70);
    path.quadraticCurveTo(90, 220, 110, 520);
    path.quadraticCurveTo(130, 760, 240, 900);
    path.quadraticCurveTo(400, 980, 560, 900);
    path.quadraticCurveTo(670, 760, 690, 520);
    path.quadraticCurveTo(710, 240, 640, 80);
    path.closePath();
    return path;
}

function buildWallSegments() {
    return [
        { x1: 150, y1: 90, x2: 110, y2: 360, buffer: 6 },
        { x1: 110, y1: 360, x2: 120, y2: 620, buffer: 6 },
        { x1: 120, y1: 620, x2: 220, y2: 860, buffer: 6 },
        { x1: 220, y1: 860, x2: 340, y2: 930, buffer: 4 },
        { x1: 460, y1: 930, x2: 580, y2: 860, buffer: 4 },
        { x1: 580, y1: 860, x2: 660, y2: 720, buffer: 6 },
        { x1: 660, y1: 720, x2: 690, y2: 520, buffer: 6 },
        { x1: 690, y1: 520, x2: 680, y2: 260, buffer: 6 },
        { x1: 680, y1: 260, x2: 630, y2: 90, buffer: 6 },
        { x1: 630, y1: 90, x2: 150, y2: 70, buffer: 6 },
        // Shooter lane containment
        { x1: 700, y1: 90, x2: 770, y2: 90, buffer: 8 },
        { x1: 700, y1: 160, x2: 700, y2: 920, buffer: 6 },
        { x1: 770, y1: 90, x2: 780, y2: 840, buffer: 8 },
        { x1: 780, y1: 840, x2: 720, y2: 920, buffer: 8 },
        { x1: 720, y1: 920, x2: 720, y2: 1040, buffer: 8 }
    ];
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
    if (e.code === 'Escape') {
        helpPanel.classList.add('hidden');
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
