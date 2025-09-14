import { Game } from './core/Game';
import { StartScreen } from './ui/start/StartScreen';
import { WorldConfigLoader } from './loaders/WorldConfigLoader';
import { CharacterManager } from './managers/CharacterManager';
import { Logger } from './utils/Logger';
import { getFontsToLoad } from './config/fonts';

// Wait for fonts to load completely
document.fonts.ready.then(async () => {
  // Force load all fonts we need
  try {
    // Ensure 'square' font is always loaded
    await document.fonts.load('14px square');
    Logger.debug('Square font loaded successfully.');

    const otherFonts = getFontsToLoad();
    for (const font of otherFonts) {
      await document.fonts.load(font);
    }
    Logger.debug('All fonts loaded successfully');
  } catch (e) {
    Logger.warn('Some fonts failed to load:', e);
  }
  
  const logger = Logger.getInstance();
  let game: Game | null = null;

  // Get container elements
  const startScreenContainer = document.getElementById('start-screen-container')!;
  const gameContainer = document.getElementById('game-container')!;

  // Initialize start screen
  const startScreen = new StartScreen(startScreenContainer);
  
  // Handle world selection and game initialization
  startScreen.onWorldStart(async (worldId: string) => {
    try {
      logger.info('Initializing game with selected world', { worldId });
      
      // Initialize world configuration
      const worldInitialized = WorldConfigLoader.initialize(worldId);
      if (!worldInitialized) {
        throw new Error(`Failed to initialize world: ${worldId}`);
      }
      
      // Initialize character manager for the selected world
      const characterManager = CharacterManager.getInstance();
      await characterManager.initializeForWorld();
      
      // Hide start screen
      startScreen.hide();
      
      // Show and setup game container
      gameContainer.style.display = 'flex';
      
      // Initialize game
      game = new Game();
      
      // Expose to window for debugging
      (window as any).game = game;
      (window as any).startScreen = startScreen;

      // Developer console commands
      (window as any).skipTurn = () => game?.skipEnemyTurn();
      
      logger.info('Game initialized successfully', { worldId });
      
    } catch (error) {
      logger.error('Failed to initialize game', { worldId, error });
      
      // Fallback to fantasy world if not already trying fantasy
      if (worldId !== 'fantasy') {
        logger.info('Falling back to fantasy world');
        WorldConfigLoader.initialize('fantasy');
        const characterManager = CharacterManager.getInstance();
        await characterManager.initializeForWorld();
        // Don't recursive call - just initialize with fantasy
        gameContainer.style.display = 'flex';
        startScreen.hide();
        game = new Game();
        (window as any).game = game;
        (window as any).skipTurn = () => game?.skipEnemyTurn();
      } else {
        // If fantasy also fails, show error but still try to start game
        alert('Failed to load game. Starting with minimal configuration.');
        gameContainer.style.display = 'flex';
        startScreen.hide();
        game = new Game();
        (window as any).game = game;
        (window as any).skipTurn = () => game?.skipEnemyTurn();
      }
    }
  });

  logger.info('Start screen initialized');
});