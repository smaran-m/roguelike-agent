import { Entity } from '../../types';
import { CombatSystem } from './CombatSystem';
import { IRenderer } from '../../core/renderers/IRenderer';
import { CharacterManager } from '../../managers/CharacterManager';
import { EventBus } from '../../core/events/EventBus';
import { generateEventId, EnemyDiedEvent } from '../../core/events/GameEvent';
import { ActionExecutionEngine } from '../actions/ActionExecutionEngine';
import { ActionDiscoveryPipeline } from '../actions/ActionDiscoveryPipeline';
import { ActionContext } from '../actions/ActionTypes';
import { IntrinsicActionSource } from '../actions/sources/IntrinsicActionSource';
import { EquipmentActionSource } from '../actions/sources/EquipmentActionSource';
import { TileMap } from '../../core/TileMap';
import { LineOfSight } from '../../core/LineOfSight';
import { Logger } from '../../utils/Logger';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';
import { ActionSelectionUI, ActionSelectionCallbacks, createActionOptions } from '../../ui/components/ActionSelectionUI';

export interface CombatResult {
  success: boolean;
  targetKilled: boolean;
  target?: Entity;
  attackResult?: any;
}

export class CombatManager {
  private renderer: IRenderer;
  private eventBus: EventBus;
  private actionExecutionEngine: ActionExecutionEngine;
  private actionDiscovery: ActionDiscoveryPipeline;
  private actionSelectionUI: ActionSelectionUI | null = null;
  private logger: Logger;
  private actionExecutedCallback: ((result: CombatResult, action: any) => void) | null = null;

  constructor(renderer: IRenderer, eventBus: EventBus, logger: Logger) {
    this.renderer = renderer;
    this.eventBus = eventBus;
    this.logger = logger;
    this.actionExecutionEngine = new ActionExecutionEngine(eventBus, logger);
    this.actionDiscovery = new ActionDiscoveryPipeline(eventBus, logger);

    // Register action sources
    this.setupActionSources(logger);
    this.setupDeathAnimations();
    this.setupActionSelectionUI();
  }

  private setupActionSources(logger: Logger): void {
    // Register core action sources
    this.actionDiscovery.registerSource(new IntrinsicActionSource(logger));
    this.actionDiscovery.registerSource(new EquipmentActionSource(logger));
  }

  private setupActionSelectionUI(): void {
    const callbacks: ActionSelectionCallbacks = {
      onActionSelected: (action: any, target: any) => {
        this.handleActionSelection(action, target);
      },
      onCancel: () => {
        this.handleActionSelectionCancel();
      }
    };

    this.actionSelectionUI = new ActionSelectionUI(callbacks, this.logger);
  }

  /**
   * Set an optional callback for when actions are successfully executed
   * This allows the Game class to handle turn management and other side effects
   */
  setActionExecutedCallback(callback: (result: CombatResult, action: any) => void): void {
    this.actionExecutedCallback = callback;
  }
  
  private setupDeathAnimations() {
    this.eventBus.subscribe('EnemyDied', (event) => {
      const deathEvent = event as EnemyDiedEvent;
      console.log('💀 CombatManager: EnemyDied event received for animations!', { 
        position: deathEvent.position,
        enemyId: deathEvent.enemyId 
      });
      
      // Trigger death ripple animation if supported by renderer
      // if (this.renderer && this.renderer.startDeathRipple) {
      //   console.log('CombatManager: Starting death ripple');
      //   this.renderer.startDeathRipple(deathEvent.position.x, deathEvent.position.y);
        
      //   if (this.renderer.startColorRipple) {
      //     console.log('CombatManager: Adding red death color ripple wave');
      //     this.renderer.startColorRipple(deathEvent.position.x, deathEvent.position.y, 0xFF0000, 1.0, 15);
      //   }
        
      //   if (this.renderer.startLinearWave) {
      //     console.log('CombatManager: Adding linear wave effect');
      //     this.renderer.startLinearWave(deathEvent.position.x, deathEvent.position.y, 0, 20, 12, 2);
      //   }
        
      //   if (this.renderer.startConicalWave) {
      //     console.log('CombatManager: Adding conical wave effect');
      //     this.renderer.startConicalWave(deathEvent.position.x, deathEvent.position.y, -60, 60, 18, 10);
      //   }
      // } else {
      //   console.log('CombatManager: Renderer does not support death animations');
      // }
    });
  }

