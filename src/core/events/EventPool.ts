import { GameEvent, generateEventId } from './GameEvent.js';
import { Logger } from '../../utils/Logger.js';

export class EventPool {
  private readonly pools: Map<string, Partial<GameEvent>[]> = new Map();
  private readonly maxPoolSize: number;
  private totalObjectsCreated = 0;
  private totalObjectsPooled = 0;
  private totalObjectsReused = 0;

  constructor(maxPoolSize: number = 100, private readonly logger: Logger) {
    this.maxPoolSize = maxPoolSize;
  }

  acquire<T extends GameEvent>(type: T['type']): Partial<T> {
    const pool = this.pools.get(type);
    
    if (pool && pool.length > 0) {
      const reusedEvent = pool.pop() as Partial<T>;
      this.totalObjectsReused++;
      
      // Reset the event object
      this.resetEvent(reusedEvent);
      
      this.logger.debug('Reused pooled event', { 
        type, 
        poolSize: pool.length,
        reusedCount: this.totalObjectsReused 
      });
      
      return reusedEvent;
    }

    // Create new event object if pool is empty
    const newEvent: Partial<T> = {
      type,
      id: generateEventId(),
      timestamp: Date.now()
    } as Partial<T>;
    
    this.totalObjectsCreated++;
    
    this.logger.debug('Created new event', { 
      type, 
      createdCount: this.totalObjectsCreated 
    });
    
    return newEvent;
  }

  release(event: GameEvent): void {
    const eventType = event.type;
    
    if (!this.pools.has(eventType)) {
      this.pools.set(eventType, []);
    }
    
    const pool = this.pools.get(eventType)!;
    
    // Only pool if we haven't exceeded the max pool size
    if (pool.length < this.maxPoolSize) {
      // Clear sensitive data before pooling
      const cleanedEvent = this.cleanEventForPooling(event);
      pool.push(cleanedEvent);
      this.totalObjectsPooled++;
      
      this.logger.debug('Released event to pool', { 
        type: eventType, 
        poolSize: pool.length,
        pooledCount: this.totalObjectsPooled 
      });
    } else {
      this.logger.debug('Pool full, discarding event', { 
        type: eventType, 
        maxPoolSize: this.maxPoolSize 
      });
    }
  }

  clear(): void {
    const totalPooledObjects = Array.from(this.pools.values())
      .reduce((sum, pool) => sum + pool.length, 0);
    
    this.pools.clear();
    
    this.logger.info('Cleared event pools', {
      totalPooledObjects,
      totalObjectsCreated: this.totalObjectsCreated,
      totalObjectsReused: this.totalObjectsReused,
      memoryReclaimed: totalPooledObjects
    });
  }

  getPoolMetrics(): { [eventType: string]: number } {
    const metrics: { [eventType: string]: number } = {};
    
    for (const [eventType, pool] of this.pools.entries()) {
      metrics[eventType] = pool.length;
    }
    
    return metrics;
  }

  getTotalMetrics() {
    return {
      totalObjectsCreated: this.totalObjectsCreated,
      totalObjectsPooled: this.totalObjectsPooled,
      totalObjectsReused: this.totalObjectsReused,
      memoryEfficiency: this.totalObjectsReused / (this.totalObjectsCreated || 1),
      poolCount: this.pools.size,
      totalPooledObjects: Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.length, 0)
    };
  }

  private resetEvent(event: Partial<GameEvent>): void {
    // Reset common properties that might be reused
    (event as any).id = generateEventId();
    (event as any).timestamp = Date.now();
    
    // Remove any extra properties that might have been added
    const keysToKeep = ['type', 'id', 'timestamp'];
    for (const key in event) {
      if (!keysToKeep.includes(key)) {
        delete (event as any)[key];
      }
    }
  }

  private cleanEventForPooling(event: GameEvent): Partial<GameEvent> {
    // Create a clean copy with only the type preserved
    // All other properties will be reset when the event is reused
    return {
      type: event.type
    };
  }
}