/**
 * Main app entry — Tower Defense 3D Commander
 */
try {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game();
  const renderer = new Renderer(canvas, game);

  // --- Touch / Click Handling ---
  const handleInteraction = (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    game.handleTap(x, y);
  };

  canvas.addEventListener('touchstart', handleInteraction, { passive: false });
  canvas.addEventListener('click', handleInteraction);

  // --- Shop Selection ---
  document.querySelectorAll('.shop-turret').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.shop-turret').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
      game.selectedTurretType = el.dataset.type;
      game.closeUpgradePanel();
    });
    el.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });
  });

  // --- Buttons ---
  document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('startScreen').classList.remove('active');
    game.startGame();
  });

  document.getElementById('startWaveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    game.startWave();
  });

  document.getElementById('upgradeBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    game.upgradeTurret();
  });

  document.getElementById('sellBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    game.sellTurret();
  });

  document.getElementById('closeUpgrade').addEventListener('click', (e) => {
    e.stopPropagation();
    game.closeUpgradePanel();
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.remove('active');
    game.startGame();
  });

  // --- Game Loop ---
  let lastTime = 0;
  function gameLoop(timestamp) {
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
    lastTime = timestamp;

    game.update(dt);
    renderer.render(dt);
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

} catch (e) {
  console.error('App Error:', e.message, e.stack);
  document.body.innerHTML = `<div style="color:red;padding:20px;font-size:16px;">
    <h2>Error</h2><pre>${e.message}\n${e.stack}</pre></div>`;
}
