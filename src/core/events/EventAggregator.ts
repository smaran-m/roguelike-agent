import { GameEvent } from './GameEvent.js';
import { Logger } from '../../utils/Logger.js';

export interface AggregationRule<T extends GameEvent> {
  eventType: T['type'];
  windowMs: number;
  maxBatchSize: number;
  shouldAggregate: (event1: T, event2: T) => boolean;
  aggregate: (events: T[]) => T;
}

export class EventAggregator {
  private readonly rules: Map<string, AggregationRule<any>> = new Map();
  private readonly pendingBatches: Map<string, GameEvent[]> = new Map();
  private readonly timers: Map<string, number> = new Map();

  constructor(private readonly logger: Logger) {}

  addRule<T extends GameEvent>(rule: AggregationRule<T>): void {
    this.rules.set(rule.eventType, rule);
    this.logger.debug('Added aggregation rule', { eventType: rule.eventType, windowMs: rule.windowMs });
  }

  canAggregate(event: GameEvent): boolean {
    return this.rules.has(event.type);
  }

  addToAggregation(event: GameEvent): void {
    const rule = this.rules.get(event.type);
    if (!rule) {
      throw new Error(`No aggregation rule found for event type: ${event.type}`);
    }

    const batchKey = this.getBatchKey(event, rule);
    
    // Initialize batch if it doesn't exist
    if (!this.pendingBatches.has(batchKey)) {
      this.pendingBatches.set(batchKey, []);
    }

    const batch = this.pendingBatches.get(batchKey)!;
    
    // Check if we can aggregate with existing events in the batch
    const canAggregateWithBatch = batch.length === 0 || 
      batch.some(existingEvent => rule.shouldAggregate(event as any, existingEvent as any));

    if (canAggregateWithBatch) {
      batch.push(event);

      // Start timer if this is the first event in the batch
      if (batch.length === 1) {
        this.startBatchTimer(batchKey, rule.windowMs);
      }

      // Force flush if batch is full
      if (batch.length >= rule.maxBatchSize) {
        this.flushBatch(batchKey);
      }
    } else {
      // Can't aggregate, process immediately
      this.flushBatch(batchKey);
      this.pendingBatches.set(batchKey, [event]);
      this.startBatchTimer(batchKey, rule.windowMs);
    }
  }

  flush(): GameEvent[] {
    const aggregatedEvents: GameEvent[] = [];

    for (const batchKey of this.pendingBatches.keys()) {
      const batchEvents = this.flushBatch(batchKey);
      if (batchEvents) {
        aggregatedEvents.push(batchEvents);
      }
    }

    return aggregatedEvents;
  }

  clear(): void {
    // Clear all timers
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    
    this.timers.clear();
    this.pendingBatches.clear();
  }

  private getBatchKey(_event: GameEvent, rule: AggregationRule<any>): string {
    // Create a unique key for batching similar events
    // For now, we just use the event type, but this could be more sophisticated
    return `${rule.eventType}_${Math.floor(Date.now() / rule.windowMs)}`;
  }

  private startBatchTimer(batchKey: string, windowMs: number): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Start new timer
    const timerId = window.setTimeout(() => {
      this.flushBatch(batchKey);
    }, windowMs);

    this.timers.set(batchKey, timerId);
  }

  private flushBatch(batchKey: string): GameEvent | null {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.length === 0) {
      return null;
    }

    const eventType = batch[0].type;
    const rule = this.rules.get(eventType);
    if (!rule) {
      this.logger.warn('No aggregation rule found during flush', { eventType, batchKey });
      return null;
    }

    let aggregatedEvent: GameEvent;

    if (batch.length === 1) {
      // Single event, no aggregation needed
      aggregatedEvent = batch[0];
    } else {
      // Multiple events, aggregate them
      aggregatedEvent = rule.aggregate(batch);
    }

    // Clean up
    this.pendingBatches.delete(batchKey);
    const timerId = this.timers.get(batchKey);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(batchKey);
    }

    this.logger.debug('Flushed event batch', { 
      batchKey, 
      eventCount: batch.length, 
      aggregatedEventId: aggregatedEvent.id 
    });

    return aggregatedEvent;
  }
}

// Common aggregation rules
export const CommonAggregationRules = {
  // Aggregate damage events within 100ms windows
  createDamageAggregationRule(): AggregationRule<any> {
    return {
      eventType: 'DamageDealt',
      windowMs: 100,
      maxBatchSize: 10,
      shouldAggregate: (event1, event2) => {
        return event1.targetId === event2.targetId && 
               event1.attackerId === event2.attackerId;
      },
      aggregate: (events) => {
        const totalDamage = events.reduce((sum, event) => sum + event.damage, 0);
        const firstEvent = events[0];
        return {
          ...firstEvent,
          damage: totalDamage,
          id: `aggregated_${events.length}_${firstEvent.id}`,
          timestamp: Math.max(...events.map(e => e.timestamp))
        };
      }
    };
  }
};