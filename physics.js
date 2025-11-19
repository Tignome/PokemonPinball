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
        const leftBase = 25 * Math.PI / 180;
        const leftActive = -45 * Math.PI / 180;
        const rightBase = 155 * Math.PI / 180;
        const rightActive = 215 * Math.PI / 180;
        this.baseAngle = direction === 'left' ? leftBase : rightBase;
        this.activeAngle = direction === 'left' ? leftActive : rightActive;
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

function bounceOffSegments(ball, segments, restitution = 0.9) {
    segments.forEach(segment => {
        const dx = segment.x2 - segment.x1;
        const dy = segment.y2 - segment.y1;
        const lengthSq = dx * dx + dy * dy;
        if (lengthSq === 0) return;
        const t = ((ball.x - segment.x1) * dx + (ball.y - segment.y1) * dy) / lengthSq;
        const clamped = Math.max(0, Math.min(1, t));
        const closestX = segment.x1 + clamped * dx;
        const closestY = segment.y1 + clamped * dy;
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const distSq = distX * distX + distY * distY;
        const radius = ball.radius + (segment.buffer || 0);
        if (distSq <= radius * radius) {
            const dist = Math.sqrt(distSq) || 0.0001;
            const nx = distX / dist;
            const ny = distY / dist;
            ball.x = closestX + nx * radius;
            ball.y = closestY + ny * radius;
            const relVel = ball.vx * nx + ball.vy * ny;
            if (relVel < 0) {
                ball.vx -= (1 + restitution) * relVel * nx;
                ball.vy -= (1 + restitution) * relVel * ny;
            }
        }
    });
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
