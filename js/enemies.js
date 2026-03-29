/**
 * Enemy types and wave spawning
 */
class Enemy {
  constructor(waypoints, wave, variant) {
    this.waypoints = waypoints;
    this.waypointIdx = 0;
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    this.variant = variant || 'normal'; // normal, fast, tank, boss

    const mult = this.getVariantMult();
    this.maxHp = Math.floor((20 + wave * 12 + wave * wave * 0.8) * mult.hp);
    this.hp = this.maxHp;
    this.baseSpeed = (55 + wave * 3) * mult.speed;
    this.speed = this.baseSpeed;
    this.reward = Math.floor((5 + wave * 1.5) * mult.reward);
    this.scoreValue = Math.floor((10 + wave * 5) * mult.reward);

    // Effects
    this.slowAmount = 0;
    this.slowTimer = 0;
    this.dotDamage = 0;
    this.dotTimer = 0;
    this.dotTick = 0;

    this.alive = true;
    this.reached = false;
    this.deathTimer = 0;
    this.size = mult.size;
    this.color = mult.color;
    this.hitFlash = 0;
  }

  getVariantMult() {
    switch (this.variant) {
      case 'fast':  return { hp: 0.6, speed: 1.6, reward: 1.2, size: 0.6, color: '#fbbf24' };
      case 'tank':  return { hp: 2.5, speed: 0.65, reward: 2.0, size: 1.2, color: '#a855f7' };
      case 'boss':  return { hp: 6.0, speed: 0.5, reward: 5.0, size: 1.5, color: '#ef4444' };
      default:      return { hp: 1.0, speed: 1.0, reward: 1.0, size: 0.8, color: '#f97316' };
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathTimer = 0.4;
    }
  }

  applySlow(amount, duration) {
    if (amount > this.slowAmount) {
      this.slowAmount = amount;
    }
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  applyPoison(damage, duration) {
    this.dotDamage = Math.max(this.dotDamage, damage);
    this.dotTimer = Math.max(this.dotTimer, duration);
  }

  update(dt) {
    if (!this.alive) {
      this.deathTimer -= dt;
      return;
    }

    this.hitFlash -= dt;
    if (this.hitFlash < 0) this.hitFlash = 0;

    // Slow effect
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      this.speed = this.baseSpeed * (1 - this.slowAmount);
      if (this.slowTimer <= 0) {
        this.slowAmount = 0;
        this.speed = this.baseSpeed;
      }
    }

    // Poison DOT
    if (this.dotTimer > 0) {
      this.dotTick -= dt;
      if (this.dotTick <= 0) {
        this.dotTick = 0.5;
        this.takeDamage(this.dotDamage * 0.5);
      }
      this.dotTimer -= dt;
      if (this.dotTimer <= 0) {
        this.dotDamage = 0;
      }
    }

    // Move along path
    if (this.waypointIdx >= this.waypoints.length) {
      this.reached = true;
      this.alive = false;
      return;
    }

    const wp = this.waypoints[this.waypointIdx];
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      this.waypointIdx++;
    } else {
      const move = this.speed * dt;
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
    }
  }
}

class WaveManager {
  constructor() {
    this.wave = 0;
    this.spawning = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.7;
    this.waveActive = false;
  }

  startWave(wave) {
    this.wave = wave;
    this.spawning = true;
    this.waveActive = true;
    this.spawnQueue = [];
    this.spawnTimer = 0;

    const baseCount = 5 + wave * 2;
    this.spawnInterval = Math.max(0.25, 0.7 - wave * 0.02);

    // Normal enemies
    for (let i = 0; i < baseCount; i++) {
      this.spawnQueue.push('normal');
    }

    // Fast enemies (from wave 3)
    if (wave >= 3) {
      const fastCount = Math.floor(wave * 0.6);
      for (let i = 0; i < fastCount; i++) {
        this.spawnQueue.push('fast');
      }
    }

    // Tank enemies (from wave 5)
    if (wave >= 5) {
      const tankCount = Math.floor((wave - 4) * 0.5);
      for (let i = 0; i < tankCount; i++) {
        this.spawnQueue.push('tank');
      }
    }

    // Boss every 5 waves
    if (wave % 5 === 0 && wave > 0) {
      this.spawnQueue.push('boss');
    }

    // Shuffle
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
  }

  update(dt, waypoints, enemies) {
    if (!this.spawning) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
      const variant = this.spawnQueue.shift();
      enemies.push(new Enemy(waypoints, this.wave, variant));
      this.spawnTimer = this.spawnInterval;
    }

    if (this.spawnQueue.length === 0) {
      this.spawning = false;
    }
  }

  isWaveComplete(enemies) {
    if (this.spawning) return false;
    return enemies.every(e => !e.alive && e.deathTimer <= 0);
  }
}
