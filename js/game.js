/**
 * Core game state and logic
 */
class Game {
  constructor() {
    this.state = 'menu'; // menu, playing, placing, gameover
    this.map = new GameMap();
    this.waveManager = new WaveManager();
    this.turrets = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.coins = 100;
    this.lives = 10;
    this.score = 0;
    this.wave = 0;
    this.totalKills = 0;
    this.selectedTurretType = 'laser';
    this.selectedTurret = null; // for upgrade panel
    this.betweenWaves = true;
    this.bestWave = parseInt(localStorage.getItem('td3dBestWave') || '0');
    this.damageNumbers = [];
  }

  init(canvasW, canvasH) {
    this.map.init(canvasW, canvasH);
  }

  startGame() {
    this.state = 'playing';
    this.coins = 100;
    this.lives = 10;
    this.score = 0;
    this.wave = 0;
    this.totalKills = 0;
    this.turrets = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    this.betweenWaves = true;
    this.selectedTurret = null;
    this.map.init(this.map.offsetX * 2 + this.map.gridCols * this.map.tileSize,
      this.map.offsetY + this.map.gridRows * this.map.tileSize + 160);
    this.updateHUD();
  }

  startWave() {
    if (!this.betweenWaves) return;
    this.wave++;
    this.betweenWaves = false;
    this.closeUpgradePanel();
    this.waveManager.startWave(this.wave);
    this.updateHUD();

    // Show wave announce
    const announce = document.getElementById('waveAnnounce');
    const text = document.getElementById('waveAnnounceText');
    text.textContent = `WAVE ${this.wave}`;
    announce.classList.remove('hidden');
    announce.style.animation = 'none';
    announce.offsetHeight; // reflow
    announce.style.animation = '';
    setTimeout(() => announce.classList.add('hidden'), 1600);

    document.getElementById('startWaveBtn').classList.add('hidden');
  }

  update(dt) {
    if (this.state !== 'playing') return;

    // Spawn enemies
    this.waveManager.update(dt, this.map.pathWaypoints, this.enemies);

    // Update enemies
    for (const e of this.enemies) {
      e.update(dt);
      if (e.reached) {
        this.lives--;
        this.updateHUD();
        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Remove dead/reached enemies & award coins
    this.enemies = this.enemies.filter(e => {
      if (!e.alive && !e.reached && e.deathTimer <= 0) {
        // Already awarded when hp hit 0 below
        return false;
      }
      if (e.reached && !e.alive) return false;
      // Award coins on death
      if (!e.alive && !e.reached && e.reward > 0) {
        this.coins += e.reward;
        this.score += e.scoreValue;
        this.totalKills++;
        // Damage number
        this.damageNumbers.push({ x: e.x, y: e.y - 10, text: `+${e.reward}🪙`, timer: 1.0, color: '#ffd740' });
        // Death particles
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 30 + Math.random() * 60;
          this.particles.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5 + Math.random() * 0.3,
            maxLife: 0.8,
            color: e.color,
            size: 3 + Math.random() * 3
          });
        }
        e.reward = 0; // prevent double award
        this.updateHUD();
      }
      return true;
    });

    // Update turrets
    for (const t of this.turrets) {
      t.update(dt, this.enemies, this.projectiles);
    }

    // Update projectiles
    for (const p of this.projectiles) {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = p.speed * dt;

      if (dist < move + 5) {
        // Hit
        p.alive = false;
        if (p.target && p.target.alive) {
          p.target.takeDamage(p.damage);

          // Apply poison
          if (p.dotDamage > 0) {
            p.target.applyPoison(p.dotDamage, p.dotDuration);
          }

          // Splash damage
          if (p.splash > 0) {
            for (const e of this.enemies) {
              if (e === p.target || !e.alive) continue;
              const sd = Math.sqrt((e.x - p.tx) ** 2 + (e.y - p.ty) ** 2);
              if (sd <= p.splash) {
                e.takeDamage(Math.floor(p.damage * 0.5));
              }
            }
            // Splash particles
            for (let i = 0; i < 8; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 40 + Math.random() * 80;
              this.particles.push({
                x: p.tx, y: p.ty,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                color: p.color,
                size: 2 + Math.random() * 3
              });
            }
          }
        }
      } else {
        // Follow target if alive
        if (p.target && p.target.alive) {
          p.tx = p.target.x;
          p.ty = p.target.y;
        }
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.alive !== false);

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Damage numbers
    for (const d of this.damageNumbers) {
      d.y -= 30 * dt;
      d.timer -= dt;
    }
    this.damageNumbers = this.damageNumbers.filter(d => d.timer > 0);

    // Check wave complete
    if (!this.betweenWaves && this.waveManager.isWaveComplete(this.enemies)) {
      this.betweenWaves = true;
      this.enemies = [];
      // Wave bonus
      const bonus = 10 + this.wave * 5;
      this.coins += bonus;
      this.score += bonus * 2;
      this.damageNumbers.push({
        x: this.map.offsetX + this.map.gridCols * this.map.tileSize * 0.5,
        y: this.map.offsetY + this.map.gridRows * this.map.tileSize * 0.5,
        text: `WAVE ${this.wave} COMPLETE! +${bonus}🪙`,
        timer: 2.0,
        color: '#00d4ff'
      });
      this.updateHUD();
      document.getElementById('startWaveBtn').classList.remove('hidden');
    }

    this.updateShopState();
  }

