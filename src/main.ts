import { Game } from './game/Game';

// Wait for fonts to load
document.fonts.ready.then(() => {
  const game = new Game();
  
  // Expose to window for debugging
  (window as any).game = game;
  
  // Update UI
  const updateUI = () => {
    const ui = document.getElementById('ui-overlay');
    if (ui) {
      ui.innerHTML = `
        <div>Position: ${game.player.x}, ${game.player.y}</div>
        <div>Use arrow keys or WASD to move</div>
      `;
    }
  };
  
  updateUI();
  
  // Update UI on player move
  window.addEventListener('keydown', () => {
    setTimeout(updateUI, 150);
  });
});