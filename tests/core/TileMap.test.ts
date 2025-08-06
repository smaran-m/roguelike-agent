import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TileMap } from '../../src/core/TileMap';

describe('TileMap', () => {
  let tileMap: TileMap;

  beforeEach(() => {
    // Seed Math.random for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    tileMap = new TileMap(10, 10);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct dimensions', () => {
    expect(tileMap.width).toBe(10);
    expect(tileMap.height).toBe(10);
    expect(tileMap.tiles.length).toBe(10);
    expect(tileMap.tiles[0].length).toBe(10);
  });

  it('should initialize visibility grid', () => {
    expect(tileMap.visibility.length).toBe(10);
    expect(tileMap.visibility[0].length).toBe(10);
    
    // All tiles should start unexplored and invisible
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        expect(tileMap.visibility[y][x].explored).toBe(false);
        expect(tileMap.visibility[y][x].visible).toBe(false);
      }
    }
  });

  it('should create border walls', () => {
    // Check top border
    for (let x = 0; x < 10; x++) {
      const tile = tileMap.getTile(x, 0);
      expect(tile.walkable).toBe(false);
      expect(tile.blocksLight).toBe(true);
      expect(tile.glyph).toBe('#');
    }
    
    // Check bottom border
    for (let x = 0; x < 10; x++) {
      const tile = tileMap.getTile(x, 9);
      expect(tile.walkable).toBe(false);
      expect(tile.blocksLight).toBe(true);
      expect(tile.glyph).toBe('#');
    }
    
    // Check left border
    for (let y = 0; y < 10; y++) {
      const tile = tileMap.getTile(0, y);
      expect(tile.walkable).toBe(false);
      expect(tile.blocksLight).toBe(true);
      expect(tile.glyph).toBe('#');
    }
    
    // Check right border
    for (let y = 0; y < 10; y++) {
      const tile = tileMap.getTile(9, y);
      expect(tile.walkable).toBe(false);
      expect(tile.blocksLight).toBe(true);
      expect(tile.glyph).toBe('#');
    }
  });

  it('should create floor tiles in interior', () => {
    // Check that interior tiles are floors (when no random walls are placed there)
    // With seeded random at 0.5, we can predict where walls will be placed
    
    // At least some interior tiles should be walkable floors
    let floorCount = 0;
    for (let y = 1; y < 9; y++) {
      for (let x = 1; x < 9; x++) {
        const tile = tileMap.getTile(x, y);
        if (tile.walkable && tile.glyph === '·') {
          floorCount++;
        }
      }
    }
    expect(floorCount).toBeGreaterThan(0);
  });

  it('should handle out of bounds coordinates', () => {
    // Test negative coordinates
    const tileNegative = tileMap.getTile(-1, -1);
    expect(tileNegative.walkable).toBe(false);
    expect(tileNegative.glyph).toBe(' ');
    
    // Test beyond map bounds
    const tileBeyond = tileMap.getTile(15, 15);
    expect(tileBeyond.walkable).toBe(false);
    expect(tileBeyond.glyph).toBe(' ');
    
    // Test mixed valid/invalid coordinates
    const tileMixed1 = tileMap.getTile(-1, 5);
    expect(tileMixed1.walkable).toBe(false);
    
    const tileMixed2 = tileMap.getTile(5, -1);
    expect(tileMixed2.walkable).toBe(false);
  });

  it('should find valid spawn positions', () => {
    const spawnPos = tileMap.findValidSpawnPosition();
    
    expect(spawnPos).not.toBeNull();
    expect(spawnPos!.x).toBeGreaterThanOrEqual(0);
    expect(spawnPos!.x).toBeLessThan(tileMap.width);
    expect(spawnPos!.y).toBeGreaterThanOrEqual(0);
    expect(spawnPos!.y).toBeLessThan(tileMap.height);
    
    // The spawn position should be walkable
    const tile = tileMap.getTile(spawnPos!.x, spawnPos!.y);
    expect(tile.walkable).toBe(true);
  });

  it('should prefer center for spawn position when available', () => {
    // Create a map where center is guaranteed to be walkable
    const smallMap = new TileMap(5, 5);
    
    // Manually set center to be walkable
    smallMap.tiles[2][2] = {
      glyph: '·',
      fgColor: 0x404040,
      bgColor: 0x000000,
      isEmoji: false,
      walkable: true,
      blocksLight: false
    };
    
    const spawnPos = smallMap.findValidSpawnPosition();
    
    // Should prefer the center position
    expect(spawnPos).not.toBeNull();
    expect(spawnPos!.x).toBe(2);
    expect(spawnPos!.y).toBe(2);
  });

  it('should handle maps with no valid spawn positions', () => {
    // Create a map filled with walls
    const blockedMap = new TileMap(3, 3);
    
    // Fill entire map with walls
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        blockedMap.tiles[y][x] = {
          glyph: '#',
          fgColor: 0x808080,
          bgColor: 0x000000,
          isEmoji: false,
          walkable: false,
          blocksLight: true
        };
      }
    }
    
    const spawnPos = blockedMap.findValidSpawnPosition();
    expect(spawnPos).toBeNull();
  });

  it('should manage visibility state correctly', () => {
    const x = 5, y = 5;
    
    // Initially unexplored and invisible
    expect(tileMap.visibility[y][x].explored).toBe(false);
    expect(tileMap.visibility[y][x].visible).toBe(false);
    
    // Mark as visible
    tileMap.visibility[y][x].visible = true;
    expect(tileMap.visibility[y][x].visible).toBe(true);
    
    // Mark as explored
    tileMap.visibility[y][x].explored = true;
    expect(tileMap.visibility[y][x].explored).toBe(true);
  });

  it('should maintain tile consistency', () => {
    // Check that all tiles have required properties
    for (let y = 0; y < tileMap.height; y++) {
      for (let x = 0; x < tileMap.width; x++) {
        const tile = tileMap.getTile(x, y);
        
        expect(tile.glyph).toBeDefined();
        expect(typeof tile.fgColor).toBe('number');
        expect(typeof tile.bgColor).toBe('number');
        expect(typeof tile.isEmoji).toBe('boolean');
        expect(typeof tile.walkable).toBe('boolean');
        expect(typeof tile.blocksLight).toBe('boolean');
      }
    }
  });

  it('should generate random walls deterministically', () => {
    // With seeded random, the map should be deterministic
    const map1 = new TileMap(5, 5);
    
    // Reset seed and create another map
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const map2 = new TileMap(5, 5);
    
    // Maps should be identical
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const tile1 = map1.getTile(x, y);
        const tile2 = map2.getTile(x, y);
        
        expect(tile1.walkable).toBe(tile2.walkable);
        expect(tile1.glyph).toBe(tile2.glyph);
      }
    }
  });

  it('should create valid map structure', () => {
    // Ensure borders are walls
    expect(tileMap.getTile(0, 0).walkable).toBe(false);
    expect(tileMap.getTile(9, 0).walkable).toBe(false);
    expect(tileMap.getTile(0, 9).walkable).toBe(false);
    expect(tileMap.getTile(9, 9).walkable).toBe(false);
    
    // Ensure there are both walkable and non-walkable tiles
    let walkableCount = 0;
    let nonWalkableCount = 0;
    
    for (let y = 0; y < tileMap.height; y++) {
      for (let x = 0; x < tileMap.width; x++) {
        if (tileMap.getTile(x, y).walkable) {
          walkableCount++;
        } else {
          nonWalkableCount++;
        }
      }
    }
    
    expect(walkableCount).toBeGreaterThan(0);
    expect(nonWalkableCount).toBeGreaterThan(0);
  });

  it('should handle edge cases in coordinate validation', () => {
    // Test boundary coordinates
    expect(tileMap.getTile(0, 0).walkable).toBe(false); // Top-left corner
    expect(tileMap.getTile(9, 9).walkable).toBe(false); // Bottom-right corner
    
    // Test just inside boundaries
    const insideTile = tileMap.getTile(1, 1);
    expect(insideTile).toBeDefined();
    
    // Test just outside boundaries
    const outsideTile = tileMap.getTile(10, 10);
    expect(outsideTile.walkable).toBe(false);
    expect(outsideTile.glyph).toBe(' ');
  });

  it('should maintain proper tile colors', () => {
    // Check that tiles have appropriate colors
    for (let y = 0; y < tileMap.height; y++) {
      for (let x = 0; x < tileMap.width; x++) {
        const tile = tileMap.getTile(x, y);
        
        if (tile.glyph === '#') {
          // Wall tiles
          expect(tile.fgColor).toBe(0x808080);
        } else if (tile.glyph === '·') {
          // Floor tiles
          expect(tile.fgColor).toBe(0x404040);
        }
        
        // All tiles should have black background
        expect(tile.bgColor).toBe(0x000000);
      }
    }
  });
});