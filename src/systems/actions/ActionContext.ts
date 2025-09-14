import { Entity, Item } from '../../types';
import { ActionContext } from './ActionTypes';
import { GameMode } from '../game-modes/GameModeTypes';
import { TileMap } from '../../core/TileMap';
import { LineOfSight } from '../../core/LineOfSight';
import { ResourceManager } from '../../managers/ResourceManager';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';
import { Logger } from '../../utils/Logger';

export class ActionContextBuilder {
  private static readonly NEARBY_TILE_RANGE = 1; // Adjacent tiles
  private static readonly VISIBILITY_RANGE = 8; // Standard visibility range

  /**
   * Build a complete action context for the given entity
   */
  static buildContext(
    entity: Entity,
    gameMode: GameMode,
    allEntities: Entity[],
    tileMap: TileMap,
    options?: Partial<ActionContextOptions>
  ): ActionContext {
    const startTime = performance.now();

    const context: ActionContext = {
      entity,
      gameMode,
      nearbyTiles: this.buildNearbyTiles(entity, tileMap, options?.nearbyRange),
      visibleEntities: this.buildVisibleEntities(entity, allEntities, tileMap, options?.visibilityRange),
      equippedItems: this.buildEquippedItems(entity),
      resources: this.buildResourceContext(entity),
      isInCombat: gameMode === 'combat',
      worldConfig: WorldConfigLoader.getCurrentWorld(),
      lightLevel: options?.lightLevel || 1.0,
      timeOfDay: options?.timeOfDay || 'day',
      weather: options?.weather || 'clear',
      recentEvents: options?.recentEvents || []
    };

    // Add combat-specific context if in combat mode
    if (gameMode === 'combat' && options?.combatState) {
      context.actionPointsRemaining = options.combatState.actionsRemaining;
      context.movementPointsRemaining = options.combatState.movementRemaining;
      context.hasUsedReaction = options.combatState.hasUsedReaction;
    }

    const buildTime = performance.now() - startTime;
    Logger.debug('ActionContext built', {
      entityId: entity.id,
      buildTime: `${buildTime.toFixed(2)}ms`,
      nearbyTiles: context.nearbyTiles.length,
      visibleEntities: context.visibleEntities.length,
      equippedItems: context.equippedItems.size,
      gameMode: context.gameMode
    });

    return context;
  }

