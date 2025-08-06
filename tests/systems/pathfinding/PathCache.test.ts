import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PathCache } from '../../../src/systems/pathfinding/PathCache.js';
import { Logger } from '../../../src/utils/Logger.js';
import { EventBus } from '../../../src/core/events/EventBus.js';
import { Position, PATHFINDING_CONFIG } from '../../../src/systems/pathfinding/PathfindingTypes.js';

describe('PathCache', () => {
  let pathCache: PathCache;
  let mockLogger: Logger;
  let mockEventBus: EventBus;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    mockEventBus = {
      subscribe: vi.fn().mockReturnValue(() => {}),
      publish: vi.fn(),
      processEvents: vi.fn(),
      flush: vi.fn(),
      getMetrics: vi.fn()
    } as any;

    pathCache = new PathCache(mockLogger, mockEventBus);
  });

  describe('Basic Cache Operations', () => {
    test('should return null for cache miss', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 5, y: 5 };

      const result = pathCache.get(start, goal);
      expect(result).toBeNull();
    });

    test('should store and retrieve paths correctly', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 2 };
      const path: Position[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 }
      ];

      pathCache.set(start, goal, path);
      const retrieved = pathCache.get(start, goal);

      expect(retrieved).toEqual(path);
      expect(retrieved).not.toBe(path); // Should be a copy
    });

    test('should handle path modifications without affecting cache', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 2, y: 2 };
      const originalPath: Position[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 }
      ];

      pathCache.set(start, goal, originalPath);
      
      // Modify the original path
      originalPath.push({ x: 3, y: 3 });
      
      const retrieved = pathCache.get(start, goal);
      expect(retrieved).toHaveLength(3); // Should not include the added position
      
      // Modify retrieved path
      retrieved!.push({ x: 4, y: 4 });
      
      const retrievedAgain = pathCache.get(start, goal);
      expect(retrievedAgain).toHaveLength(3); // Should still be original length
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used entries when cache is full', () => {
      // Set a small cache size for testing
      const originalMaxSize = PATHFINDING_CONFIG.MAX_CACHE_SIZE;
      (PATHFINDING_CONFIG as any).MAX_CACHE_SIZE = 3;

      const paths: { start: Position; goal: Position; path: Position[] }[] = [
        { start: { x: 0, y: 0 }, goal: { x: 1, y: 0 }, path: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
        { start: { x: 0, y: 0 }, goal: { x: 2, y: 0 }, path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] },
        { start: { x: 0, y: 0 }, goal: { x: 3, y: 0 }, path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] }
      ];

      // Fill cache to capacity
      paths.forEach(({ start, goal, path }) => {
        pathCache.set(start, goal, path);
      });

      // All should be retrievable
      paths.forEach(({ start, goal }) => {
        expect(pathCache.get(start, goal)).toBeTruthy();
      });

      // Access first path to make it most recently used
      pathCache.get(paths[0].start, paths[0].goal);

      // Add one more path (should evict the second one, which is now LRU)
      pathCache.set({ x: 0, y: 0 }, { x: 4, y: 0 }, [{ x: 0, y: 0 }, { x: 4, y: 0 }]);

      // First and third should still exist, second should be evicted
      expect(pathCache.get(paths[0].start, paths[0].goal)).toBeTruthy();
      expect(pathCache.get(paths[1].start, paths[1].goal)).toBeNull(); // Evicted
      expect(pathCache.get(paths[2].start, paths[2].goal)).toBeTruthy();
      expect(pathCache.get({ x: 0, y: 0 }, { x: 4, y: 0 })).toBeTruthy();

      // Restore original size
      (PATHFINDING_CONFIG as any).MAX_CACHE_SIZE = originalMaxSize;
    });
  });

  describe('Cache Expiration', () => {
    test('should return null for expired cache entries', () => {
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 1, y: 1 };
      const path: Position[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

      pathCache.set(start, goal, path);

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      const cacheTime = Date.now();
      Date.now = vi.fn(() => cacheTime + PATHFINDING_CONFIG.MAX_CACHE_AGE_MS + 1000);

      const result = pathCache.get(start, goal);
      expect(result).toBeNull();

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate paths that pass through a position', () => {
      const paths = [
        {
          start: { x: 0, y: 0 },
          goal: { x: 3, y: 0 },
          path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
        },
        {
          start: { x: 0, y: 1 },
          goal: { x: 3, y: 1 },
          path: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }]
        }
      ];

      paths.forEach(({ start, goal, path }) => {
        pathCache.set(start, goal, path);
      });

      // Invalidate paths through position (2, 0)
      const invalidatedCount = pathCache.invalidatePathsThrough({ x: 2, y: 0 });

      expect(invalidatedCount).toBe(1);
      expect(pathCache.get(paths[0].start, paths[0].goal)).toBeNull(); // Should be invalidated
      expect(pathCache.get(paths[1].start, paths[1].goal)).toBeTruthy(); // Should still exist
    });

    test('should invalidate paths involving specific start/goal positions', () => {
      const paths = [
        {
          start: { x: 0, y: 0 },
          goal: { x: 3, y: 0 },
          path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
        },
        {
          start: { x: 1, y: 1 },
          goal: { x: 3, y: 0 }, // Same goal
          path: [{ x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
        },
        {
          start: { x: 2, y: 2 },
          goal: { x: 4, y: 4 },
          path: [{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }]
        }
      ];

      paths.forEach(({ start, goal, path }) => {
        pathCache.set(start, goal, path);
      });

      // Invalidate paths involving position (3, 0)
      const invalidatedCount = pathCache.invalidatePathsInvolving({ x: 3, y: 0 });

      expect(invalidatedCount).toBe(2); // First two paths use (3, 0) as goal
      expect(pathCache.get(paths[0].start, paths[0].goal)).toBeNull();
      expect(pathCache.get(paths[1].start, paths[1].goal)).toBeNull();
      expect(pathCache.get(paths[2].start, paths[2].goal)).toBeTruthy(); // Should still exist
    });
  });

  describe('Event Integration', () => {
    test('should subscribe to relevant events when EventBus is provided', () => {
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('TileChanged', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('EntityMoved', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('EnemyDied', expect.any(Function));
    });

    test('should work without EventBus', () => {
      const cacheWithoutEvents = new PathCache(mockLogger);
      
      const start: Position = { x: 0, y: 0 };
      const goal: Position = { x: 1, y: 1 };
      const path: Position[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

      cacheWithoutEvents.set(start, goal, path);
      const result = cacheWithoutEvents.get(start, goal);

      expect(result).toEqual(path);
    });
  });

  describe('Metrics', () => {
    test('should provide cache metrics', () => {
      const paths = [
        { start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, path: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
        { start: { x: 2, y: 2 }, goal: { x: 3, y: 3 }, path: [{ x: 2, y: 2 }, { x: 3, y: 3 }] }
      ];

      paths.forEach(({ start, goal, path }) => {
        pathCache.set(start, goal, path);
      });

      const metrics = pathCache.getMetrics();

      expect(metrics.size).toBe(2);
      expect(metrics.maxSize).toBe(PATHFINDING_CONFIG.MAX_CACHE_SIZE);
      expect(metrics.maxAge).toBe(PATHFINDING_CONFIG.MAX_CACHE_AGE_MS);
      expect(typeof metrics.expiredEntries).toBe('number');
    });
  });

  describe('Clear Operation', () => {
    test('should clear all cached paths', () => {
      const paths = [
        { start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, path: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
        { start: { x: 2, y: 2 }, goal: { x: 3, y: 3 }, path: [{ x: 2, y: 2 }, { x: 3, y: 3 }] }
      ];

      paths.forEach(({ start, goal, path }) => {
        pathCache.set(start, goal, path);
      });

      expect(pathCache.getMetrics().size).toBe(2);

      pathCache.clear();

      expect(pathCache.getMetrics().size).toBe(0);
      paths.forEach(({ start, goal }) => {
        expect(pathCache.get(start, goal)).toBeNull();
      });
    });
  });
});