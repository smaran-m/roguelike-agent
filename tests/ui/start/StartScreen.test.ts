import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { StartScreen } from '../../../src/ui/start/StartScreen';
import { WorldConfigLoader } from '../../../src/loaders/WorldConfigLoader';

// Mock the WorldConfigLoader
vi.mock('../../../src/loaders/WorldConfigLoader');

describe('StartScreen', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let startScreen: StartScreen;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="test-container"></div>
        </body>
      </html>
    `, { url: 'http://localhost:3000' });

    global.document = dom.window.document;
    global.window = dom.window as any;
    global.HTMLElement = dom.window.HTMLElement;
    global.setTimeout = dom.window.setTimeout;

    container = document.getElementById('test-container')!;

    // Mock WorldConfigLoader methods
    vi.mocked(WorldConfigLoader.getWorldDisplayList).mockReturnValue([
      { id: 'fantasy', name: 'Fantasy Realm', description: 'Magic world', theme: 'fantasy' },
      { id: 'cyberpunk', name: 'Neon City', description: 'Cyber world', theme: 'cyberpunk' },
      { id: 'steampunk', name: 'Steam Age', description: 'Steam world', theme: 'steampunk' },
      { id: 'horror', name: 'Nightmare', description: 'Horror world', theme: 'horror' }
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    test('should create start screen with proper HTML structure', () => {
      startScreen = new StartScreen(container);
      
      expect(container.querySelector('.start-screen')).toBeTruthy();
      expect(container.querySelector('.start-screen__title')).toBeTruthy();
      expect(container.querySelector('#world-picker-container')).toBeTruthy();
      expect(container.querySelector('#loading-overlay')).toBeTruthy();
    });

    test('should initialize world picker component', () => {
      startScreen = new StartScreen(container);
      
      // World picker should be created and display worlds
      expect(container.querySelector('.world-picker')).toBeTruthy();
      expect(container.querySelectorAll('.world-card')).toHaveLength(4);
    });
  });

  describe('world selection', () => {
    test('should call onGameStart callback when world is selected', async () => {
      const mockCallback = vi.fn();
      startScreen = new StartScreen(container);
      startScreen.onWorldStart(mockCallback);

      // Simulate clicking on fantasy world card
      const fantasyCard = container.querySelector('[data-world-id="fantasy"]') as HTMLElement;
      expect(fantasyCard).toBeTruthy();
      
      fantasyCard.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockCallback).toHaveBeenCalledWith('fantasy');
    });

    test('should show loading overlay during world selection', async () => {
      const mockCallback = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      startScreen = new StartScreen(container);
      startScreen.onWorldStart(mockCallback);

      const fantasyCard = container.querySelector('[data-world-id="fantasy"]') as HTMLElement;
      fantasyCard.click();

      // Check loading overlay appears
      const loadingOverlay = container.querySelector('#loading-overlay');
      expect(loadingOverlay?.classList.contains('hidden')).toBe(false);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 700));
      
      expect(loadingOverlay?.classList.contains('hidden')).toBe(true);
    });

    test('should handle errors gracefully with fallback to fantasy', async () => {
      const mockCallback = vi.fn().mockRejectedValue(new Error('Test error'));
      startScreen = new StartScreen(container);
      startScreen.onWorldStart(mockCallback);

      const cyberpunkCard = container.querySelector('[data-world-id="cyberpunk"]') as HTMLElement;
      cyberpunkCard.click();

      await new Promise(resolve => setTimeout(resolve, 600));

      // Should have been called twice: once with cyberpunk (failed), once with fantasy (fallback)
      expect(mockCallback).toHaveBeenCalledWith('cyberpunk');
      expect(mockCallback).toHaveBeenCalledWith('fantasy');
    });
  });

  describe('visibility controls', () => {
    test('should hide and show start screen', () => {
      startScreen = new StartScreen(container);
      
      startScreen.hide();
      expect(container.style.display).toBe('none');
      
      startScreen.show();
      expect(container.style.display).toBe('block');
    });
  });
});