  /**
   * Execute any action through the generic action system
   * @param action The action to execute
   * @param performer The entity performing the action
   * @param target Optional target for the action (entity or position)
   * @param entities All entities in the game (for context)
   * @param tileMap The game's tile map
   * @returns Result of the action execution
   */
  executeAction(
    action: any,
    performer: Entity,
    target: Entity | { x: number; y: number } | null,
    entities: Entity[],
    tileMap?: TileMap
  ): CombatResult {
    // Create action context for performer
    const characterManager = CharacterManager.getInstance();
    const equippedItems = new Map();

    if (performer.isPlayer) {
      const weapon = characterManager.getEquippedWeapon();
      if (weapon) {
        equippedItems.set('mainhand', weapon);
      }
    }

    // Create context for action execution
    const context: ActionContext = {
      entity: performer,
      equippedItems,
      gameMode: 'combat',
      nearbyTiles: [],
      visibleEntities: entities.filter(e => e.id !== performer.id),
      resources: performer.stats.resources || {}
    };

    // Visual effects for action attempt (if has target and isn't self-targeting)
    if (target && (target as Entity).id && action.targeting?.type !== 'self') {
      this.renderer.nudgeEntity(performer, (target as Entity).x, (target as Entity).y);
    }

    // Execute the action through the action execution engine
    const executionResult = this.actionExecutionEngine.executeAction(
      action,
      performer,
      target,
      context,
      tileMap
    );

    // Handle visual effects based on action results
    if (executionResult.success) {
      this.handleSuccessfulActionEffects(action, executionResult, performer, target);
    } else {
      // Visual feedback for failed action
      this.renderer.shakeEntity(performer);
    }

    return {
      success: executionResult.success,
      targetKilled: executionResult.targetKilled || false,
      target: executionResult.target,
      attackResult: executionResult
    };
  }

  /**
   * Discover and auto-select the best available action for combat
   * Maintains backward compatibility but uses the generic framework
   */
  attemptCombatAction(attacker: Entity, entities: Entity[], tileMap?: TileMap): CombatResult {
    // Discover all available actions
    const availableActions = this.discoverAvailableActions(attacker, entities, tileMap);

    // Filter for combat-appropriate actions (attacks with valid targets)
    const combatActions = this.findActionsWithValidTargets(availableActions, attacker, entities, tileMap);

    if (combatActions.length === 0) {
      this.eventBus.publish({
        type: 'MessageAdded',
        id: generateEventId(),
        timestamp: Date.now(),
        message: "No combat actions available!",
        category: 'combat'
      });
      return { success: false, targetKilled: false };
    }

    // Auto-select the best action and target
    const { selectedAction, selectedTarget } = this.selectBestActionAndTarget(combatActions, attacker, entities);

    // Execute the selected action
    return this.executeAction(selectedAction, attacker, selectedTarget, entities, tileMap);
  }

  /**
   * Discover all available actions for an entity
   */
  private discoverAvailableActions(entity: Entity, entities: Entity[], tileMap?: TileMap): any[] {
    const defaultTileMap = tileMap || new TileMap(20, 20);

    console.log('Calling actionDiscovery.discoverActions for:', entity.name);

    const discoveryResult = this.actionDiscovery.discoverActions(
      entity,
      'combat',
      entities,
      defaultTileMap
    );

    console.log('Raw discovery result:', {
      actionsFound: discoveryResult.actions.length,
      actions: discoveryResult.actions.map(a => ({ id: a.id, name: a.name, source: a.source }))
    });

    return discoveryResult.actions;
  }

  /**
   * Find actions that have valid targets available
   */
  private findActionsWithValidTargets(actions: any[], performer: Entity, entities: Entity[], tileMap?: TileMap): Array<{action: any, validTargets: any[]}> {
    console.log('Actions to validate:', actions.length);
    console.log('Entities available:', entities.length);
    console.log('Entities:', entities.map(e => ({ id: e.id, name: e.name, x: e.x, y: e.y })));
    console.log('Performer position:', { x: performer.x, y: performer.y });

    const actionsWithTargets: Array<{action: any, validTargets: any[]}> = [];

    for (const action of actions) {
      console.log(`\nValidating action: ${action.id} (${action.name})`);
      console.log('  Targeting type:', action.targeting?.type);

      const validTargets = this.findValidTargetsForAction(action, performer, entities, tileMap);
      console.log(`  Valid targets found: ${validTargets.length}`);

      const shouldInclude = validTargets.length > 0 || action.targeting?.type === 'self' || action.targeting?.type === 'none';
      console.log(`  Should include: ${shouldInclude}`);

      if (shouldInclude) {
        actionsWithTargets.push({ action, validTargets });
      }
    }

    console.log(`Final actions with targets: ${actionsWithTargets.length}`);
    return actionsWithTargets;
  }

