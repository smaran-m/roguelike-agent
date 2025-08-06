import { Position, CachedPath, PATHFINDING_CONFIG } from './PathfindingTypes.js';
import { EventBus } from '../../core/events/EventBus.js';
import { EventUnsubscriber, TileChangedEvent, EntityMovedEvent, EnemyDiedEvent } from '../../core/events/GameEvent.js';
import { Logger } from '../../utils/Logger.js';

export class PathCache {
  private cache: Map<string, CachedPath> = new Map();
  private accessOrder: string[] = []; // LRU tracking
  private eventUnsubscribers: EventUnsubscriber[] = [];

  constructor(private logger: Logger, private eventBus?: EventBus) {
    if (eventBus) {
      this.setupEventSubscriptions();
    }
  }

  get(start: Position, goal: Position): Position[] | null {
    const key = this.createKey(start, goal);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache entry is too old
    const age = Date.now() - cached.timestamp;
    if (age > PATHFINDING_CONFIG.MAX_CACHE_AGE_MS) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access order (move to end = most recently used)
    this.updateAccessOrder(key);
    
    this.logger.debug('Path cache hit', {
      key,
      pathLength: cached.path.length,
      age
    });

    return [...cached.path]; // Return copy to prevent modification
  }

  set(start: Position, goal: Position, path: Position[]): void {
    const key = this.createKey(start, goal);
    
    const cachedPath: CachedPath = {
      path: [...path], // Store copy to prevent external modification
      timestamp: Date.now(),
      startPos: { ...start },
      goalPos: { ...goal },
      hash: key
    };

    // Remove old entry if it exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Add new entry
    this.cache.set(key, cachedPath);
    this.accessOrder.push(key);

    // Enforce size limit (LRU eviction)
    while (this.cache.size > PATHFINDING_CONFIG.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.logger.debug('Path cached', {
      key,
      pathLength: path.length,
      cacheSize: this.cache.size
    });
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.length = 0;
    this.logger.debug('Path cache cleared');
  }

  getMetrics() {
    const now = Date.now();
    let expiredEntries = 0;
    
    for (const cached of this.cache.values()) {
      if (now - cached.timestamp > PATHFINDING_CONFIG.MAX_CACHE_AGE_MS) {
        expiredEntries++;
      }
    }

    return {
      size: this.cache.size,
      expiredEntries,
      maxSize: PATHFINDING_CONFIG.MAX_CACHE_SIZE,
      maxAge: PATHFINDING_CONFIG.MAX_CACHE_AGE_MS
    };
  }

  // Invalidate paths that pass through a specific position
  invalidatePathsThrough(position: Position): number {
    const keysToRemove: string[] = [];
    
    for (const [key, cached] of this.cache.entries()) {
      // Check if path passes through the invalidated position
      if (this.pathContainsPosition(cached.path, position)) {
        keysToRemove.push(key);
      }
    }

    // Remove invalidated paths
    for (const key of keysToRemove) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    if (keysToRemove.length > 0) {
      this.logger.debug('Invalidated paths through position', {
        position,
        invalidatedCount: keysToRemove.length
      });
    }

    return keysToRemove.length;
  }

  // Invalidate paths that start from or go to a specific position
  invalidatePathsInvolving(position: Position): number {
    const keysToRemove: string[] = [];
    
    for (const [key, cached] of this.cache.entries()) {
      if (this.positionsEqual(cached.startPos, position) || 
          this.positionsEqual(cached.goalPos, position)) {
        keysToRemove.push(key);
      }
    }

    // Remove invalidated paths
    for (const key of keysToRemove) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    if (keysToRemove.length > 0) {
      this.logger.debug('Invalidated paths involving position', {
        position,
        invalidatedCount: keysToRemove.length
      });
    }

    return keysToRemove.length;
  }

  destroy(): void {
    // Unsubscribe from events
    for (const unsubscriber of this.eventUnsubscribers) {
      unsubscriber();
    }
    this.eventUnsubscribers.length = 0;
    
    this.clear();
  }

  private setupEventSubscriptions(): void {
    if (!this.eventBus) return;

    // Invalidate paths when tiles change
    const tileChangedUnsub = this.eventBus.subscribe('TileChanged', (event) => {
      const tileEvent = event as TileChangedEvent;
      this.invalidatePathsThrough(tileEvent.position);
    });
    this.eventUnsubscribers.push(tileChangedUnsub);

    // Invalidate paths when entities move (they might block paths)
    const entityMovedUnsub = this.eventBus.subscribe('EntityMoved', (event) => {
      const moveEvent = event as EntityMovedEvent;
      // Invalidate paths that go through either the old or new position
      this.invalidatePathsThrough(moveEvent.oldPosition);
      this.invalidatePathsThrough(moveEvent.newPosition);
    });
    this.eventUnsubscribers.push(entityMovedUnsub);

    // Invalidate paths involving dead entities
    const enemyDiedUnsub = this.eventBus.subscribe('EnemyDied', (event) => {
      const deathEvent = event as EnemyDiedEvent;
      this.invalidatePathsInvolving(deathEvent.position);
    });
    this.eventUnsubscribers.push(enemyDiedUnsub);

    this.logger.debug('PathCache event subscriptions set up');
  }

  private createKey(start: Position, goal: Position): string {
    return `${start.x},${start.y}->${goal.x},${goal.y}`;
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position and add to end
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictLeastRecentlyUsed(): void {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder.shift()!;
    this.cache.delete(lruKey);
    
    this.logger.debug('Evicted LRU cache entry', { key: lruKey });
  }

  private pathContainsPosition(path: Position[], position: Position): boolean {
    return path.some(pos => this.positionsEqual(pos, position));
  }

  private positionsEqual(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }
}