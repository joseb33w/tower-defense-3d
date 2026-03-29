/**
 * High-performance isometric 3D renderer for the tower defense game
 * Uses canvas 2D with faux-3D projection for depth
 */
class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.time = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.game.init(this.W, this.H);
  }

  render(dt) {
    this.time += dt;
    const ctx = this.ctx;
    const g = this.game;
    const map = g.map;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.H);
    bgGrad.addColorStop(0, '#0a0e1a');
    bgGrad.addColorStop(0.5, '#0f1628');
    bgGrad.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.W, this.H);

    if (g.state === 'menu') {
      this.renderMenuBg(ctx);
      return;
    }

    // Grid background glow
    const gridCX = map.offsetX + map.gridCols * map.tileSize * 0.5;
    const gridCY = map.offsetY + map.gridRows * map.tileSize * 0.5;
    const gridGlow = ctx.createRadialGradient(gridCX, gridCY, 0, gridCX, gridCY, map.gridRows * map.tileSize * 0.6);
    gridGlow.addColorStop(0, 'rgba(0,212,255,0.03)');
    gridGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gridGlow;
    ctx.fillRect(0, 0, this.W, this.H);

    this.renderGrid(ctx, map);
    this.renderPath(ctx, map);
    this.renderTurrets(ctx, g);
    this.renderEnemies(ctx, g);
    this.renderProjectiles(ctx, g);
    this.renderParticles(ctx, g);
    this.renderDamageNumbers(ctx, g);
    this.renderSelectedTurretRange(ctx, g);
  }

  renderGrid(ctx, map) {
    const ts = map.tileSize;
    const ox = map.offsetX;
    const oy = map.offsetY;

    for (let r = 0; r < map.gridRows; r++) {
      for (let c = 0; c < map.gridCols; c++) {
        const x = ox + c * ts;
        const y = oy + r * ts;
        const tile = map.tiles[r][c];

        if (tile === 0) {
          // Empty placeable tile — subtle 3D raised look
          ctx.fillStyle = 'rgba(20,30,55,0.6)';
          ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);

          // Top edge highlight
          ctx.fillStyle = 'rgba(60,80,120,0.2)';
          ctx.fillRect(x + 1, y + 1, ts - 2, 2);

          // Inner border
          ctx.strokeStyle = 'rgba(40,60,100,0.25)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 1.5, y + 1.5, ts - 3, ts - 3);
        }
      }
    }
  }

  renderPath(ctx, map) {
    const ts = map.tileSize;
    const ox = map.offsetX;
    const oy = map.offsetY;
    const wp = map.pathWaypoints;

    // Path tiles — darker recessed look
    for (const key of map.pathCells) {
      const [c, r] = key.split(',').map(Number);
      const x = ox + c * ts;
      const y = oy + r * ts;

      // Recessed base
      ctx.fillStyle = 'rgba(15,20,35,0.9)';
      ctx.fillRect(x, y, ts, ts);

      // Inner shadow (top)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y, ts, 3);

      // Subtle border
      ctx.strokeStyle = 'rgba(30,45,70,0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
    }

    // Animated path flow dots
    if (wp.length > 1) {
      const dotCount = 20;
      for (let i = 0; i < dotCount; i++) {
        const t = ((this.time * 0.15 + i / dotCount) % 1) * (wp.length - 1);
        const idx = Math.floor(t);
        const frac = t - idx;
        if (idx >= wp.length - 1) continue;
        const px = wp[idx].x + (wp[idx + 1].x - wp[idx].x) * frac;
        const py = wp[idx].y + (wp[idx + 1].y - wp[idx].y) * frac;

        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.time * 3 + i);
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Entry arrow
    if (wp.length > 0) {
      const pulse = 0.6 + 0.4 * Math.sin(this.time * 3);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#4ade80';
      ctx.font = `${ts * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▶', wp[0].x - ts * 0.6, wp[0].y);
      ctx.globalAlpha = 1;
    }

    // Exit marker
    if (wp.length > 0) {
      const last = wp[wp.length - 1];
      const pulse = 0.6 + 0.4 * Math.sin(this.time * 3);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ff3a3a';
      ctx.font = `${ts * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠', last.x, last.y + ts * 0.7);
      ctx.globalAlpha = 1;
    }
  }

  renderTurrets(ctx, g) {
    const ts = g.map.tileSize;

    for (const t of g.turrets) {
      const def = TURRET_DEFS[t.type];
      const x = t.x;
      const y = t.y;
      const s = ts * 0.38;

      // 3D base shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.3, s * 0.8, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Base platform — 3D extruded look
      const baseH = s * 0.5;
      ctx.fillStyle = '#1a2540';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7, y);
      ctx.lineTo(x - s * 0.7, y - baseH);
      ctx.lineTo(x + s * 0.7, y - baseH);
      ctx.lineTo(x + s * 0.7, y);
      ctx.closePath();
      ctx.fill();

      // Base top
      ctx.fillStyle = '#243050';
      ctx.fillRect(x - s * 0.7, y - baseH - 2, s * 1.4, 4);

      // Turret body — colored 3D shape
      const bodyY = y - baseH;

      ctx.save();
      ctx.translate(x, bodyY);

      // Glow under turret
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.2);
      glow.addColorStop(0, def.color + '30');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const grad = ctx.createLinearGradient(-s * 0.4, -s * 0.5, s * 0.4, s * 0.2);
      grad.addColorStop(0, def.colorLight);
      grad.addColorStop(1, def.color);
      ctx.fillStyle = grad;

      // Round body
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Level indicators
      for (let i = 0; i <= t.level; i++) {
        ctx.fillStyle = '#ffd740';
        ctx.beginPath();
        ctx.arc(-s * 0.25 + i * s * 0.25, -s * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Barrel / gun
      ctx.save();
      ctx.rotate(t.rotation);
      ctx.fillStyle = def.colorLight;
      ctx.fillRect(0, -2.5, s * 0.65, 5);
      // Muzzle
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(s * 0.55, -1.5, s * 0.15, 3);
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.restore();

      // Beam effect
      if (t.beamTimer > 0 && t.beamTarget) {
        const alpha = t.beamTimer / 0.1;
        ctx.strokeStyle = def.color;
        ctx.lineWidth = t.type === 'freeze' ? 3 : 2;
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.moveTo(x, bodyY);
        ctx.lineTo(t.beamTarget.x, t.beamTarget.y);
        ctx.stroke();

        // Glow beam
        ctx.strokeStyle = def.colorLight;
        ctx.lineWidth = t.type === 'freeze' ? 5 : 3;
        ctx.globalAlpha = alpha * 0.25;
        ctx.beginPath();
        ctx.moveTo(x, bodyY);
        ctx.lineTo(t.beamTarget.x, t.beamTarget.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  renderSelectedTurretRange(ctx, g) {
    if (g.selectedTurret) {
      const t = g.selectedTurret;
      ctx.strokeStyle = TURRET_DEFS[t.type].color + '60';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fill
      ctx.fillStyle = TURRET_DEFS[t.type].color + '10';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderEnemies(ctx, g) {
    const ts = g.map.tileSize;

    for (const e of g.enemies) {
      if (!e.alive && e.deathTimer <= 0) continue;

      const size = ts * 0.35 * e.size;
      let alpha = 1;

      if (!e.alive) {
        alpha = e.deathTimer / 0.4;
      }

      ctx.globalAlpha = alpha;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + size * 0.4, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const bodyColor = e.hitFlash > 0 ? '#ffffff' : e.color;
      const grad = ctx.createRadialGradient(e.x - size * 0.2, e.y - size * 0.3, 0, e.x, e.y, size);
      grad.addColorStop(0, bodyColor);
      grad.addColorStop(1, e.alive ? this.darken(e.color, 0.5) : '#333');
      ctx.fillStyle = grad;

      // 3D sphere body
      ctx.beginPath();
      ctx.arc(e.x, e.y - size * 0.1, size, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(e.x - size * 0.25, e.y - size * 0.35, size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      if (e.alive) {
        const eyeY = e.y - size * 0.15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(e.x - size * 0.25, eyeY, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e.x + size * 0.25, eyeY, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(e.x - size * 0.2, eyeY, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e.x + size * 0.3, eyeY, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // Status effects
      if (e.slowTimer > 0 && e.alive) {
        ctx.strokeStyle = 'rgba(103,232,249,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y - size * 0.1, size * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.dotTimer > 0 && e.alive) {
        ctx.fillStyle = 'rgba(132,204,22,0.4)';
        for (let i = 0; i < 3; i++) {
          const angle = this.time * 4 + i * Math.PI * 2 / 3;
          const bx = e.x + Math.cos(angle) * size * 0.8;
          const by = e.y - size * 0.1 + Math.sin(angle) * size * 0.5;
          ctx.beginPath();
          ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // HP bar
      if (e.alive && e.hp < e.maxHp) {
        const barW = size * 2;
        const barH = 4;
        const barX = e.x - barW * 0.5;
        const barY = e.y - size * 1.3;
        const hpPct = e.hp / e.maxHp;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        const hpColor = hpPct > 0.6 ? '#4ade80' : hpPct > 0.3 ? '#fbbf24' : '#ef4444';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpPct, barH);
      }

      // Boss crown
      if (e.variant === 'boss' && e.alive) {
        ctx.font = `${size * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('👑', e.x, e.y - size * 1.4);
      }

      ctx.globalAlpha = 1;
    }
  }

  renderProjectiles(ctx, g) {
    for (const p of g.projectiles) {
      if (p.alive === false) continue;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Trail
      ctx.fillStyle = p.color + '40';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderParticles(ctx, g) {
    for (const p of g.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderDamageNumbers(ctx, g) {
    for (const d of g.damageNumbers) {
      const alpha = Math.min(1, d.timer);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.font = 'bold 14px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  }

  renderMenuBg(ctx) {
    // Grid lines animation
    const time = this.time;
    ctx.strokeStyle = 'rgba(0,212,255,0.06)';
    ctx.lineWidth = 1;

    for (let i = 0; i < 20; i++) {
      const y = ((time * 20 + i * 40) % this.H);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.W, y);
      ctx.stroke();
    }

    for (let i = 0; i < 15; i++) {
      const x = ((time * 15 + i * 50) % this.W);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.H);
      ctx.stroke();
    }

    // Floating particles
    for (let i = 0; i < 30; i++) {
      const px = (Math.sin(time * 0.2 + i * 1.7) * 0.5 + 0.5) * this.W;
      const py = (Math.cos(time * 0.15 + i * 2.3) * 0.5 + 0.5) * this.H;
      const alpha = 0.1 + 0.1 * Math.sin(time * 2 + i);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#ff6b35' : '#a855f7';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  darken(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
  }
}