  /**
   * Find valid targets for a specific action based on its targeting requirements
   */
  private findValidTargetsForAction(action: any, performer: Entity, entities: Entity[], tileMap?: TileMap): any[] {
    const targeting = action.targeting;
    if (!targeting) return [];

    // Handle different targeting types
    switch (targeting.type) {
      case 'self':
      case 'none':
        return [performer]; // Self-targeting or no targeting

      case 'single':
        return this.findSingleTargets(action, performer, entities, tileMap);

      case 'area':
        // For area effects, we might target positions rather than entities
        return this.findAreaTargets(action, performer, entities);

      default:
        return [];
    }
  }

  /**
   * Find valid single targets for an action
   */
  private findSingleTargets(action: any, performer: Entity, entities: Entity[], tileMap?: TileMap): Entity[] {
    console.log(`\n--- Finding single targets for ${action.name} ---`);
    const validTargets: Entity[] = [];
    const targeting = action.targeting;
    const range = targeting?.range || 1;
    console.log('Action range:', range);

    for (const entity of entities) {
      console.log(`\nChecking entity: ${entity.name} at (${entity.x}, ${entity.y})`);

      if (entity.id === performer.id) {
        console.log('  -> Skipped: Same as performer');
        continue;
      }

      // Check range - use grid distance for melee attacks (range 1)
      const maxRange = typeof range === 'number' ? range : (range === 'unlimited' ? Infinity : 1);
      const distance = maxRange <= 1
        ? Math.max(Math.abs(performer.x - entity.x), Math.abs(performer.y - entity.y)) // Grid distance for melee
        : CombatSystem.getDistance(performer, entity); // Euclidean distance for ranged
      console.log(`  -> Distance: ${distance} (${maxRange <= 1 ? 'grid' : 'euclidean'}), Max range: ${maxRange}`);
      if (distance > maxRange) {
        console.log('  -> Skipped: Out of range');
        continue;
      }

      // Check line of sight if required
      if (targeting?.requiresLineOfSight && tileMap && !this.hasLineOfSight(performer, entity, tileMap)) {
        console.log('  -> Skipped: No line of sight');
        continue;
      }

      // Check target criteria
      const matchesCriteria = this.matchesTargetCriteria(entity, targeting?.validTargets);
      console.log(`  -> Matches criteria: ${matchesCriteria}`);
      console.log(`  -> Valid targets config:`, targeting?.validTargets);

      if (matchesCriteria) {
        console.log('  -> VALID TARGET FOUND!');
        validTargets.push(entity);
      }
    }

    console.log(`Total valid targets found: ${validTargets.length}`);
    return validTargets;
  }

  /**
   * Find valid area targets (positions) for an action
   */
  private findAreaTargets(action: any, performer: Entity, _entities: Entity[]): Array<{x: number, y: number}> {
    // For now, return positions around the performer as potential area targets
    // This could be enhanced with actual area targeting logic
    const targets: Array<{x: number, y: number}> = [];
    const range = action.targeting?.range || 3;
    const maxRange = typeof range === 'number' ? range : 3;

    for (let dx = -maxRange; dx <= maxRange; dx++) {
      for (let dy = -maxRange; dy <= maxRange; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip performer's position
        const distance = maxRange <= 1
          ? Math.max(Math.abs(dx), Math.abs(dy)) // Grid distance for melee
          : Math.sqrt(dx * dx + dy * dy); // Euclidean for ranged
        if (distance <= maxRange) {
          targets.push({ x: performer.x + dx, y: performer.y + dy });
        }
      }
    }

    return targets;
  }

