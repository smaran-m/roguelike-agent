import { GameEvent, EventHandler, EventUnsubscriber, EventBusMetrics } from './GameEvent.js';
import { EventAggregator } from './EventAggregator.js';
import { EventPool } from './EventPool.js';
import { Logger } from '../../utils/Logger.js';
import { ErrorHandler, GameErrorCode } from '../../utils/ErrorHandler.js';

export interface EventBusConfig {
  bufferSize?: number;
  enableAggregation?: boolean;
  enablePooling?: boolean;
  maxPoolSize?: number;
}

export class EventBus {
  private readonly ringBuffer: GameEvent[];
  private readonly handlers: Map<string, Set<EventHandler>> = new Map();
  private readonly aggregator: EventAggregator;
  private readonly eventPool: EventPool;
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private readonly bufferSize: number;
  
  // Metrics tracking
  private totalEventsProcessed: number = 0;
  private droppedEvents: number = 0;
  private lastSecondEventCount: number = 0;
  private lastMetricsTime: number = Date.now();
  private isProcessing: boolean = false;

  constructor(
    config: EventBusConfig,
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandler
  ) {
    this.bufferSize = config.bufferSize || 1024;
    this.ringBuffer = new Array(this.bufferSize);
    
    this.aggregator = new EventAggregator(logger);
    this.eventPool = new EventPool(config.maxPoolSize || 100, logger);
    
    // Set up default aggregation rules if enabled
    if (config.enableAggregation !== false) {
      this.setupDefaultAggregationRules();
    }
    
    this.logger.info('EventBus initialized', {
      bufferSize: this.bufferSize,
      aggregationEnabled: config.enableAggregation !== false,
      poolingEnabled: config.enablePooling !== false
    });
  }

  publish(event: GameEvent): void {
    try {
      // Check if we can aggregate this event
      if (this.aggregator.canAggregate(event)) {
        this.aggregator.addToAggregation(event);
        return;
      }

      // Add directly to ring buffer
      this.addToRingBuffer(event);
      
    } catch (error) {
      this.errorHandler.handle(
        GameErrorCode.EVENT_PUBLISHING_FAILED,
        error instanceof Error ? error : new Error(String(error)),
        { eventType: event.type, eventId: event.id }
      );
    }
  }

  subscribe<T extends GameEvent>(
    eventType: T['type'], 
    handler: EventHandler<T>
  ): EventUnsubscriber {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler as EventHandler);
    
    this.logger.debug('Event handler subscribed', { 
      eventType, 
      handlerCount: handlers.size 
    });

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler as EventHandler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
        
        this.logger.debug('Event handler unsubscribed', { 
          eventType, 
          remainingHandlers: handlers.size 
        });
      }
    };
  }

  processEvents(): void {
    if (this.isProcessing) {
      this.logger.warn('EventBus already processing, skipping');
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();
    let processedCount = 0;

    try {
      // First process any aggregated events
      const aggregatedEvents = this.aggregator.flush();
      for (const event of aggregatedEvents) {
        this.deliverEvent(event);
        processedCount++;
      }

      // Then process events from ring buffer
      while (this.size > 0) {
        const event = this.removeFromRingBuffer();
        if (event) {
          this.deliverEvent(event);
          processedCount++;
          
          // Release event back to pool if pooling is enabled
          this.eventPool.release(event);
        }
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      if (processedCount > 0) {
        this.totalEventsProcessed += processedCount;
        this.logger.debug('Events processed', {
          count: processedCount,
          processingTime,
          averageTimePerEvent: processingTime / processedCount
        });
      }

    } catch (error) {
      this.errorHandler.handle(
        GameErrorCode.EVENT_PROCESSING_FAILED,
        error instanceof Error ? error : new Error(String(error)),
        { processedCount }
      );
    } finally {
      this.isProcessing = false;
    }
  }

  flush(): void {
    this.logger.info('Flushing EventBus');
    
    // Clear ring buffer
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    
    // Clear aggregator
    this.aggregator.clear();
    
    // Clear event pool
    this.eventPool.clear();
  }

  getMetrics(): EventBusMetrics {
    const now = Date.now();
    const timeDelta = now - this.lastMetricsTime;
    
    // Calculate events per second
    let eventsPerSecond = 0;
    if (timeDelta >= 1000) {
      eventsPerSecond = (this.totalEventsProcessed - this.lastSecondEventCount) / (timeDelta / 1000);
      this.lastSecondEventCount = this.totalEventsProcessed;
      this.lastMetricsTime = now;
    }

    const activeHandlers = Array.from(this.handlers.values())
      .reduce((sum, handlerSet) => sum + handlerSet.size, 0);

    return {
      totalEventsProcessed: this.totalEventsProcessed,
      eventsPerSecond: Math.round(eventsPerSecond),
      bufferUsage: this.size / this.bufferSize,
      activeHandlers,
      droppedEvents: this.droppedEvents
    };
  }

  private addToRingBuffer(event: GameEvent): void {
    // Check for buffer overflow
    if (this.size >= this.bufferSize) {
      // Drop the oldest event
      this.removeFromRingBuffer();
      this.droppedEvents++;
      this.logger.warn('Ring buffer overflow, dropping oldest event', {
        droppedCount: this.droppedEvents
      });
    }

    this.ringBuffer[this.tail] = event;
    this.tail = (this.tail + 1) % this.bufferSize;
    this.size++;
  }

  private removeFromRingBuffer(): GameEvent | null {
    if (this.size === 0) {
      return null;
    }

    const event = this.ringBuffer[this.head];
    this.head = (this.head + 1) % this.bufferSize;
    this.size--;
    
    return event;
  }

  private deliverEvent(event: GameEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      return; // No handlers for this event type
    }

    // Deliver to all handlers
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        this.logger.error('Event handler threw an exception', {
          eventType: event.type,
          eventId: event.id,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Continue processing other handlers even if one fails
        this.errorHandler.handle(
          GameErrorCode.EVENT_HANDLER_FAILED,
          error instanceof Error ? error : new Error(String(error)),
          { eventType: event.type, eventId: event.id }
        );
      }
    }
  }

  private setupDefaultAggregationRules(): void {
    // Rule for damage events - aggregate damage dealt within 100ms windows
    this.aggregator.addRule({
      eventType: 'DamageDealt',
      windowMs: 100,
      maxBatchSize: 10,
      shouldAggregate: (event1: any, event2: any) => {
        return event1.targetId === event2.targetId && 
               event1.attackerId === event2.attackerId;
      },
      aggregate: (events: any[]) => {
        const totalDamage = events.reduce((sum, event) => sum + event.damage, 0);
        const firstEvent = events[0];
        return {
          ...firstEvent,
          damage: totalDamage,
          id: `agg_dmg_${events.length}_${Date.now()}`,
          timestamp: Math.max(...events.map((e: any) => e.timestamp))
        };
      }
    });

    // Rule for movement events - aggregate rapid movement within 50ms windows
    this.aggregator.addRule({
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
          id: `agg_move_${events.length}_${Date.now()}`,
          timestamp: lastEvent.timestamp
        };
      }
    });
  }
}