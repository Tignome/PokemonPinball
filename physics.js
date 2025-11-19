class Ball {
    constructor(x, y) {
        this.reset(x, y);
        this.radius = 12;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.active = false;
    }

    applyPhysics(dt) {
        if (!this.active) return;
        this.vy += 900 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
}

class Flipper {
    constructor(x, y, direction) {
        this.pivot = { x, y };
        this.length = 120;
        this.width = 14;
        this.baseAngle = direction === 'left' ? Math.PI * 0.8 : Math.PI * 0.2;
        this.activeAngle = direction === 'left' ? Math.PI * 1.1 : Math.PI * -0.1;
        this.currentAngle = this.baseAngle;
        this.direction = direction;
        this.speed = 7;
        this.activated = false;
    }

    update(dt) {
        const target = this.activated ? this.activeAngle : this.baseAngle;
        const diff = target - this.currentAngle;
        this.currentAngle += diff * Math.min(1, dt * this.speed * 8);
    }

    setActive(state) {
        this.activated = state;
    }

    getEndpoints() {
        const { x, y } = this.pivot;
        const tipX = x + Math.cos(this.currentAngle) * this.length;
        const tipY = y + Math.sin(this.currentAngle) * this.length;
        return { pivot: { x, y }, tip: { x: tipX, y: tipY } };
    }

    collide(ball) {
        const { pivot, tip } = this.getEndpoints();
        const dx = tip.x - pivot.x;
        const dy = tip.y - pivot.y;
        const lengthSq = dx * dx + dy * dy;
        const t = ((ball.x - pivot.x) * dx + (ball.y - pivot.y) * dy) / lengthSq;
        const clamped = Math.max(0, Math.min(1, t));
        const closestX = pivot.x + clamped * dx;
        const closestY = pivot.y + clamped * dy;
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const distSq = distX * distX + distY * distY;
        const radius = ball.radius + this.width;
        if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq) || 0.001;
            const nx = distX / dist;
            const ny = distY / dist;
            const relVel = ball.vx * nx + ball.vy * ny;
            if (relVel < 0) {
                ball.vx -= (1.8) * relVel * nx;
                ball.vy -= (1.8) * relVel * ny;
            }
            ball.vx += nx * (this.activated ? 400 : 150);
            ball.vy += ny * (this.activated ? 400 : 150);
            audioManager.play('flipper');
        }
    }
}

function bounceWalls(ball, width, height) {
    const padding = 20;
    if (ball.x - ball.radius < padding) {
        ball.x = padding + ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.9;
    }
    if (ball.x + ball.radius > width - padding) {
        ball.x = width - padding - ball.radius;
        ball.vx = -Math.abs(ball.vx) * 0.9;
    }
    if (ball.y - ball.radius < padding) {
        ball.y = padding + ball.radius;
        ball.vy = Math.abs(ball.vy);
    }
}

function circleCollision(ball, circle) {
    const dx = ball.x - circle.x;
    const dy = ball.y - circle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ball.radius + circle.radius) {
        const nx = dx / dist;
        const ny = dy / dist;
        const rel = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * rel * nx;
        ball.vy -= 2 * rel * ny;
        ball.x = circle.x + (ball.radius + circle.radius) * nx;
        ball.y = circle.y + (ball.radius + circle.radius) * ny;
        return true;
    }
    return false;
}