  /**
   * Select the best action and target from available options
   */
  private selectBestActionAndTarget(actionsWithTargets: Array<{action: any, validTargets: any[]}>, performer: Entity, _entities: Entity[]): {selectedAction: any, selectedTarget: any} {
    // For now, prioritize by action priority and select first valid target
    const sortedActions = actionsWithTargets.sort((a, b) => (b.action.priority || 0) - (a.action.priority || 0));
    const bestActionWithTargets = sortedActions[0];

    const selectedAction = bestActionWithTargets.action;
    let selectedTarget = null;

    if (selectedAction.targeting?.type === 'self' || selectedAction.targeting?.type === 'none') {
      selectedTarget = performer;
    } else if (bestActionWithTargets.validTargets.length > 0) {
      // Select the closest target
      selectedTarget = bestActionWithTargets.validTargets.reduce((closest, current) => {
        const closestDistance = CombatSystem.getDistance(performer, closest);
        const currentDistance = CombatSystem.getDistance(performer, current);
        return currentDistance < closestDistance ? current : closest;
      });
    }

    return { selectedAction, selectedTarget };
  }

  /**
   * Handle visual effects for successful actions
   */
  private handleSuccessfulActionEffects(action: any, result: any, _performer: Entity, _target: any): void {
    // Handle death/removal effects
    if (result.targetKilled && result.target) {
      this.renderer.removeEntity(result.target.id);
    }

    // Handle damage effects
    if (result.target && action.category === 'attack') {
      this.renderer.shakeEntity(result.target);
      // Show floating damage if available in result
      if (result.effects && result.effects.some((e: string) => e.includes('damage'))) {
        const damageMatch = result.message.match(/(\d+)/);
        if (damageMatch) {
          this.renderer.showFloatingDamage(result.target, parseInt(damageMatch[1]));
        }
      }
    }

    // Handle movement effects
    if (action.category === 'movement') {
      // Could add movement animations here
    }

    // Handle other action categories as needed
  }

  /**
   * Check if performer has line of sight to target using the LineOfSight system
   */
  private hasLineOfSight(performer: Entity, target: Entity, tileMap: TileMap): boolean {
    return LineOfSight.hasLineOfSight(tileMap, performer.x, performer.y, target.x, target.y);
  }

  /**
   * Check if a target matches the action's target criteria
   */
  private matchesTargetCriteria(target: Entity, validTargetCriteria: any[]): boolean {
    console.log(`    Checking target criteria for ${target.name}:`);
    console.log(`      Target has stats:`, !!target.stats);

    // Check primary combat resource using world config
    const worldConfig = WorldConfigLoader.getCurrentWorld();
    const primaryResourceId = worldConfig?.mechanics?.combatResources?.primary || 'hp';
    const currentHealth = target.stats?.resources?.[primaryResourceId]?.current;

    console.log(`      Primary resource (${primaryResourceId}):`, currentHealth);
    console.log(`      Criteria:`, validTargetCriteria);

    if (!validTargetCriteria || validTargetCriteria.length === 0) {
      console.log(`      No criteria specified -> TRUE`);
      return true;
    }

    for (const criteria of validTargetCriteria) {
      console.log(`      Checking criteria type:`, criteria.type);
      if (criteria.type === 'entity') {
        console.log(`        Entity criteria:`, criteria.criteria);

        // Check entity criteria
        if (criteria.criteria?.isAlive !== undefined && !target.stats) {
          console.log(`        Failed: isAlive check but no stats -> FALSE`);
          return false;
        }
        if (criteria.criteria?.isAlive && (currentHealth || 0) <= 0) {
          console.log(`        Failed: isAlive check but ${primaryResourceId} <= 0 -> FALSE`);
          return false;
        }
        // Add more criteria checks as needed
        console.log(`        Passed entity criteria -> TRUE`);
        return true;
      }
    }

    console.log(`      No matching criteria found -> FALSE`);
    return false;
  }

  // Legacy methods for backward compatibility
  findTargetsInRange(attacker: Entity, entities: Entity[]): Entity[] {
    return entities.filter(entity =>
      entity.id !== attacker.id &&
      CombatSystem.isInMeleeRange(attacker, entity)
    );
  }

  canAttack(attacker: Entity, entities: Entity[]): boolean {
    return this.findTargetsInRange(attacker, entities).length > 0;
  }

