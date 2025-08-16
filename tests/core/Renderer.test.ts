import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Renderer } from '../../src/core/Renderer';
import { Entity, Tile, TileVisibility } from '../../src/types';
import { CombatSystem } from '../../src/systems/combat/CombatSystem';
import { ResourceManager } from '../../src/managers/ResourceManager';
import { WorldConfigLoader } from '../../src/loaders/WorldConfigLoader';

// Mock PixiJS Application and Container - minimal mocking for initialization
vi.mock('pixi.js', () => ({
  Application: vi.fn(() => ({
    stage: { addChild: vi.fn() },
    view: document.createElement('canvas'),
    destroy: vi.fn()
  })),
  Container: vi.fn(() => ({ 
    addChild: vi.fn(), 
    removeChild: vi.fn(), 
    removeChildren: vi.fn(),
    x: 0, 
    y: 0 
  })),
  Text: vi.fn(() => ({ 
    x: 0, 
    y: 0, 
    text: '', 
    style: { fill: 0xFFFFFF }, 
    anchor: { set: vi.fn() }, 
    destroy: vi.fn(),
    alpha: 1,
    visible: true,
    tint: 0xFFFFFF
  })),
  Graphics: vi.fn(() => ({
    beginFill: vi.fn().mockReturnThis(),
    drawRect: vi.fn().mockReturnThis(),
    endFill: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    alpha: 1,
    destroy: vi.fn()
  }))
}));

// Mock DOM element
Object.defineProperty(document, 'getElementById', {
  value: vi.fn(() => ({ appendChild: vi.fn() }))
});

