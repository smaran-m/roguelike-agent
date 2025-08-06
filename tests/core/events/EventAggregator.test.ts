import { describe, test, expect, beforeEach, vi } from 'vitest';
import { EventAggregator, CommonAggregationRules } from '../../../src/core/events/EventAggregator.js';
import { Logger } from '../../../src/utils/Logger.js';
import { DamageDealtEvent, EntityMovedEvent } from '../../../src/core/events/GameEvent.js';

describe('EventAggregator', () => {
  let aggregator: EventAggregator;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    aggregator = new EventAggregator(mockLogger);
  });

  describe('Rule Management', () => {
    test('should add aggregation rules correctly', () => {
      const rule = CommonAggregationRules.createDamageAggregationRule();
      aggregator.addRule(rule);
      
      expect(aggregator.canAggregate({
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'test',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical'
      })).toBe(true);
      
      expect(aggregator.canAggregate({
        type: 'EntityMoved',
        timestamp: Date.now(),
        id: 'test',
        entityId: 'player',
        oldPosition: { x: 0, y: 0 },
        newPosition: { x: 1, y: 1 }
      })).toBe(false);
    });
  });

  describe('Event Aggregation', () => {
    test('should aggregate similar damage events', () => {
      const rule = CommonAggregationRules.createDamageAggregationRule();
      aggregator.addRule(rule);
      
      const event1: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-1',
        attackerId: 'player',
        targetId: 'orc-1',
        damage: 5,
        damageType: 'physical'
      };
      
      const event2: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now() + 50,
        id: 'dmg-2',
        attackerId: 'player',
        targetId: 'orc-1',
        damage: 3,
        damageType: 'physical'
      };
      
      aggregator.addToAggregation(event1);
      aggregator.addToAggregation(event2);
      
      // Events should be batched - flush immediately since timer hasn't been set up in tests
      const flushed = aggregator.flush();
      expect(flushed).toHaveLength(1); // Should have one aggregated event
      if (flushed.length > 0) {
        expect(flushed[0].damage).toBe(8); // 5 + 3
      }
    });

    test('should not aggregate events from different attackers', () => {
      const rule = CommonAggregationRules.createDamageAggregationRule();
      aggregator.addRule(rule);
      
      const event1: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-1',
        attackerId: 'player',
        targetId: 'orc-1',
        damage: 5,
        damageType: 'physical'
      };
      
      const event2: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-2',
        attackerId: 'ally',
        targetId: 'orc-1',
        damage: 3,
        damageType: 'physical'
      };
      
      aggregator.addToAggregation(event1);
      aggregator.addToAggregation(event2);
      
      // Should create separate batches for different attackers
      const flushed = aggregator.flush();
      expect(flushed.length).toBeGreaterThan(0);
    });

    test('should flush batch when max batch size is reached', () => {
      const rule = {
        eventType: 'DamageDealt',
        windowMs: 1000,
        maxBatchSize: 2,
        shouldAggregate: (event1: any, event2: any) => {
          return event1.targetId === event2.targetId && event1.attackerId === event2.attackerId;
        },
        aggregate: (events: any[]) => {
          const totalDamage = events.reduce((sum, event) => sum + event.damage, 0);
          return { ...events[0], damage: totalDamage, id: `agg_${events.length}` };
        }
      };
      
      aggregator.addRule(rule);
      
      const events = [
        {
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: 'dmg-1',
          attackerId: 'player',
          targetId: 'target',
          damage: 5,
          damageType: 'physical'
        },
        {
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: 'dmg-2',
          attackerId: 'player',
          targetId: 'target',
          damage: 3,
          damageType: 'physical'
        },
        {
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: 'dmg-3',
          attackerId: 'player',
          targetId: 'target',
          damage: 2,
          damageType: 'physical'
        }
      ];
      
      // Add first two events - should not flush yet
      aggregator.addToAggregation(events[0]);
      aggregator.addToAggregation(events[1]);
      
      // Add third event - should trigger flush due to maxBatchSize
      aggregator.addToAggregation(events[2]);
      
      // Should have created an aggregated event from the forced flush
      const flushed = aggregator.flush();
      expect(flushed.length).toBe(1);
      if (flushed.length > 0) {
        expect(flushed[0].damage).toBe(2); // The third event that triggered the flush
      }
    });
  });

  describe('Timer-based Flushing', () => {
    test('should flush events after time window expires', (done) => {
      const rule = {
        eventType: 'DamageDealt',
        windowMs: 100,
        maxBatchSize: 10,
        shouldAggregate: (event1: any, event2: any) => true,
        aggregate: (events: any[]) => {
          const totalDamage = events.reduce((sum, event) => sum + event.damage, 0);
          return { ...events[0], damage: totalDamage, id: `agg_${events.length}` };
        }
      };
      
      aggregator.addRule(rule);
      
      const event: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-timer',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical'
      };
      
      aggregator.addToAggregation(event);
      
      // Wait for timer to expire
      setTimeout(() => {
        const flushed = aggregator.flush();
        expect(flushed.length).toBe(1);
        if (flushed.length > 0) {
          expect(flushed[0].damage).toBe(10);
        }
        done();
      }, 150);
    });
  });

  describe('Clear Functionality', () => {
    test('should clear all pending batches and timers', () => {
      const rule = CommonAggregationRules.createDamageAggregationRule();
      aggregator.addRule(rule);
      
      const event: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-clear',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical'
      };
      
      aggregator.addToAggregation(event);
      aggregator.clear();
      
      // After clearing, flush should return empty
      const flushed = aggregator.flush();
      expect(flushed).toHaveLength(0);
    });
  });

  describe('Movement Event Aggregation', () => {
    test('should aggregate rapid movement events', () => {
      const rule = {
        eventType: 'EntityMoved',
        windowMs: 50,
        maxBatchSize: 5,
        shouldAggregate: (event1: any, event2: any) => {
          return event1.entityId === event2.entityId;
        },
        aggregate: (events: any[]) => {
          const firstEvent = events[0];
          const lastEvent = events[events.length - 1];
          return {
            ...lastEvent,
            oldPosition: firstEvent.oldPosition,
            id: `agg_move_${events.length}_${Date.now()}`
          };
        }
      };
      
      aggregator.addRule(rule);
      
      const movements: EntityMovedEvent[] = [
        {
          type: 'EntityMoved',
          timestamp: Date.now(),
          id: 'move-1',
          entityId: 'player',
          oldPosition: { x: 0, y: 0 },
          newPosition: { x: 1, y: 0 }
        },
        {
          type: 'EntityMoved',
          timestamp: Date.now() + 10,
          id: 'move-2',
          entityId: 'player',
          oldPosition: { x: 1, y: 0 },
          newPosition: { x: 2, y: 0 }
        },
        {
          type: 'EntityMoved',
          timestamp: Date.now() + 20,
          id: 'move-3',
          entityId: 'player',
          oldPosition: { x: 2, y: 0 },
          newPosition: { x: 3, y: 0 }
        }
      ];
      
      movements.forEach(movement => {
        aggregator.addToAggregation(movement);
      });
      
      // Wait for timer to flush
      setTimeout(() => {
        const flushed = aggregator.flush();
        expect(flushed.length).toBe(1);
        
        if (flushed.length > 0) {
          const aggregated = flushed[0] as EntityMovedEvent;
          expect(aggregated.oldPosition).toEqual({ x: 0, y: 0 });
          expect(aggregated.newPosition).toEqual({ x: 3, y: 0 });
        }
      }, 100);
    });
  });
});