  /**
   * Build nearby tiles context with distances
   */
  private static buildNearbyTiles(
    entity: Entity,
    tileMap: TileMap,
    range?: number
  ): Array<{ x: number; y: number; tile: any; distance: number }> {
    const searchRange = range || this.NEARBY_TILE_RANGE;
    const nearbyTiles: Array<{ x: number; y: number; tile: any; distance: number }> = [];

    for (let dy = -searchRange; dy <= searchRange; dy++) {
      for (let dx = -searchRange; dx <= searchRange; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip entity's current tile

        const x = entity.x + dx;
        const y = entity.y + dy;

        // Check bounds
        if (x < 0 || x >= tileMap.width || y < 0 || y >= tileMap.height) {
          continue;
        }

        const tile = tileMap.getTile(x, y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        nearbyTiles.push({ x, y, tile, distance });
      }
    }

    // Sort by distance (closest first)
    nearbyTiles.sort((a, b) => a.distance - b.distance);

    return nearbyTiles;
  }

  /**
   * Build visible entities context
   */
  private static buildVisibleEntities(
    entity: Entity,
    allEntities: Entity[],
    tileMap: TileMap,
    range?: number
  ): Entity[] {
    const visibilityRange = range || this.VISIBILITY_RANGE;
    const visibleEntities: Entity[] = [];

    for (const otherEntity of allEntities) {
      if (otherEntity.id === entity.id) continue; // Skip self

      // Check distance
      const distance = Math.sqrt(
        Math.pow(entity.x - otherEntity.x, 2) +
        Math.pow(entity.y - otherEntity.y, 2)
      );

      if (distance > visibilityRange) continue;

      // Check line of sight
      const hasLOS = LineOfSight.hasLineOfSight(
        tileMap,
        entity.x,
        entity.y,
        otherEntity.x,
        otherEntity.y
      );

      if (hasLOS) {
        visibleEntities.push(otherEntity);
      }
    }

    // Sort by distance (closest first)
    visibleEntities.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(entity.x - a.x, 2) + Math.pow(entity.y - a.y, 2));
      const distB = Math.sqrt(Math.pow(entity.x - b.x, 2) + Math.pow(entity.y - b.y, 2));
      return distA - distB;
    });

    return visibleEntities;
  }

  /**
   * Build equipped items context from entity equipment
   */
  private static buildEquippedItems(entity: Entity): Map<string, Item> {
    const equippedItems = new Map<string, Item>();

    // For now, use a basic check for equipment - this will be enhanced when
    // the equipment slot system from Task 2.1 is implemented
    if (entity.stats && 'equipment' in entity.stats) {
      const equipment = (entity.stats as any).equipment;
      if (equipment instanceof Map) {
        equipment.forEach((item: Item, slotId: string) => {
          equippedItems.set(slotId, item);
        });
      }
    }

    return equippedItems;
  }

  /**
   * Build resource context using ResourceManager
   */
  private static buildResourceContext(entity: Entity): { [resourceId: string]: { current: number; maximum?: number } } {
    const resources: { [resourceId: string]: { current: number; maximum?: number } } = {};

    // Get all resources from the entity
    const allResources = ResourceManager.getAllResources(entity);

    for (const resource of allResources) {
      resources[resource.id] = {
        current: resource.current,
        maximum: resource.maximum
      };
    }

    // Fallback for legacy HP system
    if (!resources.hp && entity.stats.hp !== undefined) {
      resources.hp = {
        current: entity.stats.hp,
        maximum: entity.stats.maxHp || entity.stats.hp
      };
    }

    return resources;
  }

  /**
   * Update context for changed circumstances (performance optimization)
   */
  static updateContext(
    existingContext: ActionContext,
    changes: Partial<ActionContextUpdate>
  ): ActionContext {
    const updatedContext = { ...existingContext };

    if (changes.entity) {
      updatedContext.entity = changes.entity;
      // If entity changed, rebuild resource context
      updatedContext.resources = this.buildResourceContext(changes.entity);
    }

    if (changes.gameMode) {
      updatedContext.gameMode = changes.gameMode;
      updatedContext.isInCombat = changes.gameMode === 'combat';
    }

    if (changes.combatState) {
      updatedContext.actionPointsRemaining = changes.combatState.actionsRemaining;
      updatedContext.movementPointsRemaining = changes.combatState.movementRemaining;
      updatedContext.hasUsedReaction = changes.combatState.hasUsedReaction;
    }

    if (changes.recentEvents) {
      updatedContext.recentEvents = changes.recentEvents;
    }

    Logger.debug('ActionContext updated', {
      entityId: updatedContext.entity.id,
      changes: Object.keys(changes)
    });

    return updatedContext;
  }

  /**
   * Check if context is still valid (for caching)
   */
  static isContextValid(
    context: ActionContext,
    currentEntity: Entity,
    currentGameMode: GameMode
  ): boolean {
    // Context is invalid if core properties have changed
    return (
      context.entity.id === currentEntity.id &&
      context.entity.x === currentEntity.x &&
      context.entity.y === currentEntity.y &&
      context.gameMode === currentGameMode
    );
  }

  /**
   * Get distance between two points
   */
  static getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Check if target position is within range of entity
   */
  static isWithinRange(
    entity: Entity,
    targetX: number,
    targetY: number,
    range: number | 'unlimited' | 'touch' | 'self'
  ): boolean {
    if (range === 'unlimited') return true;
    if (range === 'self') return entity.x === targetX && entity.y === targetY;
    if (range === 'touch') range = 1;

    const distance = this.getDistance(entity.x, entity.y, targetX, targetY);
    return distance <= (range as number);
  }
}

// Options for building action context
export interface ActionContextOptions {
  nearbyRange?: number;
  visibilityRange?: number;
  lightLevel?: number;
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  weather?: string;
  recentEvents?: string[];
  combatState?: {
    actionsRemaining: number;
    movementRemaining: number;
    hasUsedReaction: boolean;
  };
}

// Update object for context updates
export interface ActionContextUpdate {
  entity?: Entity;
  gameMode?: GameMode;
  combatState?: {
    actionsRemaining: number;
    movementRemaining: number;
    hasUsedReaction: boolean;
  };
  recentEvents?: string[];
}