import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { WorldPicker } from '../../../src/ui/start/WorldPicker';
import { WorldConfigLoader } from '../../../src/loaders/WorldConfigLoader';

// Mock the WorldConfigLoader
vi.mock('../../../src/loaders/WorldConfigLoader');

describe('WorldPicker', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let mockCallback: jest.Mock;

  const mockWorlds = [
    { id: 'fantasy', name: 'Fantasy Realm', description: 'A magical world', theme: 'fantasy' },
    { id: 'cyberpunk', name: 'Neon City 2088', description: 'High-tech dystopia', theme: 'cyberpunk' },
    { id: 'steampunk', name: 'Victorian Steam Age', description: 'Industrial revolution', theme: 'steampunk' },
    { id: 'horror', name: 'Eldritch Nightmare', description: 'Cosmic horror', theme: 'horror' }
  ];

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
    mockCallback = vi.fn();

    // Mock WorldConfigLoader methods
    vi.mocked(WorldConfigLoader.getWorldDisplayList).mockReturnValue(mockWorlds);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    test('should load and display all worlds', async () => {
      new WorldPicker(container, mockCallback);
      
      // Allow for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(container.querySelector('.world-picker')).toBeTruthy();
      expect(container.querySelectorAll('.world-card')).toHaveLength(4);
      
      // Check that world names are displayed
      expect(container.textContent).toContain('Fantasy Realm');
      expect(container.textContent).toContain('Neon City 2088');
      expect(container.textContent).toContain('Victorian Steam Age');
      expect(container.textContent).toContain('Eldritch Nightmare');
    });

    test('should display world information correctly', async () => {
      new WorldPicker(container, mockCallback);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const fantasyCard = container.querySelector('[data-world-id="fantasy"]');
      expect(fantasyCard).toBeTruthy();
      expect(fantasyCard?.textContent).toContain('Fantasy Realm');
      expect(fantasyCard?.textContent).toContain('A magical world');
      expect(fantasyCard?.textContent).toContain('Beginner');
      expect(fantasyCard?.querySelector('.world-card__icon')?.textContent).toBe('⚔️');
    });

    test('should assign correct difficulty levels', async () => {
      new WorldPicker(container, mockCallback);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const fantasyCard = container.querySelector('[data-world-id="fantasy"]');
      const cyberpunkCard = container.querySelector('[data-world-id="cyberpunk"]');
      const steampunkCard = container.querySelector('[data-world-id="steampunk"]');
      const horrorCard = container.querySelector('[data-world-id="horror"]');

      expect(fantasyCard?.textContent).toContain('Beginner');
      expect(cyberpunkCard?.textContent).toContain('Advanced');
      expect(steampunkCard?.textContent).toContain('Intermediate');
      expect(horrorCard?.textContent).toContain('Expert');
    });

    test('should assign correct theme icons', async () => {
      new WorldPicker(container, mockCallback);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const fantasyIcon = container.querySelector('[data-world-id="fantasy"] .world-card__icon');
      const cyberpunkIcon = container.querySelector('[data-world-id="cyberpunk"] .world-card__icon');
      const steampunkIcon = container.querySelector('[data-world-id="steampunk"] .world-card__icon');
      const horrorIcon = container.querySelector('[data-world-id="horror"] .world-card__icon');

      expect(fantasyIcon?.textContent).toBe('⚔️');
      expect(cyberpunkIcon?.textContent).toBe('🤖');
      expect(steampunkIcon?.textContent).toBe('⚙️');
      expect(horrorIcon?.textContent).toBe('👁️');
    });
  });

  describe('world selection', () => {
    test('should call callback when world card is clicked', async () => {
      new WorldPicker(container, mockCallback);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const fantasyCard = container.querySelector('[data-world-id="fantasy"]') as HTMLElement;
      fantasyCard.click();

      expect(mockCallback).toHaveBeenCalledWith('fantasy');
    });

    test('should disable cards during selection', async () => {
      const slowCallback = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      new WorldPicker(container, slowCallback);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const fantasyCard = container.querySelector('[data-world-id="fantasy"]') as HTMLElement;
      fantasyCard.click();

      // Cards should be disabled
      const allCards = container.querySelectorAll('.world-card');
      allCards.forEach(card => {
        expect(card.classList.contains('world-card--disabled')).toBe(true);
      });

      // Selected card should be highlighted
      expect(fantasyCard.classList.contains('world-card--selected')).toBe(true);
    });

    test('should re-enable cards if selection fails', async () => {
      const failingCallback = vi.fn().mockRejectedValue(new Error('Selection failed'));
      
      new WorldPicker(container, failingCallback);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const fantasyCard = container.querySelector('[data-world-id="fantasy"]') as HTMLElement;
      
      try {
        fantasyCard.click();
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (e) {
        // Expected to fail
      }

      // Cards should be re-enabled
      const allCards = container.querySelectorAll('.world-card');
      allCards.forEach(card => {
        expect(card.classList.contains('world-card--disabled')).toBe(false);
        expect(card.classList.contains('world-card--selected')).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    test('should handle WorldConfigLoader failure gracefully', async () => {
      vi.mocked(WorldConfigLoader.getWorldDisplayList).mockImplementation(() => {
        throw new Error('Failed to load worlds');
      });

      new WorldPicker(container, mockCallback);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should show error message
      expect(container.querySelector('.world-picker--error')).toBeTruthy();
      expect(container.textContent).toContain('Failed to load worlds');
    });

    test('should automatically fallback to fantasy on error', async () => {
      vi.useFakeTimers();
      
      vi.mocked(WorldConfigLoader.getWorldDisplayList).mockImplementation(() => {
        throw new Error('Failed to load worlds');
      });

      new WorldPicker(container, mockCallback);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      // Fast-forward time to trigger fallback
      vi.advanceTimersByTime(2000);

      expect(mockCallback).toHaveBeenCalledWith('fantasy');
      
      vi.useRealTimers();
    });
  });
});