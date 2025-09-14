import { Entity } from '../../types';
import { TileMap } from '../../core/TileMap';
import { EventBus } from '../../core/events/EventBus';
import { Logger } from '../../utils/Logger';
import { generateEventId } from '../../core/events/GameEvent';
import { LineOfSight } from '../../core/LineOfSight';
import { 
  GameMode, 
  GameModeState, 
  CombatTrigger, 
  CombatContext,
  CombatDetectionConfig
} from './GameModeTypes';

export class GameModeManager {
  private state: GameModeState;
  private config: CombatDetectionConfig;
  
  constructor(
    private eventBus: EventBus,
    private logger: Logger,
    config?: Partial<CombatDetectionConfig>
  ) {
    this.state = {
      currentMode: 'exploration',
      previousMode: null,
      modeStartTime: Date.now()
    };
    
    this.config = {
      hostileDetectionRange: 8,
      combatTriggerDistance: 3,
      requireLineOfSight: true,
      ...config
    };
    
    this.setupEventHandlers();
    this.logger.info('GameModeManager initialized', { initialMode: this.state.currentMode });
  }

  private setupEventHandlers(): void {
    // Listen for enemy deaths to potentially end combat
    this.eventBus.subscribe('EnemyDied', (event: any) => {
      if (this.state.currentMode === 'combat') {
        this.logger.debug('Enemy died during combat, checking if combat should end', {
          enemyId: event.enemyId
        });
      }
    });
  }

  getCurrentMode(): GameMode {
    return this.state.currentMode;
  }

  getPreviousMode(): GameMode | null {
    return this.state.previousMode;
  }

  getState(): Readonly<GameModeState> {
    return { ...this.state };
  }

  checkForCombatTriggers(
    player: Entity,
    entities: Entity[],
    tileMap: TileMap
  ): CombatTrigger | null {
    if (this.state.currentMode === 'combat') {
      return null; // Already in combat
    }

    // Find hostile entities within detection range
    const hostileEntities = entities.filter(entity => 
      entity.id !== player.id && 
      !entity.isPlayer &&
      this.calculateDistance(player, entity) <= this.config.hostileDetectionRange
    );

    for (const hostile of hostileEntities) {
      const distance = this.calculateDistance(player, hostile);
      
      // Check if within combat trigger distance
      if (distance <= this.config.combatTriggerDistance) {
        let hasLineOfSight = true;
        
        if (this.config.requireLineOfSight) {
          hasLineOfSight = LineOfSight.hasLineOfSight(
            tileMap, 
            player.x, 
            player.y, 
            hostile.x, 
            hostile.y
          );
        }

        if (hasLineOfSight) {
          return {
            hostileEntity: hostile,
            playerEntity: player,
            distance,
            hasLineOfSight
          };
        }
      }
    }

    return null;
  }

  triggerCombat(
    trigger: CombatTrigger,
    allEntities: Entity[],
    tileMap?: TileMap
  ): void {
    if (this.state.currentMode === 'combat') {
      this.logger.warn('Attempted to trigger combat while already in combat mode');
      return;
    }

    // Find initial combat participants (player + nearby hostiles that can see the combat)
    const participants = [trigger.playerEntity];
    const combatParticipants = this.getValidCombatParticipants(
      trigger.playerEntity,
      trigger.hostileEntity,
      allEntities,
      tileMap
    );
    participants.push(...combatParticipants);

    const combatContext: CombatContext = {
      participants,
      initiator: trigger.hostileEntity,
      trigger
    };

    this.switchMode('combat', 'combat_detected', combatContext);

    // Publish combat triggered event
    this.eventBus.publish({
      type: 'CombatTriggered',
      id: generateEventId(),
      timestamp: Date.now(),
      playerId: trigger.playerEntity.id,
      hostileId: trigger.hostileEntity.id,
      distance: trigger.distance,
      hasLineOfSight: trigger.hasLineOfSight,
      participants: participants.map(p => ({ id: p.id, name: p.name }))
    });

    this.logger.info('Combat triggered', {
      trigger: {
        hostile: trigger.hostileEntity.name,
        distance: trigger.distance,
        hasLOS: trigger.hasLineOfSight
      },
      participants: participants.length
    });
  }

  endCombat(reason: 'all_enemies_defeated' | 'player_fled' | 'all_participants_dead'): void {
    if (this.state.currentMode !== 'combat') {
      this.logger.warn('Attempted to end combat while not in combat mode');
      return;
    }

    const duration = Date.now() - this.state.modeStartTime;

    // Publish combat ended event
    this.eventBus.publish({
      type: 'CombatEnded',
      id: generateEventId(),
      timestamp: Date.now(),
      reason,
      duration
    });

    this.switchMode('exploration', 'combat_ended');

    this.logger.info('Combat ended', {
      reason,
      duration: `${Math.round(duration / 1000)}s`
    });
  }

