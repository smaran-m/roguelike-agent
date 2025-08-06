import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PathfindingSystem } from '../../../src/systems/pathfinding/PathfindingSystem.js';
import { TileMap } from '../../../src/core/TileMap.js';
import { Position, PATHFINDING_CONFIG } from '../../../src/systems/pathfinding/PathfindingTypes.js';

describe('PathfindingSystem', () => {
  let pathfindingSystem: PathfindingSystem;
  let tileMap: TileMap;

  beforeEach(() => {
    // Reset singleton
    (PathfindingSystem as any).instance = undefined;
    pathfindingSystem = PathfindingSystem.getInstance();
    tileMap = new TileMap(10, 10);
    
    // Create a simple test map with walls
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const isWall = (x === 5 && y >= 2 && y <= 7) || // Vertical wall
                      (y === 5 && x >= 2 && x <= 7);    // Horizontal wall intersection
        
        tileMap.setTile(x, y, {
          glyph: isWall ? '█' : '.',
          color: isWall ? 0x666666 : 0x444444,
          walkable: !isWall,
          blocksLight: isWall,
          explored: false,
          visible: false,
          isEmoji: false
        });
      }
    }
  });

  describe('Basic Pathfinding', () => {
    test('should find simple straight path', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 3, y: 0 };

      const result = pathfindingSystem.findPath(start, goal, tileMap);

      expect(result.found).toBe(true);
      expect(result.path.length).toBeGreaterThanOrEqual(4);
      expect(result.path[0]).toEqual(start);
      expect(result.path[result.path.length - 1]).toEqual(goal);
      expect(result.nodesExpanded).toBeGreaterThan(0);
      expect(result.computeTime).toBeGreaterThan(0);
    });

    test('should find path around obstacles', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 9, y: 9 };

      const result = pathfindingSystem.findPath(start, goal, tileMap);

      expect(result.found).toBe(true);
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.path[0]).toEqual(start);
      expect(result.path[result.path.length - 1]).toEqual(goal);

      // Verify path doesn't go through walls
      for (const pos of result.path) {
        const tile = tileMap.getTile(pos.x, pos.y);
        expect(tile?.walkable).toBe(true);
      }
    });

    test('should return empty path when no path exists', () => {
      // Create enclosed area
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          if (x === 0 || x === 9 || y === 0 || y === 9) {
            tileMap.setTile(x, y, {
              glyph: '█',
              color: 0x666666,
              walkable: false,
              blocksLight: true,
              explored: false,
              visible: false,
              isEmoji: false
            });
          }
        }
      }

      const start: Position = { x: 1, y: 1 };
      const goal: Position = { x: 15, y: 15 }; // Outside the map

      const result = pathfindingSystem.findPath(start, goal, tileMap);

      expect(result.found).toBe(false);
      expect(result.path).toHaveLength(0);
    });

    test('should handle start and goal at same position', () => {
      const position: Position = { x: 1, y: 1 };

      const result = pathfindingSystem.findPath(position, position, tileMap);

      expect(result.found).toBe(true);
      expect(result.path).toHaveLength(1);
      expect(result.path[0]).toEqual(position);
    });
  });

  describe('Pathfinding Options', () => {
    test('should respect diagonal movement setting', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 2 };

      // With diagonal movement
      const withDiagonal = pathfindingSystem.findPath(start, goal, tileMap, {
        allowDiagonal: true
      });

      // Without diagonal movement
      const withoutDiagonal = pathfindingSystem.findPath(start, goal, tileMap, {
        allowDiagonal: false
      });

      expect(withDiagonal.found).toBe(true);
      expect(withoutDiagonal.found).toBe(true);
      expect(withDiagonal.path.length).toBeLessThanOrEqual(withoutDiagonal.path.length);
    });

    test('should respect max iterations limit', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 9, y: 9 };

      const result = pathfindingSystem.findPath(start, goal, tileMap, {
        maxIterations: 5 // Very low limit
      });

      // Should fail due to iteration limit
      expect(result.found).toBe(false);
      expect(result.nodesExpanded).toBeLessThanOrEqual(5);
    });
  });

  describe('Caching', () => {
    test('should cache and reuse successful paths', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 3, y: 3 };

      // First call - should compute path
      const result1 = pathfindingSystem.findPath(start, goal, tileMap);
      expect(result1.found).toBe(true);
      expect(result1.nodesExpanded).toBeGreaterThan(0);

      // Second call - should use cache
      const result2 = pathfindingSystem.findPath(start, goal, tileMap);
      expect(result2.found).toBe(true);
      expect(result2.nodesExpanded).toBe(0); // Cache hit
      expect(result2.path).toEqual(result1.path);

      // Verify cache hit in metrics
      const metrics = pathfindingSystem.getMetrics();
      expect(metrics.cacheHits).toBeGreaterThan(0);
    });

    test('should allow disabling cache for specific requests', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 2 };

      // First call with caching disabled
      const result1 = pathfindingSystem.findPath(start, goal, tileMap, {
        cacheResults: false
      });
      expect(result1.found).toBe(true);
      expect(result1.nodesExpanded).toBeGreaterThan(0);

      // Second call - should not use cache
      const result2 = pathfindingSystem.findPath(start, goal, tileMap);
      expect(result2.found).toBe(true);
      expect(result2.nodesExpanded).toBeGreaterThan(0); // Not a cache hit
    });
  });

  describe('Utility Methods', () => {
    test('should find next step correctly', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 3, y: 0 };

      const nextStep = pathfindingSystem.findNextStep(start, goal, tileMap);

      expect(nextStep).toBeTruthy();
      expect(Math.abs(nextStep!.x - start.x) + Math.abs(nextStep!.y - start.y)).toBeGreaterThan(0); // Should move from start
      expect(Math.abs(nextStep!.x - start.x) + Math.abs(nextStep!.y - start.y)).toBe(1); // Adjacent position
    });

    test('should return null for next step when no path exists', () => {
      // Block all movement from start
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          if ((x === 1 && y === 0) || (x === 0 && y === 1)) {
            tileMap.setTile(x, y, {
              glyph: '█',
              color: 0x666666,
              walkable: false,
              blocksLight: true,
              explored: false,
              visible: false,
              isEmoji: false
            });
          }
        }
      }

      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 9, y: 9 };

      const nextStep = pathfindingSystem.findNextStep(start, goal, tileMap);
      expect(nextStep).toBeNull();
    });

    test('should calculate Manhattan distance correctly', () => {
      const pos1: Position = { x: 0, y: 0 };
      const pos2: Position = { x: 3, y: 4 };

      const distance = pathfindingSystem.manhattanDistance(pos1, pos2);
      expect(distance).toBe(7); // |3-0| + |4-0| = 7
    });

    test('should calculate Euclidean distance correctly', () => {
      const pos1: Position = { x: 0, y: 0 };
      const pos2: Position = { x: 3, y: 4 };

      const distance = pathfindingSystem.euclideanDistance(pos1, pos2);
      expect(distance).toBeCloseTo(5); // sqrt(3² + 4²) = 5
    });

    test('should check line of sight correctly', () => {
      const start: Position = { x: 0, y: 0 };
      const clearGoal: Position = { x: 2, y: 2 };
      const blockedGoal: Position = { x: 8, y: 8 }; // Should be blocked by wall

      expect(pathfindingSystem.hasLineOfSight(start, clearGoal, tileMap)).toBe(true);
      expect(pathfindingSystem.hasLineOfSight(start, blockedGoal, tileMap)).toBe(false);
    });
  });

  describe('Performance and Metrics', () => {
    test('should track pathfinding metrics', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 3, y: 3 };

      pathfindingSystem.resetMetrics();

      const result = pathfindingSystem.findPath(start, goal, tileMap);
      expect(result.found).toBe(true);

      const metrics = pathfindingSystem.getMetrics();
      expect(metrics.totalPathsComputed).toBe(1);
      expect(metrics.averageComputeTime).toBeGreaterThan(0);
      expect(metrics.averagePathLength).toBeGreaterThan(0);
      expect(metrics.totalNodesExpanded).toBeGreaterThan(0);
    });

    test('should complete pathfinding within performance target', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 8, y: 8 };

      const result = pathfindingSystem.findPath(start, goal, tileMap);

      expect(result.found).toBe(true);
      expect(result.computeTime).toBeLessThan(PATHFINDING_CONFIG.PERFORMANCE_TARGET_MS * 4); // Allow 4x target for test
    });

    test('should handle stress test with multiple pathfinding requests', () => {
      const startTime = performance.now();
      const requestCount = 50;
      let successfulPaths = 0;

      for (let i = 0; i < requestCount; i++) {
        const start: Position = { 
          x: Math.floor(Math.random() * 5), 
          y: Math.floor(Math.random() * 5) 
        };
        const goal: Position = { 
          x: 8 + Math.floor(Math.random() * 2), 
          y: 8 + Math.floor(Math.random() * 2) 
        };

        const result = pathfindingSystem.findPath(start, goal, tileMap);
        if (result.found) {
          successfulPaths++;
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(successfulPaths).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(1000); // Should complete 50 requests in under 1 second
    });
  });

  describe('Cache Management', () => {
    test('should clear cache when requested', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 2 };

      // Create cached path
      pathfindingSystem.findPath(start, goal, tileMap);
      
      let metrics = pathfindingSystem.getMetrics();
      expect(metrics.cacheSize).toBeGreaterThan(0);

      pathfindingSystem.clearCache();

      metrics = pathfindingSystem.getMetrics();
      expect(metrics.cacheSize).toBe(0);
    });

    test('should invalidate cache around position', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 3, y: 0 };

      // Create cached path
      const result1 = pathfindingSystem.findPath(start, goal, tileMap);
      expect(result1.found).toBe(true);

      // Invalidate cache around middle of path
      pathfindingSystem.invalidateCache({ x: 1, y: 0 });

      // Clear the metrics and request again to ensure fresh computation
      pathfindingSystem.resetMetrics();
      const result2 = pathfindingSystem.findPath(start, goal, tileMap);
      expect(result2.found).toBe(true);
      expect(result2.nodesExpanded).toBeGreaterThan(0); // Should have recomputed
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid start position gracefully', () => {
      const invalidStart: Position = { x: -1, y: -1 };
      const goal: Position = { x: 2, y: 2 };

      const result = pathfindingSystem.findPath(invalidStart, goal, tileMap);

      expect(result.found).toBe(false);
      expect(result.path).toHaveLength(0);
    });

    test('should handle invalid goal position gracefully', () => {
      const start: Position = { x: 0, y: 0 };
      const invalidGoal: Position = { x: 100, y: 100 };

      const result = pathfindingSystem.findPath(start, invalidGoal, tileMap);

      expect(result.found).toBe(false);
      expect(result.path).toHaveLength(0);
    });
  });
});