/**
 * Turret definitions and turret manager
 */
const TURRET_DEFS = {
  laser: {
    name: 'Laser',
    cost: 25,
    color: '#f97316',
    colorLight: '#fb923c',
    damage: [8, 16, 30],
    range: [2.2, 2.8, 3.5],
    fireRate: [0.3, 0.25, 0.18],
    upgradeCost: [40, 80],
    sellRatio: 0.5,
    projectile: 'beam',
    description: 'Fast firing laser beam'
  },
  cannon: {
    name: 'Cannon',
    cost: 40,
    color: '#ef4444',
    colorLight: '#f87171',
    damage: [25, 50, 90],
    range: [2.0, 2.5, 3.0],
    fireRate: [1.2, 1.0, 0.8],
    upgradeCost: [60, 120],
    splash: [0.8, 1.0, 1.3],
    sellRatio: 0.5,
    projectile: 'ball',
    description: 'Slow but powerful splash damage'
  },
  freeze: {
    name: 'Freeze',
    cost: 35,
    color: '#06b6d4',
    colorLight: '#67e8f9',
    damage: [4, 8, 14],
    range: [2.5, 3.0, 3.5],
    fireRate: [0.5, 0.4, 0.3],
    upgradeCost: [50, 100],
    slowAmount: [0.4, 0.55, 0.7],
    slowDuration: [1.5, 2.0, 2.5],
    sellRatio: 0.5,
    projectile: 'beam',
    description: 'Slows enemies down'
  },
  poison: {
    name: 'Poison',
    cost: 30,
    color: '#84cc16',
    colorLight: '#a3e635',
    damage: [3, 6, 10],
    range: [2.3, 2.8, 3.3],
    fireRate: [0.6, 0.5, 0.35],
    upgradeCost: [45, 90],
    dotDamage: [5, 12, 22],
    dotDuration: [3, 4, 5],
    sellRatio: 0.5,
    projectile: 'ball',
    description: 'Poison damage over time'
  }
};

class Turret {
  constructor(type, col, row, screenX, screenY, tileSize) {
    this.type = type;
    this.col = col;
    this.row = row;
    this.x = screenX;
    this.y = screenY;
    this.tileSize = tileSize;
    this.level = 0; // 0,1,2
    this.fireCooldown = 0;
    this.target = null;
    this.rotation = 0;
    this.totalSpent = TURRET_DEFS[type].cost;
    this.beamTarget = null;
    this.beamTimer = 0;
  }

  get def() { return TURRET_DEFS[this.type]; }
  get damage() { return this.def.damage[this.level]; }
  get range() { return this.def.range[this.level] * this.tileSize; }
  get fireRate() { return this.def.fireRate[this.level]; }
  get maxLevel() { return 2; }
  get canUpgrade() { return this.level < this.maxLevel; }
  get upgradeCost() { return this.canUpgrade ? this.def.upgradeCost[this.level] : 0; }
  get sellPrice() { return Math.floor(this.totalSpent * this.def.sellRatio); }

  upgrade() {
    if (!this.canUpgrade) return false;
    this.totalSpent += this.def.upgradeCost[this.level];
    this.level++;
    return true;
  }

  update(dt, enemies, projectiles) {
    this.fireCooldown -= dt;
    this.beamTimer -= dt;
    if (this.beamTimer < 0) this.beamTimer = 0;

    // Find closest enemy in range
    let closest = null;
    let closestDist = Infinity;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.range && dist < closestDist) {
        closest = e;
        closestDist = dist;
      }
    }

    this.target = closest;
    if (closest) {
      this.rotation = Math.atan2(closest.y - this.y, closest.x - this.x);
    }

    if (closest && this.fireCooldown <= 0) {
      this.fire(closest, enemies, projectiles);
      this.fireCooldown = this.fireRate;
    }
  }

  fire(target, enemies, projectiles) {
    const def = this.def;

    if (def.projectile === 'beam') {
      // Instant hit
      this.beamTarget = { x: target.x, y: target.y };
      this.beamTimer = 0.1;
      target.takeDamage(this.damage);

      if (this.type === 'freeze') {
        const slow = def.slowAmount[this.level];
        const dur = def.slowDuration[this.level];
        target.applySlow(slow, dur);
      }
    } else {
      // Projectile
      projectiles.push({
        x: this.x,
        y: this.y,
        tx: target.x,
        ty: target.y,
        target: target,
        speed: 300,
        type: this.type,
        damage: this.damage,
        splash: def.splash ? def.splash[this.level] * this.tileSize : 0,
        dotDamage: def.dotDamage ? def.dotDamage[this.level] : 0,
        dotDuration: def.dotDuration ? def.dotDuration[this.level] : 0,
        color: def.color,
        size: 4 + this.level
      });
    }
  }
}