  calculateDistance(entity1: Entity, entity2: Entity): number {
    return Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) +
      Math.pow(entity1.y - entity2.y, 2)
    );
  }

  calculateGridDistance(entity1: Entity, entity2: Entity): number {
    return Math.max(Math.abs(entity1.x - entity2.x), Math.abs(entity1.y - entity2.y));
  }

  /**
   * Get all available actions for an entity with their valid targets
   * This can be used for action selection UI
   */
  getAvailableActionsWithTargets(entity: Entity, entities: Entity[], tileMap?: TileMap): Array<{action: any, validTargets: any[]}> {
    const availableActions = this.discoverAvailableActions(entity, entities, tileMap);
    return this.findActionsWithValidTargets(availableActions, entity, entities, tileMap);
  }

  /**
   * Get the primary action for quick execution (highest priority action with valid targets)
   */
  getPrimaryAction(entity: Entity, entities: Entity[], tileMap?: TileMap): {action: any, target: any} | null {
    const actionsWithTargets = this.getAvailableActionsWithTargets(entity, entities, tileMap);

    if (actionsWithTargets.length === 0) {
      return null;
    }

    const { selectedAction, selectedTarget } = this.selectBestActionAndTarget(actionsWithTargets, entity, entities);
    return { action: selectedAction, target: selectedTarget };
  }

  /**
   * Show action selection UI for the player to choose an action
   */
  showActionSelection(entity: Entity, entities: Entity[], tileMap?: TileMap): boolean {
    if (!this.actionSelectionUI) {
      this.logger.error('Action selection UI not initialized');
      return false;
    }

    // Get all available actions
    const actionsWithTargets = this.getAvailableActionsWithTargets(entity, entities, tileMap);

    console.log('Entity:', entity.name, entity.isPlayer);
    console.log('Total actionsWithTargets found:', actionsWithTargets.length);
    actionsWithTargets.forEach((actionWithTargets, index) => {
      console.log(`Action ${index + 1}:`, {
        id: actionWithTargets.action.id,
        name: actionWithTargets.action.name,
        category: actionWithTargets.action.category,
        source: actionWithTargets.action.source,
        validTargets: actionWithTargets.validTargets.length
      });
    });

    if (actionsWithTargets.length === 0) {
      this.eventBus.publish({
        type: 'MessageAdded',
        id: generateEventId(),
        timestamp: Date.now(),
        message: "No actions available!",
        category: 'combat'
      });
      return false;
    }

    // Create action options for the UI
    const actionOptions = createActionOptions(actionsWithTargets, entity);

    // Store context for when action is selected
    this.pendingActionContext = {
      entity,
      entities,
      tileMap
    };

    // Show the UI
    this.actionSelectionUI.show(actionOptions);
    return true;
  }

  /**
   * Handle when an action is selected from the UI
   */
  private handleActionSelection(action: any, target: any): void {
    if (!this.pendingActionContext) {
      this.logger.error('No pending action context when handling action selection');
      return;
    }

    const { entity, entities, tileMap } = this.pendingActionContext;
    this.pendingActionContext = null;

    // Execute the selected action
    const result = this.executeAction(action, entity, target, entities, tileMap);

    // Handle entity removal if target was killed
    if (result.success && result.targetKilled && result.target) {
      // Note: Entity removal will be handled by the callback if set, or by the caller
    }

    // Call the callback if set (for turn management, etc.)
    if (this.actionExecutedCallback) {
      this.actionExecutedCallback(result, action);
    }

    // Publish action execution event
    this.eventBus.publish({
      type: 'MessageAdded',
      id: generateEventId(),
      timestamp: Date.now(),
      message: `${entity.name || 'Player'} used ${action.name}`,
      category: 'combat'
    });

    this.logger.debug('Action executed from selection', {
      actionId: action.id,
      actionName: action.name,
      success: result.success,
      targetKilled: result.targetKilled
    });
  }

  /**
   * Handle when action selection is cancelled
   */
  private handleActionSelectionCancel(): void {
    this.pendingActionContext = null;

    this.eventBus.publish({
      type: 'MessageAdded',
      id: generateEventId(),
      timestamp: Date.now(),
      message: "Action cancelled",
      category: 'combat'
    });

    this.logger.debug('Action selection cancelled');
  }

  /**
   * Check if action selection UI is currently visible
   */
  isActionSelectionVisible(): boolean {
    return this.actionSelectionUI?.isShowing() || false;
  }

  /**
   * Close action selection UI if open
   */
  closeActionSelection(): void {
    if (this.actionSelectionUI) {
      this.actionSelectionUI.hide();
      this.pendingActionContext = null;
    }
  }

  // Context for pending action execution
  private pendingActionContext: {
    entity: Entity;
    entities: Entity[];
    tileMap?: TileMap;
  } | null = null;
}