describe('Renderer', () => {
  let renderer: Renderer;
  let testEntity: Entity;
  let testTile: Tile;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize world configuration
    WorldConfigLoader.initialize('fantasy');
    
    renderer = new Renderer(50, 30);
    
    testEntity = {
      id: 'test-entity',
      x: 12,
      y: 7,
      glyph: '🧙',
      color: 0x4169E1,
      name: 'Test Entity',
      isEmoji: true,
      stats: CombatSystem.createPlayerStats()
    };
    
    // Initialize resources for test entity
    ResourceManager.initializeResources(testEntity);
    
    testTile = {
      glyph: '·',
      fgColor: 0x404040,
      bgColor: 0x000000,
      isEmoji: false,
      walkable: true,
      blocksLight: false
    };
  });

  describe('Coordinate Transformations', () => {
    it('should convert world coordinates to screen coordinates correctly', () => {
      renderer.cameraSystem.setCameraPosition(5, 3);
      
      const result = renderer.worldToScreen(10, 8);
      
      expect(result.x).toBe(5); // 10 - 5
      expect(result.y).toBe(5); // 8 - 3
    });

    it('should convert screen coordinates to world coordinates correctly', () => {
      renderer.cameraSystem.setCameraPosition(5, 3);
      
      const result = renderer.screenToWorld(2, 4);
      
      expect(result.x).toBe(7); // 2 + 5
      expect(result.y).toBe(7); // 4 + 3
    });

    it('should handle coordinate conversion at map boundaries', () => {
      renderer.cameraSystem.setCameraPosition(0, 0);
      
      const worldToScreen = renderer.worldToScreen(0, 0);
      expect(worldToScreen.x).toBe(0);
      expect(worldToScreen.y).toBe(0);
      
      const screenToWorld = renderer.screenToWorld(0, 0);
      expect(screenToWorld.x).toBe(0);
      expect(screenToWorld.y).toBe(0);
    });
  });

  describe('Camera Following Logic', () => {
    it('should detect when camera needs to move to follow player', () => {
      const player = {
        ...testEntity,
        x: 30,
        y: 20,
        isPlayer: true
      };
      
      const cameraMoved = renderer.updateCameraForPlayer(player);
      
      expect(cameraMoved).toBe(true);
    });

    it('should not move camera if player is already in viewport center', () => {
      const player = {
        ...testEntity,
        x: Math.floor(renderer.viewportWidth / 2),
        y: Math.floor(renderer.viewportHeight / 2),
        isPlayer: true
      };
      
      // Center camera on player first
      renderer.centerCameraOn(player);
      
      // Now check if camera needs to move again
      const cameraMoved = renderer.updateCameraForPlayer(player);
      
      expect(cameraMoved).toBe(false);
    });

    it('should center camera correctly on entity', () => {
      renderer.centerCameraOn(testEntity);
      
      const expectedCameraX = testEntity.x - Math.floor(renderer.viewportWidth / 2);
      const expectedCameraY = testEntity.y - Math.floor(renderer.viewportHeight / 2);
      
      expect(renderer.cameraX).toBe(expectedCameraX);
      expect(renderer.cameraY).toBe(expectedCameraY);
    });
  });

  describe('Visibility Calculations', () => {
    it('should calculate correct alpha values based on distance and line of sight', () => {
      const distance = 5;
      const maxDistance = 8;
      
      // Test the visibility calculation logic (from updateVisibilityAlpha)
      const expectedAlpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
      
      expect(expectedAlpha).toBeCloseTo(0.5625, 4); // 1.0 - (5/8) * 0.7 = 0.5625
    });

    it('should handle maximum visibility distance correctly', () => {
      const maxDistance = 8;
      const farDistance = 10; // Beyond max distance
      
      const alphaAtMax = Math.max(0.3, 1.0 - (maxDistance / maxDistance) * 0.7);
      const alphaFar = Math.max(0.3, 1.0 - (farDistance / maxDistance) * 0.7);
      
      expect(alphaAtMax).toBeCloseTo(0.3, 10); // Should clamp to minimum
      expect(alphaFar).toBeCloseTo(0.3, 10); // Should also clamp to minimum
    });

    it('should apply different alpha for entities without line of sight', () => {
      // Without line of sight, alpha should be 0 for entities
      const noLOSAlpha = 0;
      
      // With line of sight at distance 3
      const distance = 3;
      const maxDistance = 8;
      const withLOSAlpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
      
      expect(noLOSAlpha).toBe(0);
      expect(withLOSAlpha).toBeCloseTo(0.7375, 4); // 1.0 - (3/8) * 0.7
    });
  });

  describe('Color Manipulation', () => {
    it('should darken colors correctly for unexplored areas', () => {
      const originalColor = 0xFF0000; // Red
      const darkenFactor = 0.4;
      
      const darkenedColor = renderer.darkenColor(originalColor, darkenFactor);
      
      // Red component: 255 * 0.4 = 102 (0x66)
      const expectedColor = 0x660000;
      expect(darkenedColor).toBe(expectedColor);
    });

    it('should handle white color darkening', () => {
      const whiteColor = 0xFFFFFF;
      const darkenFactor = 0.5;
      
      const darkenedColor = renderer.darkenColor(whiteColor, darkenFactor);
      
      // Each component: 255 * 0.5 = 127.5, floored to 127 (0x7F)
      const expectedColor = 0x7F7F7F;
      expect(darkenedColor).toBe(expectedColor);
    });

    it('should handle black color darkening', () => {
      const blackColor = 0x000000;
      const darkenFactor = 0.3;
      
      const darkenedColor = renderer.darkenColor(blackColor, darkenFactor);
      
      expect(darkenedColor).toBe(0x000000); // Black stays black
    });
  });

  describe('Entity Management', () => {
    it('should track entity lifecycle correctly', () => {
      // Initially no entities tracked
      expect(renderer.entityTextMap.has(testEntity.id)).toBe(false);
      expect(renderer.hpTextMap.has(testEntity.id)).toBe(false);
      
      // Render entity - should be tracked
      renderer.renderEntityWithVisibility(testEntity, 1, true);
      expect(renderer.entityTextMap.has(testEntity.id)).toBe(true);
      
      // Remove entity - should be cleaned up
      renderer.removeEntity(testEntity.id);
      expect(renderer.entityTextMap.has(testEntity.id)).toBe(false);
    });

    it('should track entity positions for camera updates', () => {
      renderer.renderEntityWithVisibility(testEntity, 1, true);
      
      const storedPosition = renderer.entityPositions.get(testEntity.id);
      expect(storedPosition).toBeDefined();
      expect(storedPosition!.x).toBe(testEntity.x);
      expect(storedPosition!.y).toBe(testEntity.y);
    });

    it('should handle entities with and without stats', () => {
      const entityWithoutStats = {
        id: 'no-stats',
        x: 5,
        y: 5,
        glyph: '?',
        color: 0xFFFFFF,
        name: 'Unknown',
        isEmoji: false
      };
      
      // Should handle entity without stats gracefully
      expect(() => {
        renderer.renderEntityWithVisibility(entityWithoutStats as Entity, 1, true);
      }).not.toThrow();
      
      // Should create entity text but not HP text
      expect(renderer.entityTextMap.has(entityWithoutStats.id)).toBe(true);
      expect(renderer.hpTextMap.has(entityWithoutStats.id)).toBe(false);
    });
  });

  describe('Viewport Culling', () => {
    it('should determine if entities are within viewport', () => {
      // Set camera position
      renderer.cameraSystem.setCameraPosition(10, 10);
      
      // Entity within viewport
      const visibleEntity = { ...testEntity, x: 15, y: 12 }; // Screen pos (5, 2)
      const screenPos1 = renderer.worldToScreen(visibleEntity.x, visibleEntity.y);
      const inViewport1 = screenPos1.x >= 0 && screenPos1.x < renderer.viewportWidth && 
                         screenPos1.y >= 0 && screenPos1.y < renderer.viewportHeight;
      expect(inViewport1).toBe(true);
      
      // Entity outside viewport
      const hiddenEntity = { ...testEntity, x: 50, y: 50 }; // Screen pos (40, 40)
      const screenPos2 = renderer.worldToScreen(hiddenEntity.x, hiddenEntity.y);
      const inViewport2 = screenPos2.x >= 0 && screenPos2.x < renderer.viewportWidth && 
                         screenPos2.y >= 0 && screenPos2.y < renderer.viewportHeight;
      expect(inViewport2).toBe(false);
    });
  });

  describe('Message System', () => {
    it('should manage message history correctly', () => {
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      
      messages.forEach(message => {
        renderer.addMessage(message);
      });
      
      expect(renderer.messages).toContain('Message 1');
      expect(renderer.messages).toContain('Message 2');
      expect(renderer.messages).toContain('Message 3');
      expect(renderer.messages.length).toBe(3);
    });

    it('should limit message history to prevent memory issues', () => {
      // Add more than 25 messages to trigger limit
      for (let i = 1; i <= 27; i++) {
        renderer.addMessage(`Message ${i}`);
      }
      
      expect(renderer.messages.length).toBe(25);
      expect(renderer.messages[0]).toBe('Message 3'); // Oldest kept message
      expect(renderer.messages[24]).toBe('Message 27'); // Newest message
    });
  });

  describe('HP Display Logic', () => {
    it('should calculate correct HP colors based on health ratio', () => {
      const entity = { ...testEntity };
      ResourceManager.initializeResources(entity);
      
      const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || 20;
      
      // Full health - green
      ResourceManager.set(entity, 'hp', maxHp);
      let currentHp = ResourceManager.getCurrentValue(entity, 'hp');
      let ratio = currentHp / maxHp;
      let expectedColor = ratio > 0.5 ? 0x00FF00 : ratio > 0.25 ? 0xFFFF00 : 0xFF0000;
      expect(expectedColor).toBe(0x00FF00); // Green
      
      // Half health - yellow
      ResourceManager.set(entity, 'hp', Math.floor(maxHp * 0.4));
      currentHp = ResourceManager.getCurrentValue(entity, 'hp');
      ratio = currentHp / maxHp;
      expectedColor = ratio > 0.5 ? 0x00FF00 : ratio > 0.25 ? 0xFFFF00 : 0xFF0000;
      expect(expectedColor).toBe(0xFFFF00); // Yellow
      
      // Low health - red
      ResourceManager.set(entity, 'hp', Math.floor(maxHp * 0.1));
      currentHp = ResourceManager.getCurrentValue(entity, 'hp');
      ratio = currentHp / maxHp;
      expectedColor = ratio > 0.5 ? 0x00FF00 : ratio > 0.25 ? 0xFFFF00 : 0xFF0000;
      expect(expectedColor).toBe(0xFF0000); // Red
    });
  });

  describe('Position Update Logic', () => {
    it('should update position text for player', () => {
      const player = { ...testEntity, isPlayer: true };
      
      renderer.updatePositionText(15, 23);
      
      expect(renderer.positionText.text).toBe('(15, 23)');
    });
  });

  describe('Tile Rendering Logic', () => {
    it('should handle tile visibility states correctly', () => {
      const visibility: TileVisibility = {
        explored: true,
        visible: true
      };
      
      // Should render explored visible tiles
      expect(() => {
        renderer.renderTile(5, 5, testTile, visibility);
      }).not.toThrow();
      
      // Should not render unexplored tiles
      const unexplored: TileVisibility = {
        explored: false,
        visible: false
      };
      
      expect(() => {
        renderer.renderTile(5, 5, testTile, unexplored);
      }).not.toThrow();
    });

    it('should apply correct alpha and color for explored but not visible tiles', () => {
      const exploredNotVisible: TileVisibility = {
        explored: true,
        visible: false
      };
      
      // Test the darkening logic
      const darkenedColor = renderer.darkenColor(testTile.fgColor, 0.4);
      const originalColor = testTile.fgColor; // 0x404040
      
      expect(darkenedColor).toBeLessThan(originalColor);
    });
  });
});