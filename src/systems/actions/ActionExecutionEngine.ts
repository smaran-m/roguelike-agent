import {
  Action,
  ActionContext,
  ActionEffect,
  RequirementType,
  CostType,
  EffectType
} from './ActionTypes';
import { Entity } from '../../types';
import { TileMap } from '../../core/TileMap';
import { EventBus } from '../../core/events/EventBus';
import { ResourceManager } from '../../managers/ResourceManager';
import { CombatSystem } from '../combat/CombatSystem';
import { GameMechanics } from '../../engine/GameMechanics';
import { DiceSystem } from '../dice/DiceSystem';
import { Logger } from '../../utils/Logger';
import { generateEventId } from '../../core/events/GameEvent';

export interface ActionExecutionResult {
  success: boolean;
  message: string;
  targetKilled?: boolean;
  target?: Entity;
  effects?: string[];
}

/**
 * Generic action execution engine that handles any action from the action discovery system
 * Replaces hardcoded combat logic with data-driven action execution
 */
export class ActionExecutionEngine {
  constructor(
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  /**
   * Execute an action with validation and effect resolution
   */
  executeAction(
    action: Action,
    performer: Entity,
    target: Entity | { x: number; y: number } | null,
    context: ActionContext,
    tileMap?: TileMap
  ): ActionExecutionResult {
    this.logger.debug('Executing action', {
      actionId: action.id,
      performerId: performer.id,
      targetType: target ? (target as Entity).id ? 'entity' : 'position' : 'none'
    });

    // Validate requirements
    const requirementCheck = this.validateRequirements(action, performer, target, context);
    if (!requirementCheck.valid) {
      return {
        success: false,
        message: requirementCheck.message
      };
    }

    // Apply costs
    const costResult = this.applyCosts(action, performer);
    if (!costResult.success) {
      return {
        success: false,
        message: costResult.message
      };
    }

    // Execute effects
    const effectResults = this.executeEffects(action, performer, target, context, tileMap);

    // Publish events for UI updates
    this.eventBus.publish({
      type: 'MessageAdded',
      id: generateEventId(),
      timestamp: Date.now(),
      message: `${action.name} executed successfully`,
      category: 'combat'
    });

    return {
      success: true,
      message: effectResults.message,
      targetKilled: effectResults.targetKilled,
      target: effectResults.target,
      effects: effectResults.effects
    };
  }

  private validateRequirements(
    action: Action,
    performer: Entity,
    target: Entity | { x: number; y: number } | null,
    _context: ActionContext
  ): { valid: boolean; message: string } {
    for (const requirement of action.requirements) {
      switch (requirement.type) {
        case RequirementType.RANGE:
          if (target && (target as Entity).id) {
            const targetEntity = target as Entity;
            const requiredRange = typeof requirement.value === 'number' ? requirement.value : 1;

            // Use grid distance for melee (range 1), Euclidean for ranged
            const distance = requiredRange <= 1
              ? Math.max(Math.abs(performer.x - targetEntity.x), Math.abs(performer.y - targetEntity.y))
              : GameMechanics.getDistance(performer, targetEntity);

            if (requirement.comparison === 'lessEqual' && distance > requiredRange) {
              return { valid: false, message: `Target too far away (${distance} > ${requiredRange})` };
            }
          }
          break;

        case RequirementType.RESOURCE:
          if (requirement.target && typeof requirement.value === 'number') {
            const currentValue = ResourceManager.getCurrentValue(performer, requirement.target);
            if (currentValue < requirement.value) {
              return { valid: false, message: `Not enough ${requirement.target} (${currentValue}/${requirement.value})` };
            }
          }
          break;

        case RequirementType.LINE_OF_SIGHT:
          // Basic line of sight check - could be enhanced with actual LOS calculation
          if (target && (target as Entity).id && requirement.value === 'true') {
            // For now, assume LOS is always valid if within range
            // In full implementation, this would use LineOfSight system
          }
          break;
      }
    }

    return { valid: true, message: '' };
  }

  private applyCosts(action: Action, performer: Entity): { success: boolean; message: string } {
    for (const cost of action.costs) {
      switch (cost.type) {
        case CostType.RESOURCE:
          if (cost.resource) {
            const amount = this.resolveAmount(cost.amount);
            const currentValue = ResourceManager.getCurrentValue(performer, cost.resource);

            if (currentValue < amount) {
              return { success: false, message: `Not enough ${cost.resource} (${currentValue}/${amount})` };
            }

            ResourceManager.modify(performer, cost.resource, -amount);
          }
          break;

        case CostType.ACTION_POINT:
          // Action point system would be implemented here
          // For now, just log the cost
          this.logger.debug('Action point cost applied', { amount: cost.amount });
          break;
      }
    }

    return { success: true, message: '' };
  }

  private executeEffects(
    action: Action,
    performer: Entity,
    target: Entity | { x: number; y: number } | null,
    _context: ActionContext,
    _tileMap?: TileMap
  ): { message: string; targetKilled?: boolean; target?: Entity; effects: string[] } {
    const effectMessages: string[] = [];
    let targetKilled = false;
    let affectedTarget: Entity | undefined;

    for (const effect of action.effects) {
      const result = this.executeEffect(effect, performer, target, _context, _tileMap);
      if (result.message) effectMessages.push(result.message);
      if (result.targetKilled) targetKilled = true;
      if (result.target) affectedTarget = result.target;
    }

    const mainMessage = effectMessages.length > 0 ? effectMessages[0] : `${action.name} executed`;

    return {
      message: mainMessage,
      targetKilled,
      target: affectedTarget,
      effects: effectMessages
    };
  }

  private executeEffect(
    effect: ActionEffect,
    performer: Entity,
    target: Entity | { x: number; y: number } | null,
    _context: ActionContext,
    tileMap?: TileMap
  ): { message: string; targetKilled?: boolean; target?: Entity } {
    switch (effect.type) {
      case EffectType.DAMAGE:
        return this.executeDamageEffect(effect, performer, target);

      case EffectType.HEALING:
        return this.executeHealingEffect(effect, performer, target);

      case EffectType.RESOURCE_CHANGE:
        return this.executeResourceChangeEffect(effect, performer, target);

      case EffectType.MOVEMENT:
        return this.executeMovementEffect(effect, performer, target, tileMap);

      default:
        this.logger.warn('Unhandled effect type', { effectType: effect.type });
        return { message: `${effect.description}` };
    }
  }

  private executeDamageEffect(
    effect: ActionEffect,
    performer: Entity,
    target: Entity | { x: number; y: number } | null
  ): { message: string; targetKilled?: boolean; target?: Entity } {
    if (!target || !(target as Entity).id) {
      return { message: 'No valid target for damage' };
    }

    const targetEntity = target as Entity;
    const damageString = effect.parameters.amount || '1'; // Keep as string for dice notation
    const damageType = effect.parameters.damageType || 'bludgeoning';

    // Use existing combat system for damage calculation (expects dice string)
    const attackResult = CombatSystem.meleeAttack(performer, targetEntity, damageString, damageType);

    if (attackResult.hit) {
      const wasKilled = CombatSystem.applyDamage(targetEntity, attackResult.finalDamage || attackResult.damage);

      const damage = attackResult.finalDamage || attackResult.damage;
      let message = `${damage} ${damageType} damage`;
      if (attackResult.critical) message = `CRITICAL HIT! ${message}`;
      if (wasKilled) message += ` - ${targetEntity.name || 'Target'} died!`;

      // Publish combat events
      this.eventBus.publish({
        type: 'DamageDealt',
        id: generateEventId(),
        timestamp: Date.now(),
        attackerId: performer.id,
        targetId: targetEntity.id,
        damage: damage,
        damageType,
        targetPosition: { x: targetEntity.x, y: targetEntity.y }
      });

      if (wasKilled) {
        this.eventBus.publish({
          type: 'EnemyDied',
          id: generateEventId(),
          timestamp: Date.now(),
          enemyId: targetEntity.id,
          position: { x: targetEntity.x, y: targetEntity.y }
        });
      }

      return {
        message,
        targetKilled: wasKilled,
        target: targetEntity
      };
    } else {
      return { message: 'Miss!', target: targetEntity };
    }
  }

  private executeHealingEffect(
    effect: ActionEffect,
    performer: Entity,
    target: Entity | { x: number; y: number } | null
  ): { message: string; target?: Entity } {
    const targetEntity = this.resolveEffectTarget(effect, performer, target);
    if (!targetEntity) return { message: 'No valid target for healing' };

    const amount = this.resolveAmount(effect.parameters.amount || '1');
    const resourceId = effect.parameters.resourceId || 'hp';

    ResourceManager.modify(targetEntity, resourceId, amount);

    return {
      message: `Healed ${amount} ${resourceId}`,
      target: targetEntity
    };
  }

  private executeResourceChangeEffect(
    effect: ActionEffect,
    performer: Entity,
    target: Entity | { x: number; y: number } | null
  ): { message: string; target?: Entity } {
    const targetEntity = this.resolveEffectTarget(effect, performer, target);
    if (!targetEntity) return { message: 'No valid target for resource change' };

    const amount = this.resolveAmount(effect.parameters.amount || '0');
    const resourceId = effect.parameters.resourceId || 'hp';
    const operation = effect.parameters.operation || 'add';

    if (operation === 'add') {
      ResourceManager.modify(targetEntity, resourceId, amount);
    } else if (operation === 'set') {
      ResourceManager.set(targetEntity, resourceId, amount);
    }

    return {
      message: `${resourceId} ${operation === 'add' ? 'changed by' : 'set to'} ${amount}`,
      target: targetEntity
    };
  }

  private executeMovementEffect(
    effect: ActionEffect,
    performer: Entity,
    target: Entity | { x: number; y: number } | null,
    _tileMap?: TileMap
  ): { message: string; target?: Entity } {
    // Basic movement effect - could be enhanced with pathfinding
    const targetEntity = this.resolveEffectTarget(effect, performer, target);
    if (!targetEntity) return { message: 'No valid target for movement' };

    const distance = effect.parameters.distance || 1;
    const direction = effect.parameters.direction || 'toward';

    // Simple movement logic - in full implementation would use MovementSystem
    this.logger.debug('Movement effect', { distance, direction, target: targetEntity.id });

    return {
      message: `Moved ${distance} tiles ${direction}`,
      target: targetEntity
    };
  }

  private resolveEffectTarget(
    effect: ActionEffect,
    performer: Entity,
    target: Entity | { x: number; y: number } | null
  ): Entity | null {
    switch (effect.target) {
      case 'self':
        return performer;
      case 'target':
        return target && (target as Entity).id ? target as Entity : null;
      default:
        return null;
    }
  }

  private resolveAmount(amount: string | number): number {
    if (typeof amount === 'number') {
      return amount;
    }

    // Handle dice notation
    if (typeof amount === 'string' && amount.includes('d')) {
      const diceResult = DiceSystem.rollDice(amount);
      return diceResult.total;
    }

    // Handle simple string numbers
    const parsed = parseInt(amount.toString(), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}