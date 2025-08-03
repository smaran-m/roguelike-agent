import { Game } from './game/Game';

// Wait for fonts to load completely
document.fonts.ready.then(async () => {
  // Force load all fonts we need
  try {
    await document.fonts.load('14px "Noto Emoji"');
    await document.fonts.load('12px "Noto Sans Mono"');
    await document.fonts.load('10px "Noto Sans Mono"');
    console.log('All fonts loaded successfully');
  } catch (e) {
    console.warn('Some fonts failed to load:', e);
  }
  
  const game = new Game();
  
  // Expose to window for debugging
  (window as any).game = game;
  
  // Update UI
  const updateUI = () => {
    const ui = document.getElementById('ui-overlay');
    if (ui) {
      ui.innerHTML = `
        <div>Position: ${game.player.x}, ${game.player.y}</div>
        <div>HP: ${game.player.stats.hp}/${game.player.stats.maxHp}</div>
        <div>Controls: WASD/Arrows to move, Spacebar to attack</div>
      `;
    }
  };
  
  updateUI();
  
  // Update UI on player move
  window.addEventListener('keydown', () => {
    setTimeout(updateUI, 150);
  });
});