  checkCombatEndConditions(
    player: Entity,
    entities: Entity[]
  ): 'all_enemies_defeated' | 'player_fled' | 'all_participants_dead' | null {
    if (this.state.currentMode !== 'combat' || !this.state.combatContext) {
      return null;
    }

    // Check if player is dead
    if (player.stats.resources?.hp?.current === 0 || player.stats.hp === 0) {
      return 'all_participants_dead';
    }

    // Check if all enemies are defeated
    const livingEnemies = entities.filter(entity => 
      !entity.isPlayer && 
      entity.id !== player.id &&
      (entity.stats.resources?.hp?.current || entity.stats.hp || 0) > 0
    );

    if (livingEnemies.length === 0) {
      return 'all_enemies_defeated';
    }

    // TODO: Add player fled condition when we have movement-based flee mechanics
    
    return null;
  }

  forceMode(mode: GameMode): void {
    if (this.state.currentMode === mode) {
      return;
    }

    this.switchMode(mode, 'manual_switch');
    this.logger.info('Game mode manually switched', { newMode: mode });
  }

  private switchMode(
    newMode: GameMode, 
    reason: 'combat_detected' | 'combat_ended' | 'manual_switch',
    combatContext?: CombatContext
  ): void {
    const oldMode = this.state.currentMode;
    
    this.state = {
      currentMode: newMode,
      previousMode: oldMode,
      modeStartTime: Date.now(),
      combatContext: newMode === 'combat' ? combatContext : undefined
    };

    // Publish mode change event
    this.eventBus.publish({
      type: 'GameModeChanged',
      id: generateEventId(),
      timestamp: Date.now(),
      oldMode,
      newMode,
      reason
    });

    this.logger.debug('Game mode switched', {
      from: oldMode,
      to: newMode,
      reason
    });
  }

  private calculateDistance(entity1: Entity, entity2: Entity): number {
    return Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) +
      Math.pow(entity1.y - entity2.y, 2)
    );
  }

  /**
   * Get entities that can validly participate in combat based on distance and line of sight
   */
  private getValidCombatParticipants(
    player: Entity,
    triggerEntity: Entity,
    allEntities: Entity[],
    tileMap?: TileMap
  ): Entity[] {
    const participants: Entity[] = [];

    // Always include the entity that triggered combat
    if (!participants.find(p => p.id === triggerEntity.id)) {
      participants.push(triggerEntity);
    }

    // Find other entities that can participate in combat
    for (const entity of allEntities) {
      if (entity.id === player.id || entity.isPlayer) {
        continue; // Skip player (already included)
      }

      if (entity.id === triggerEntity.id) {
        continue; // Skip trigger entity (already included)
      }

      if (this.canParticipateInCombat(player, triggerEntity, entity, tileMap)) {
        participants.push(entity);
      }
    }

    this.logger.debug('Combat participants selected', {
      triggerEntity: triggerEntity.name,
      totalParticipants: participants.length,
      participants: participants.map(p => ({ id: p.id, name: p.name }))
    });

    return participants;
  }

  /**
   * Check if an entity can participate in combat based on various criteria
   */
  private canParticipateInCombat(
    player: Entity,
    triggerEntity: Entity,
    candidate: Entity,
    tileMap?: TileMap
  ): boolean {
    // Must be within combat trigger distance of player
    const distanceToPlayer = this.calculateDistance(player, candidate);
    if (distanceToPlayer > this.config.combatTriggerDistance) {
      return false;
    }

    // Must have line of sight to either the player or the trigger entity (can see the combat)
    if (tileMap && this.config.requireLineOfSight) {
      const canSeePlayer = LineOfSight.hasLineOfSight(
        tileMap,
        candidate.x,
        candidate.y,
        player.x,
        player.y
      );

      const canSeeTrigger = LineOfSight.hasLineOfSight(
        tileMap,
        candidate.x,
        candidate.y,
        triggerEntity.x,
        triggerEntity.y
      );

      if (!canSeePlayer && !canSeeTrigger) {
        return false;
      }
    }

    // Add more validation criteria here as needed
    // - Entity must be hostile to player
    // - Entity must not be incapacitated
    // - Entity must be aware of combat

    return true;
  }

  destroy(): void {
    this.logger.info('GameModeManager destroyed');
  }
}