import {
  Action,
  ActionContext,
  IActionSource,
  ActionCategory,
  TargetingType,
  EffectType,
  RequirementType,
  CostType
} from '../ActionTypes';
import { Item, WeaponType, ResourceOperation } from '../../../types';
import { Logger } from '../../../utils/Logger';

export class EquipmentActionSource implements IActionSource {
  readonly id = 'equipment';
  readonly priority = 90; // High priority, slightly lower than intrinsic

  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  canActivate(context: ActionContext): boolean {
    // Available if entity has any equipped items
    return context.equippedItems.size > 0;
  }

  getAvailableActions(context: ActionContext): Action[] {
    const availableActions: Action[] = [];

    for (const [slotId, item] of context.equippedItems.entries()) {
      const itemActions = this.getActionsForItem(item, slotId, context);
      availableActions.push(...itemActions);
    }

    this.logger.debug('Equipment actions discovered', {
      entityId: context.entity.id,
      equippedItems: context.equippedItems.size,
      availableActions: availableActions.length
    });

    return availableActions;
  }

  getDescription(): string {
    return 'Provides actions from equipped weapons, armor, and other items';
  }

  private getActionsForItem(item: Item, slotId: string, context: ActionContext): Action[] {
    const actions: Action[] = [];

    // Generate weapon attack actions
    if (item.type === 'weapon' && item.damage) {
      const weaponAction = this.createWeaponAttackAction(item, slotId, context);
      if (weaponAction) {
        actions.push(weaponAction);
      }
    }

    // Generate actions from item abilities
    if (item.abilities && item.abilities.length > 0) {
      for (let i = 0; i < item.abilities.length; i++) {
        const ability = item.abilities[i];
        const abilityAction = this.createAbilityAction(item, slotId, ability, i, context);
        if (abilityAction) {
          actions.push(abilityAction);
        }
      }
    }

    return actions;
  }

  private createWeaponAttackAction(item: Item, slotId: string, _context: ActionContext): Action | null {
    if (!item.damage || !item.damageType) {
      return null;
    }

    // Determine range based on weapon type
    let range = 1; // Default melee range
    if (item.weaponType === WeaponType.RANGED) {
      range = 8; // Ranged weapons have longer range
    } else if (item.weaponType === WeaponType.MAGIC) {
      range = 6; // Magic weapons have medium range
    }

    const actionId = `weapon_attack_${slotId}`;
    const action: Action = {
      id: actionId,
      name: `Attack with ${item.name}`,
      description: `Make an attack with your ${item.name} (${item.damage} ${item.damageType} damage)`,
      source: `equipment:${item.id}`,
      category: ActionCategory.ATTACK,
      requirements: [
        {
          type: RequirementType.RANGE,
          value: range,
          comparison: 'lessEqual',
          description: `Target must be within ${range} ${range === 1 ? 'tile' : 'tiles'}`
        },
        {
          type: RequirementType.LINE_OF_SIGHT,
          value: 'true',
          description: 'Must be able to see target'
        }
      ],
      costs: [
        {
          type: CostType.ACTION_POINT,
          amount: 1,
          description: 'Uses your action for this turn'
        }
      ],
      effects: [
        {
          type: EffectType.DAMAGE,
          target: 'target',
          parameters: {
            amount: item.damage,
            damageType: item.damageType
          },
          description: `Deal ${item.damage} ${item.damageType} damage`,
          timing: 'immediate'
        }
      ],
      targeting: {
        type: TargetingType.SINGLE,
        range,
        requiresLineOfSight: true,
        validTargets: [
          {
            type: 'entity',
            criteria: {
              isAlive: true
            }
          }
        ]
      },
      priority: 85,
      iconGlyph: item.glyph
    };

    // Add weapon-specific abilities/properties
    if (item.abilities && item.abilities.includes('Versatile')) {
      action.description += ' (Can be used one-handed or two-handed)';
    }

    if (item.abilities && item.abilities.includes('Finesse')) {
      action.description += ' (Uses Dexterity for attack and damage)';
    }

    if (item.abilities && item.abilities.includes('Heavy')) {
      action.requirements.push({
        type: RequirementType.ENTITY_STATE,
        target: 'strength',
        value: 13,
        comparison: 'greaterEqual',
        description: 'Requires adequate strength to wield effectively'
      });
    }

    // Apply status effects if the weapon has them
    if (item.statusEffects && item.statusEffects.length > 0) {
      for (const statusEffect of item.statusEffects) {
        action.effects.push({
          type: EffectType.STATUS_EFFECT,
          target: 'target',
          parameters: {
            statusId: statusEffect,
            duration: 3, // Default duration
            probability: 0.25 // 25% chance to apply
          },
          description: `May inflict ${statusEffect}`,
          timing: 'onHit'
        });
      }
    }

    return action;
  }

  private createAbilityAction(
    item: Item,
    slotId: string,
    ability: string | ResourceOperation,
    abilityIndex: number,
    context: ActionContext
  ): Action | null {
    // Handle resource operations (like healing potions)
    if (typeof ability === 'object' && 'operation' in ability) {
      return this.createResourceOperationAction(item, slotId, ability, abilityIndex);
    }

    // Handle string abilities (like weapon properties or active abilities)
    if (typeof ability === 'string') {
      return this.createStringAbilityAction(item, slotId, ability, abilityIndex, context);
    }

    return null;
  }