  handleTap(sx, sy) {
    if (this.state !== 'playing') return;

    const cell = this.map.screenToGrid(sx, sy);
    if (!cell) {
      this.closeUpgradePanel();
      return;
    }

    // Check if tapping an existing turret
    const existing = this.turrets.find(t => t.col === cell.col && t.row === cell.row);
    if (existing) {
      this.openUpgradePanel(existing);
      return;
    }

    // Place new turret
    if (!this.map.canPlace(cell.col, cell.row)) return;
    const cost = TURRET_DEFS[this.selectedTurretType].cost;
    if (this.coins < cost) return;

    this.coins -= cost;
    const pos = this.map.gridToScreen(cell.col, cell.row);
    const turret = new Turret(this.selectedTurretType, cell.col, cell.row, pos.x, pos.y, this.map.tileSize);
    this.turrets.push(turret);
    this.map.placeTurret(cell.col, cell.row);

    // Place particles
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 40;
      this.particles.push({
        x: pos.x, y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.5, maxLife: 0.5,
        color: TURRET_DEFS[this.selectedTurretType].color,
        size: 3
      });
    }

    this.updateHUD();
    this.closeUpgradePanel();
  }

  openUpgradePanel(turret) {
    this.selectedTurret = turret;
    const def = turret.def;
    const panel = document.getElementById('upgradePanel');

    document.getElementById('upgTurretName').textContent = def.name + ' Turret';
    document.getElementById('upgTurretName').style.color = def.color;
    document.getElementById('upgTurretLevel').textContent = `Lv ${turret.level + 1}`;
    document.getElementById('upgDmg').textContent = turret.damage;
    document.getElementById('upgRange').textContent = (turret.range / turret.tileSize).toFixed(1);
    document.getElementById('upgSpeed').textContent = turret.fireRate < 0.4 ? 'Fast' : turret.fireRate < 0.8 ? 'Med' : 'Slow';

    const upgradeBtn = document.getElementById('upgradeBtn');
    if (turret.canUpgrade) {
      document.getElementById('upgCost').textContent = turret.upgradeCost;
      upgradeBtn.classList.toggle('disabled', this.coins < turret.upgradeCost);
      upgradeBtn.style.display = '';
    } else {
      upgradeBtn.style.display = 'none';
    }
    document.getElementById('sellPrice').textContent = turret.sellPrice;

    panel.classList.remove('hidden');
  }

  closeUpgradePanel() {
    this.selectedTurret = null;
    document.getElementById('upgradePanel').classList.add('hidden');
  }

  upgradeTurret() {
    if (!this.selectedTurret || !this.selectedTurret.canUpgrade) return;
    if (this.coins < this.selectedTurret.upgradeCost) return;
    this.coins -= this.selectedTurret.upgradeCost;
    this.selectedTurret.upgrade();
    this.openUpgradePanel(this.selectedTurret);
    this.updateHUD();
  }

  sellTurret() {
    if (!this.selectedTurret) return;
    const t = this.selectedTurret;
    this.coins += t.sellPrice;
    this.map.removeTurret(t.col, t.row);
    this.turrets = this.turrets.filter(x => x !== t);
    this.closeUpgradePanel();
    this.updateHUD();
  }

  gameOver() {
    this.state = 'gameover';
    if (this.wave > this.bestWave) {
      this.bestWave = this.wave;
      localStorage.setItem('td3dBestWave', this.bestWave);
    }
    document.getElementById('finalWave').textContent = this.wave;
    document.getElementById('finalKills').textContent = this.totalKills;
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('bestWave').textContent = this.bestWave;
    document.getElementById('gameOverScreen').classList.add('active');
    document.getElementById('startWaveBtn').classList.add('hidden');
  }

  updateHUD() {
    document.getElementById('wave').textContent = this.wave;
    document.getElementById('coins').textContent = this.coins;
    document.getElementById('lives').textContent = this.lives;
    document.getElementById('score').textContent = this.score;
  }

  updateShopState() {
    document.querySelectorAll('.shop-turret').forEach(el => {
      const type = el.dataset.type;
      const cost = TURRET_DEFS[type].cost;
      el.classList.toggle('disabled', this.coins < cost);
    });
  }
}
