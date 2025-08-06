// Game Event Types and Interfaces

export interface BaseGameEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly id: string;
}

export interface EnemyDiedEvent extends BaseGameEvent {
  type: 'EnemyDied';
  enemyId: string;
  position: { x: number; y: number };
  killer?: string;
}

export interface DamageDealtEvent extends BaseGameEvent {
  type: 'DamageDealt';
  attackerId: string;
  targetId: string;
  damage: number;
  damageType: string;
  targetPosition?: { x: number; y: number };
}

export interface ResourceChangedEvent extends BaseGameEvent {
  type: 'ResourceChanged';
  entityId: string;
  resourceType: string;
  oldValue: number;
  newValue: number;
}

export interface EntityMovedEvent extends BaseGameEvent {
  type: 'EntityMoved';
  entityId: string;
  oldPosition: { x: number; y: number };
  newPosition: { x: number; y: number };
}

export interface TileChangedEvent extends BaseGameEvent {
  type: 'TileChanged';
  position: { x: number; y: number };
  oldWalkable: boolean;
  newWalkable: boolean;
}

export interface MenuOpenedEvent extends BaseGameEvent {
  type: 'MenuOpened';
  menuType: string;
}

export interface AreaEnteredEvent extends BaseGameEvent {
  type: 'AreaEntered';
  areaType: string;
  areaId: string;
}

export type GameEvent = 
  | EnemyDiedEvent 
  | DamageDealtEvent 
  | ResourceChangedEvent
  | EntityMovedEvent
  | TileChangedEvent
  | MenuOpenedEvent
  | AreaEnteredEvent;

export type EventHandler<T extends BaseGameEvent = GameEvent> = (event: T) => void;
export type EventUnsubscriber = () => void;

export interface EventBusMetrics {
  totalEventsProcessed: number;
  eventsPerSecond: number;
  bufferUsage: number;
  activeHandlers: number;
  droppedEvents: number;
}

// Utility function to generate unique event IDs
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}