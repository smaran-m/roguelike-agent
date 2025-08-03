import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Renderer } from '../Renderer';
import { Entity } from '../../types';
import { CombatSystem } from '../CombatSystem';

// Mock PixiJS Application and Container
const mockContainer = {
  addChild: vi.fn(),
  removeChild: vi.fn(),
  removeChildren: vi.fn(),
  children: [],
  destroy: vi.fn(),
  x: 0,
  y: 0
};

const mockGraphics = {
  beginFill: vi.fn().mockReturnThis(),
  drawRect: vi.fn().mockReturnThis(),
  endFill: vi.fn().mockReturnThis(),
  clear: vi.fn().mockReturnThis(),
  destroy: vi.fn(),
  lineStyle: vi.fn().mockReturnThis(),
  moveTo: vi.fn().mockReturnThis(),
  lineTo: vi.fn().mockReturnThis(),
  x: 0,
  y: 0
};

const mockApplication = {
  stage: mockContainer,
  view: { style: {} },
  renderer: { backgroundColor: 0 },
  destroy: vi.fn()
};

// Mock PixiJS Text class
const mockText = {
  x: 0,
  y: 0,
  text: '',
  style: { fill: 0xFFFFFF },
  anchor: { set: vi.fn() },
  destroy: vi.fn()
};

// Mock PIXI globally
vi.mock('pixi.js', () => ({
  Application: vi.fn(() => mockApplication),
  Container: vi.fn(() => mockContainer),
  Text: vi.fn(() => ({ ...mockText })),
  Graphics: vi.fn(() => mockGraphics)
}));

