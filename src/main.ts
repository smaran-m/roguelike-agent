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
  
  // UI is now handled by the Renderer system
  // Position text is in bottom right of gameplay area
  // Controls text is in bottom left of gameplay area  
  // HP is shown in the character sheet panel
});