  private createResourceOperationAction(
    item: Item,
    slotId: string,
    operation: ResourceOperation,
    abilityIndex: number
  ): Action {
    const actionId = `item_ability_${slotId}_${abilityIndex}`;

    let actionName = 'Use Item';
    let description = `Use ${item.name}`;
    let category = ActionCategory.ITEM;

    // Customize based on operation type
    if (operation.operation === 'modify' && operation.resource === 'hp') {
      actionName = `Drink ${item.name}`;
      description = `Restore health by drinking ${item.name}`;
      category = ActionCategory.UTILITY;
    } else if (operation.operation === 'modify' && operation.resource === 'mana') {
      actionName = `Drink ${item.name}`;
      description = `Restore mana by drinking ${item.name}`;
      category = ActionCategory.UTILITY;
    }

    const action: Action = {
      id: actionId,
      name: actionName,
      description,
      source: `equipment:${item.id}`,
      category,
      requirements: [],
      costs: [
        {
          type: CostType.ITEM_CHARGE,
          amount: 1,
          description: `Consumes the ${item.name}`
        }
      ],
      effects: [
        {
          type: operation.operation === 'modify' ? EffectType.RESOURCE_CHANGE : EffectType.RESOURCE_CHANGE,
          target: 'self',
          parameters: {
            resourceId: operation.resource,
            amount: operation.amount,
            operation: operation.operation
          },
          description: `${operation.operation} ${operation.resource} by ${operation.amount}`,
          timing: 'immediate'
        }
      ],
      targeting: {
        type: TargetingType.SELF,
        range: 'self',
        requiresLineOfSight: false,
        validTargets: []
      },
      priority: 70,
      iconGlyph: item.glyph
    };

    return action;
  }

  private createStringAbilityAction(
    item: Item,
    slotId: string,
    ability: string,
    abilityIndex: number,
    _context: ActionContext
  ): Action | null {
    const actionId = `item_ability_${slotId}_${abilityIndex}`;

    // Skip passive abilities that don't create actions
    const passiveAbilities = [
      'Versatile', 'Finesse', 'Light', 'Heavy', 'Two-Handed',
      'Ammunition', 'Thrown', 'Arcane Focus'
    ];

    if (passiveAbilities.includes(ability)) {
      return null;
    }

    // Create actions for active abilities
    switch (ability) {
      case 'Light Source':
        return {
          id: actionId,
          name: 'Toggle Light',
          description: `Toggle the light from your ${item.name}`,
          source: `equipment:${item.id}`,
          category: ActionCategory.UTILITY,
          requirements: [],
          costs: [],
          effects: [
            {
              type: EffectType.ENVIRONMENT_CHANGE,
              target: 'environment',
              parameters: {
                lightRadius: 3,
                toggle: true
              },
              description: 'Provide light in a 3-tile radius',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: TargetingType.SELF,
            range: 'self',
            requiresLineOfSight: false,
            validTargets: []
          },
          priority: 40,
          iconGlyph: item.glyph
        };

      case 'Lock Picking':
        return {
          id: actionId,
          name: 'Pick Lock',
          description: `Use your ${item.name} to pick a lock`,
          source: `equipment:${item.id}`,
          category: ActionCategory.UTILITY,
          requirements: [
            {
              type: RequirementType.RANGE,
              value: 1,
              comparison: 'lessEqual',
              description: 'Must be adjacent to the lock'
            }
          ],
          costs: [
            {
              type: CostType.TIME,
              amount: 30,
              description: 'Takes time to pick the lock'
            }
          ],
          effects: [
            {
              type: EffectType.ENVIRONMENT_CHANGE,
              target: 'target',
              parameters: {
                unlockDC: 15,
                skill: 'lockpicking'
              },
              description: 'Attempt to unlock the target',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: TargetingType.SINGLE,
            range: 1,
            requiresLineOfSight: true,
            validTargets: [
              {
                type: 'tile',
                criteria: {
                  hasProperty: 'locked'
                }
              }
            ]
          },
          priority: 50,
          iconGlyph: item.glyph
        };

      case 'Climbing':
        return {
          id: actionId,
          name: 'Climb',
          description: `Use your ${item.name} to climb`,
          source: `equipment:${item.id}`,
          category: ActionCategory.MOVEMENT,
          requirements: [
            {
              type: RequirementType.RANGE,
              value: 1,
              comparison: 'lessEqual',
              description: 'Must be adjacent to climbable surface'
            }
          ],
          costs: [
            {
              type: CostType.MOVEMENT,
              amount: 10,
              description: 'Extra movement cost for climbing'
            }
          ],
          effects: [
            {
              type: EffectType.MOVEMENT,
              target: 'self',
              parameters: {
                distance: 1,
                direction: 'toward',
                climbingMode: true
              },
              description: 'Climb to target location',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: TargetingType.SINGLE,
            range: 1,
            requiresLineOfSight: true,
            validTargets: [
              {
                type: 'tile',
                criteria: {
                  hasProperty: 'climbable'
                }
              }
            ]
          },
          priority: 60,
          iconGlyph: item.glyph
        };

      default:
        // Generic ability action
        return {
          id: actionId,
          name: ability,
          description: `Use ${ability} from your ${item.name}`,
          source: `equipment:${item.id}`,
          category: ActionCategory.UTILITY,
          requirements: [],
          costs: [
            {
              type: CostType.ACTION_POINT,
              amount: 1,
              description: 'Uses your action for this turn'
            }
          ],
          effects: [
            {
              type: EffectType.STATUS_EFFECT,
              target: 'self',
              parameters: {
                statusId: ability.toLowerCase().replace(' ', '_'),
                duration: 1
              },
              description: `Gain the benefit of ${ability}`,
              timing: 'immediate'
            }
          ],
          targeting: {
            type: TargetingType.SELF,
            range: 'self',
            requiresLineOfSight: false,
            validTargets: []
          },
          priority: 30,
          iconGlyph: item.glyph
        };
    }
  }
}