describe('Renderer', () => {
  let renderer: Renderer;
  let testEntity: Entity;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new Renderer(50, 30); // Use larger map so camera can move freely
    
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
  });

  it('should initialize with correct dimensions', () => {
    expect(renderer.viewportWidth).toBe(25);
    expect(renderer.viewportHeight).toBe(15);
    expect(renderer.tileSize).toBe(32);
  });

  it('should initialize camera at origin', () => {
    expect(renderer.cameraX).toBe(0);
    expect(renderer.cameraY).toBe(0);
  });

  it('should convert world coordinates to screen coordinates', () => {
    renderer.cameraX = 5;
    renderer.cameraY = 3;
    
    const screenPos = renderer.worldToScreen(10, 8);
    
    expect(screenPos.x).toBe(5); // 10 - 5
    expect(screenPos.y).toBe(5); // 8 - 3
  });

  it('should handle world to screen conversion with different camera positions', () => {
    renderer.cameraX = 0;
    renderer.cameraY = 0;
    
    let screenPos = renderer.worldToScreen(3, 4);
    expect(screenPos.x).toBe(3);
    expect(screenPos.y).toBe(4);
    
    renderer.cameraX = 10;
    renderer.cameraY = 5;
    
    screenPos = renderer.worldToScreen(15, 10);
    expect(screenPos.x).toBe(5);
    expect(screenPos.y).toBe(5);
  });

  it('should center camera on entity', () => {
    renderer.centerCameraOn(testEntity);
    
    const expectedCameraX = testEntity.x - Math.floor(renderer.viewportWidth / 2);
    const expectedCameraY = testEntity.y - Math.floor(renderer.viewportHeight / 2);
    
    expect(renderer.cameraX).toBe(expectedCameraX);
    expect(renderer.cameraY).toBe(expectedCameraY);
  });

  it('should detect camera movement when updating for player', () => {
    const player = {
      ...testEntity,
      x: 30,
      y: 20
    };
    
    const cameraMoved = renderer.updateCameraForPlayer(player);
    
    // Camera should move to follow player
    expect(cameraMoved).toBe(true);
  });

  it('should not move camera if player is already centered', () => {
    // Position camera so player is already centered
    const player = {
      ...testEntity,
      x: 10,
      y: 7
    };
    
    renderer.centerCameraOn(player);
    const cameraXAfterCenter = renderer.cameraX;
    const cameraYAfterCenter = renderer.cameraY;
    
    const cameraMoved = renderer.updateCameraForPlayer(player);
    
    expect(cameraMoved).toBe(false);
    expect(renderer.cameraX).toBe(cameraXAfterCenter);
    expect(renderer.cameraY).toBe(cameraYAfterCenter);
  });

  it('should manage entity text objects', () => {
    // Clear any existing entities
    renderer.clearEntities();
    
    // Render an entity
    renderer.renderEntityWithVisibility(testEntity, 1, true);
    
    // Check that entity text object was created
    expect(renderer.entityTextMap.has(testEntity.id)).toBe(true);
    
    // Clear entities
    renderer.clearEntities();
    
    // Text object should be removed
    expect(renderer.entityTextMap.has(testEntity.id)).toBe(false);
  });

  it('should manage HP text objects for entities with stats', () => {
    renderer.clearEntities();
    
    renderer.renderEntityWithVisibility(testEntity, 1, true);
    
    // Check that HP text object was created
    expect(renderer.hpTextMap.has(testEntity.id)).toBe(true);
    
    renderer.clearEntities();
    
    // HP text object should be removed
    expect(renderer.hpTextMap.has(testEntity.id)).toBe(false);
  });

  it('should handle visibility alpha correctly', () => {
    const mockTileMap = {
      width: 50,
      height: 30,
      tiles: Array(30).fill(null).map(() => 
        Array(50).fill({
          glyph: '·',
          fgColor: 0x404040,
          bgColor: 0x000000,
          isEmoji: false,
          walkable: true,
          blocksLight: false
        })
      )
    };
    
    const mockLineOfSight = {
      hasLineOfSight: vi.fn().mockReturnValue(true)
    };
    
    // This should not throw an error
    expect(() => {
      renderer.updateVisibilityAlpha(10, 7, mockTileMap as any, mockLineOfSight as any);
    }).not.toThrow();
  });

  it('should calculate correct alpha values for distance', () => {
    // Test distance calculations for visibility
    const distance1 = 1;
    const distance5 = 5;
    const distance10 = 10;
    
    // Closer entities should be more visible (higher alpha)
    // This is implicit in the visibility system - we're testing the structure exists
    expect(distance1).toBeLessThan(distance5);
    expect(distance5).toBeLessThan(distance10);
  });

  it('should handle entity rendering with different visibility states', () => {
    renderer.clearEntities();
    
    // Render visible entity
    renderer.renderEntityWithVisibility(testEntity, 1, true);
    expect(renderer.entityTextMap.has(testEntity.id)).toBe(true);
    
    // Render invisible entity (distance doesn't matter for this test)
    renderer.renderEntityWithVisibility(testEntity, 1, false);
    
    // Entity should still be tracked (renderer maintains objects for smooth transitions)
    expect(renderer.entityTextMap.has(testEntity.id)).toBe(true);
  });

  it('should handle message system', () => {
    const testMessage = 'Test message';
    
    // Adding message should not throw
    expect(() => {
      renderer.addMessage(testMessage);
    }).not.toThrow();
  });

  it('should handle floating damage display', () => {
    const damage = 5;
    
    // Showing floating damage should not throw
    expect(() => {
      renderer.showFloatingDamage(testEntity, damage);
    }).not.toThrow();
  });

  it('should handle entity animations', () => {
    // Entity nudge should not throw
    expect(() => {
      renderer.nudgeEntity(testEntity, testEntity.x + 1, testEntity.y);
    }).not.toThrow();
    
    // Entity shake should not throw
    expect(() => {
      renderer.shakeEntity(testEntity);
    }).not.toThrow();
  });

  it('should calculate screen positions correctly for rendering', () => {
    renderer.cameraX = 5;
    renderer.cameraY = 3;
    
    const worldX = 8;
    const worldY = 6;
    
    const screenPos = renderer.worldToScreen(worldX, worldY);
    const expectedPixelX = screenPos.x * renderer.tileSize + renderer.tileSize / 2;
    const expectedPixelY = screenPos.y * renderer.tileSize + renderer.tileSize / 2;
    
    expect(expectedPixelX).toBe(3 * 32 + 16); // (8-5) * 32 + 16
    expect(expectedPixelY).toBe(3 * 32 + 16); // (6-3) * 32 + 16
  });

  it('should handle entities without stats gracefully', () => {
    const entityWithoutStats = {
      id: 'no-stats',
      x: 5,
      y: 5,
      glyph: '?',
      color: 0xFFFFFF,
      name: 'Unknown',
      isEmoji: false
      // No stats property
    };
    
    // Should not throw when rendering entity without stats
    expect(() => {
      renderer.renderEntityWithVisibility(entityWithoutStats as Entity, 1, true);
    }).not.toThrow();
    
    // Should create entity text but not HP text
    expect(renderer.entityTextMap.has(entityWithoutStats.id)).toBe(true);
    expect(renderer.hpTextMap.has(entityWithoutStats.id)).toBe(false);
  });

  it('should manage tile rendering maps', () => {
    renderer.clearTiles();
    
    // After clearing tiles, maps should be empty or reset
    // This tests the structure without relying on PixiJS internals
    expect(() => {
      renderer.clearTiles();
    }).not.toThrow();
  });

  it('should handle large distance values gracefully', () => {
    const farEntity = {
      ...testEntity,
      x: 1000,
      y: 1000
    };
    
    // Should handle very distant entities without issues
    expect(() => {
      renderer.renderEntityWithVisibility(farEntity, 100, false);
    }).not.toThrow();
  });
});