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

export interface MessageAddedEvent extends BaseGameEvent {
  type: 'MessageAdded';
  message: string;
  category?: 'combat' | 'system' | 'info';
}

export interface PlayerUpdatedEvent extends BaseGameEvent {
  type: 'PlayerUpdated';
  player: import('../../types').Entity;
}

export interface UIRefreshEvent extends BaseGameEvent {
  type: 'UIRefresh';
  reason: 'position_changed' | 'stats_changed' | 'combat_resolved';
}

export interface GameModeChangedEvent extends BaseGameEvent {
  type: 'GameModeChanged';
  oldMode: import('../../systems/game-modes/GameModeTypes').GameMode;
  newMode: import('../../systems/game-modes/GameModeTypes').GameMode;
  reason: 'combat_detected' | 'combat_ended' | 'manual_switch';
}

export interface CombatTriggeredEvent extends BaseGameEvent {
  type: 'CombatTriggered';
  playerId: string;
  hostileId: string;
  distance: number;
  hasLineOfSight: boolean;
  participants: Array<{ id: string; name: string }>;
}

export interface TurnStartedEvent extends BaseGameEvent {
  type: 'TurnStarted';
  entityId: string;
  turnNumber: number;
  initiative: number;
}

export interface TurnEndedEvent extends BaseGameEvent {
  type: 'TurnEnded';
  entityId: string;
  turnNumber: number;
}

export interface CombatStartedEvent extends BaseGameEvent {
  type: 'CombatStarted';
  participants: string[]; // Entity IDs
  turnOrder: Array<{ entityId: string; initiative: number }>;
}

export interface CombatEndedEvent extends BaseGameEvent {
  type: 'CombatEnded';
  reason: 'all_enemies_defeated' | 'player_fled' | 'all_participants_dead';
  duration: number; // milliseconds
}

export interface EntityDiedEvent extends BaseGameEvent {
  type: 'EntityDied';
  entityId: string;
  position: { x: number; y: number };
  killer?: string;
}

export interface ActionProviderRegisteredEvent extends BaseGameEvent {
  type: 'ActionProviderRegistered';
  providerId: string;
  description: string;
}

export interface ActionProviderUnregisteredEvent extends BaseGameEvent {
  type: 'ActionProviderUnregistered';
  providerId: string;
}

export interface RegisterActionProviderEvent extends BaseGameEvent {
  type: 'RegisterActionProvider';
  provider: any; // IActionProvider
}

export interface UnregisterActionProviderEvent extends BaseGameEvent {
  type: 'UnregisterActionProvider';
  providerId: string;
}

export type GameEvent =
  | EnemyDiedEvent
  | DamageDealtEvent
  | ResourceChangedEvent
  | EntityMovedEvent
  | TileChangedEvent
  | MenuOpenedEvent
  | AreaEnteredEvent
  | MessageAddedEvent
  | PlayerUpdatedEvent
  | UIRefreshEvent
  | GameModeChangedEvent
  | CombatTriggeredEvent
  | TurnStartedEvent
  | TurnEndedEvent
  | CombatStartedEvent
  | CombatEndedEvent
  | EntityDiedEvent
  | ActionProviderRegisteredEvent
  | ActionProviderUnregisteredEvent
  | RegisterActionProviderEvent
  | UnregisterActionProviderEvent;

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