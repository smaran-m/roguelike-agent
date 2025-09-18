import {
  Action,
  ActionContext,
  RequirementType,
  CostType,
  ResourceOpParameters
} from './ActionTypes';

interface SkillCheckParameters {
  skill: string;
  mode: 'dc' | 'contest';
  dc?: number;
  contest?: { againstSkill?: string; radius?: number; anyOrAll?: 'any'|'all' };
  onSuccess?: Effect[];
  onFailure?: Effect[];
}
import { Entity } from '../../types';
import { TileMap } from '../../core/TileMap';
import { EventBus } from '../../core/events/EventBus';
import { ResourceManager } from '../../managers/ResourceManager';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';
import { GameMechanics } from '../../engine/GameMechanics';
import { DiceSystem } from '../dice/DiceSystem';
import { Logger } from '../../utils/Logger';
import { generateEventId } from '../../core/events/GameEvent';
import { Game } from '../../core/Game';

// New effect system types
type CustomEffectType = 'damage' | 'resourceChange' | 'resourceOp' | 'statusEffect' | 'movement' | 'skillCheck' | 'event';

interface Effect {
  type: CustomEffectType;
  target: string;
  parameters: Record<string, any>;
  timing?: string;
}

type EffectResolver = (ctx: ActionContext, eff: Effect) => Promise<void>;
const RESOLVERS: Record<CustomEffectType, EffectResolver> = {} as any;

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
  async executeAction(
    action: Action,
    performer: Entity,
    target: Entity | { x: number; y: number } | null,
    context: ActionContext,
    tileMap?: TileMap
  ): Promise<ActionExecutionResult> {
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

    // Execute effects with new resolver system
    const effectResults = await this.executeEffectsWithResolvers(action, performer, target, context, tileMap);

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

  private async executeEffectsWithResolvers(
    action: Action,
    performer: Entity,
    target: Entity | { x: number; y: number } | null,
    context: ActionContext,
    _tileMap?: TileMap
  ): Promise<{ message: string; targetKilled?: boolean; target?: Entity; effects: string[] }> {
    // Convert ActionEffect to Effect format and execute with resolvers
    const effectMessages: string[] = [];
    let targetKilled = false;
    let affectedTarget: Entity | undefined;

    // Create enhanced context with target information
    const enhancedContext = {
      ...context,
      performer,
      target,
      _tileMap
    };

    for (const actionEffect of action.effects) {
      // Convert to new Effect interface
      const effect: Effect = {
        type: actionEffect.type as CustomEffectType,
        target: actionEffect.target,
        parameters: actionEffect.parameters || {},
        timing: actionEffect.timing
      };

      try {
        const fn = RESOLVERS[effect.type];
        if (!fn) {
          throw new Error(`No resolver for effect type: ${effect.type}`);
        }
        await fn(enhancedContext as any, effect);

        // For now, create a basic message
        effectMessages.push(`${effect.type} effect executed`);
      } catch (error) {
        this.logger.error('Effect execution failed:', error);
        effectMessages.push(`${effect.type} effect failed: ${error}`);
      }
    }

    const mainMessage = effectMessages.length > 0 ? effectMessages[0] : `${action.name} executed`;

    return {
      message: mainMessage,
      targetKilled,
      target: affectedTarget,
      effects: effectMessages
    };
  }



  //
  //   if (attackResult.hit) {
  //     const wasKilled = CombatSystem.applyDamage(targetEntity, attackResult.finalDamage || attackResult.damage);
  //
  //     const damage = attackResult.finalDamage || attackResult.damage;
  //     let message = `${damage} ${damageType} damage`;
  //     if (attackResult.critical) message = `CRITICAL HIT! ${message}`;
  //     if (wasKilled) message += ` - ${targetEntity.name || 'Target'} died!`;
  //
  //     // Publish combat events
  //     this.eventBus.publish({
  //       type: 'DamageDealt',
  //       id: generateEventId(),
  //       timestamp: Date.now(),
  //       attackerId: performer.id,
  //       targetId: targetEntity.id,
  //       damage: damage,
  //       damageType,
  //       targetPosition: { x: targetEntity.x, y: targetEntity.y }
  //     });
  //
  //     if (wasKilled) {
  //       this.eventBus.publish({
  //         type: 'EnemyDied',
  //         id: generateEventId(),
  //         timestamp: Date.now(),
  //         enemyId: targetEntity.id,
  //         position: { x: targetEntity.x, y: targetEntity.y }
  //       });
  //     }
  //
  //     return {
  //       message,
  //       targetKilled: wasKilled,
  //       target: targetEntity
  //     };
  //   } else {
  //     return { message: 'Miss!', target: targetEntity };
  //   }
  // }





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

async function executeDamageEffect(ctx: ActionContext, eff: Effect): Promise<void> {
  // Read parameters
  const amount = eff.parameters.amount || '1d4';
  const damageType = eff.parameters.damageType || 'bludgeoning';
  const attackRoll = eff.parameters.attackRoll || false;
  const abilityType = eff.parameters.abilityType || 'strength';
  const criticalMultiplier = eff.parameters.criticalMultiplier || 2;
  const resourceTarget = eff.parameters.resourceTarget || 'hp';

  // Get performer and target from context
  const performer = (ctx as any).performer as Entity;
  const target = (ctx as any).target as Entity;

  if (!target || !target.id) {
    return; // No valid target
  }

  let isCritical = false;
  let damage = 0;

  // Handle attack roll if required
  if (attackRoll) {
    const attackResult = GameMechanics.rollAttack(performer, target, {
      abilityType: abilityType as any,
      advantage: false,
      disadvantage: false
    });

    // Publish attack roll event using global EventBus
    const eventBus = Game.getGlobalEventBus();
    if (eventBus) {
      eventBus.publish({
        type: 'CheckRolled',
        id: generateEventId(),
        timestamp: Date.now(),
        kind: 'attack',
        performerId: performer.id,
        targetId: target.id,
        roll: attackResult.d20Roll,
        total: attackResult.total,
        dc: target.stats.ac,
        success: attackResult.hit,
        advantage: false,
        disadvantage: false
      });
    }

    if (!attackResult.hit) {
      return;
    }

    isCritical = attackResult.isCritical;
  }

  // Calculate damage
  const abilityModifier = GameMechanics.getModifier(performer.stats[abilityType as keyof typeof performer.stats] as number);
  damage = GameMechanics.calculateDamage(amount, abilityModifier, {
    criticalMultiplier: isCritical ? criticalMultiplier : 1
  });

  // Apply damage with resistances
  let finalDamage = damage;
  if (ResourceManager.applyDamageWithResistances) {
    const world = WorldConfigLoader.getCurrentWorld();
    if (world) {
      finalDamage = ResourceManager.applyDamageWithResistances(target, damage, damageType, world);
    }
  }

  // Modify target resource (subtract damage)
  ResourceManager.modify(target, resourceTarget, -finalDamage);

  // Check if target is defeated
  if (ResourceManager.isAtMinimum(target, resourceTarget)) {
    const eventBus = Game.getGlobalEventBus();
    if (eventBus) {
      eventBus.publish({
        type: 'EntityDied',
        id: generateEventId(),
        timestamp: Date.now(),
        entityId: target.id,
        position: { x: target.x, y: target.y }
      });
    }
  }
}

async function executeResourceOpEffect(ctx: ActionContext, eff: Effect): Promise<void> {
  // Read parameters with ResourceOpParameters interface
  const params = eff.parameters as ResourceOpParameters;
  const resourceId = params.resourceId || 'hp';
  const operation = params.operation;
  const clampToBounds = params.clampToBounds !== false; // Default to true

  // Get target entity from context based on effect target
  let targetEntity: Entity | null = null;
  if (eff.target === 'self') {
    targetEntity = (ctx as any).performer as Entity;
  } else if (eff.target === 'target') {
    targetEntity = (ctx as any).target as Entity;
  }

  if (!targetEntity || !targetEntity.id) {
    return; // No valid target
  }

  // Calculate amount - prefer amountFormula over amount
  let value: number;
  if (params.amountFormula) {
    // Simple formula evaluation - for now just handle dice notation and basic numbers
    // TODO: Replace with Formula.eval if available
    if (params.amountFormula.includes('d')) {
      const diceResult = DiceSystem.rollDice(params.amountFormula);
      value = diceResult.total;
    } else {
      value = parseFloat(params.amountFormula) || 0;
    }
  } else {
    value = params.amount || 0;
  }

  // Get current resource value
  const currentValue = ResourceManager.getCurrentValue(targetEntity, resourceId);
  const resource = ResourceManager.getResource(targetEntity, resourceId);

  if (!resource) {
    // Resource doesn't exist, skip operation
    return;
  }

  let newValue: number;

  // Apply operation
  switch (operation) {
    case 'add':
      newValue = currentValue + value;
      break;
    case 'subtract':
      newValue = currentValue - value;
      break;
    case 'set':
      newValue = value;
      break;
    case 'multiply':
      newValue = currentValue * value;
      break;
    case 'min':
      newValue = Math.min(currentValue, value);
      break;
    case 'max':
      newValue = Math.max(currentValue, value);
      break;
    default:
      return; // Unknown operation
  }

  // Apply bounds clamping if enabled
  if (clampToBounds) {
    if (resource.minimum !== undefined) {
      newValue = Math.max(newValue, resource.minimum);
    }
    if (resource.maximum !== undefined) {
      newValue = Math.min(newValue, resource.maximum);
    }
  }

  // Apply the new value
  ResourceManager.set(targetEntity, resourceId, newValue);
}

async function executeSkillCheckEffect(ctx: ActionContext, eff: Effect): Promise<void> {
  // Read parameters
  const params = eff.parameters as SkillCheckParameters;
  const skill = params.skill;
  const mode = params.mode;

  // Get performer from context
  const performer = (ctx as any).performer as Entity;
  if (!performer || !performer.id) {
    return; // No valid performer
  }

  // Perform skill roll
  const rollResult = GameMechanics.rollSkill(performer, skill, {
    advantage: false, // Could be extended to read from parameters
    disadvantage: false
  });

  let success = false;
  let contestResults: Array<{entity: Entity; roll: number}> = [];

  // Evaluate success based on mode
  if (mode === 'dc') {
    const dc = params.dc || 10;
    success = rollResult.total >= dc;
  } else if (mode === 'contest') {
    // Contest mode - find nearby entities and roll against them
    const contest = params.contest || {};
    const againstSkill = contest.againstSkill || skill;
    const radius = contest.radius || 1;
    const anyOrAll = contest.anyOrAll || 'any';

    // Get nearby entities
    const nearbyEntities = ctx.visibleEntities.filter(entity => {
      if (entity.id === performer.id) return false;
      const distance = GameMechanics.getGridDistance(
        performer.x, performer.y,
        entity.x, entity.y
      );
      return distance <= radius;
    });

    // Roll for each nearby entity
    contestResults = nearbyEntities.map(entity => {
      const entityRoll = GameMechanics.rollSkill(entity, againstSkill, {});
      return { entity, roll: entityRoll.total };
    });

    // Determine success based on anyOrAll
    if (anyOrAll === 'any') {
      success = contestResults.length === 0 || contestResults.some(result => rollResult.total > result.roll);
    } else { // 'all'
      success = contestResults.length === 0 || contestResults.every(result => rollResult.total > result.roll);
    }
  }

  // Publish skill check event using global EventBus
  const eventBus = Game.getGlobalEventBus();
  if (eventBus) {
    eventBus.publish({
      type: 'CheckRolled',
      id: generateEventId(),
      timestamp: Date.now(),
      kind: 'skill',
      performerId: performer.id,
      targetId: undefined,
      roll: rollResult.d20Roll,
      total: rollResult.total,
      dc: mode === 'dc' ? params.dc : undefined,
      success: success,
      advantage: false,
      disadvantage: false
    });
  }

  // Execute conditional effects
  const effectsToExecute = success ? params.onSuccess : params.onFailure;
  if (effectsToExecute) {
    for (const conditionalEffect of effectsToExecute) {
      try {
        const fn = RESOLVERS[conditionalEffect.type];
        if (!fn) {
          throw new Error(`No resolver for effect type: ${conditionalEffect.type}`);
        }
        await fn(ctx, conditionalEffect);
      } catch (error) {
        console.error('Failed to execute conditional effect:', error);
      }
    }
  }
}

// Register the resolvers
RESOLVERS.damage = executeDamageEffect;
RESOLVERS.resourceOp = executeResourceOpEffect;
RESOLVERS.skillCheck = executeSkillCheckEffect;