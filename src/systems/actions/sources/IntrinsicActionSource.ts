import {
  Action,
  ActionContext,
  IActionSource,
  ActionRequirement,
  RequirementType,
  ActionCategory
} from '../ActionTypes';
import { Logger } from '../../../utils/Logger';

export class IntrinsicActionSource implements IActionSource {
  readonly id = 'intrinsic';
  readonly priority = 100; // High priority for basic actions

  private actions: Map<string, Action> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.loadIntrinsicActions();
  }

  canActivate(_context: ActionContext): boolean {
    // Intrinsic actions are always available
    return true;
  }

  getAvailableActions(context: ActionContext): Action[] {
    const availableActions: Action[] = [];

    for (const action of this.actions.values()) {
      if (this.validateActionRequirements(action, context)) {
        availableActions.push(action);
      }
    }

    this.logger.debug('Intrinsic actions discovered', {
      entityId: context.entity.id,
      gameMode: context.gameMode,
      availableActions: availableActions.length,
      totalActions: this.actions.size
    });

    return availableActions;
  }

  getDescription(): string {
    return 'Provides basic actions available to all entities (move, wait, basic attack, etc.)';
  }

  /**
   * Load intrinsic actions from JSON definitions
   */
  private loadIntrinsicActions(): void {
    try {
      // Load basic actions
      const basicActions = this.loadActionFile('/src/data/actions/intrinsic/basic-actions.json');
      this.addActionsFromData(basicActions);

      // Load exploration actions
      const explorationActions = this.loadActionFile('/src/data/actions/intrinsic/exploration-actions.json');
      this.addActionsFromData(explorationActions);

      this.logger.info('Intrinsic actions loaded', {
        totalActions: this.actions.size,
        actions: Array.from(this.actions.keys())
      });
    } catch (error) {
      this.logger.error('Failed to load intrinsic actions', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private loadActionFile(relativePath: string): any {
    // In a real implementation, this would use dynamic import or fetch
    // For now, we'll create the actions programmatically
    if (relativePath.includes('basic-actions.json')) {
      return {
        move: {
          id: 'move',
          name: 'Move',
          description: 'Move to an adjacent walkable tile',
          source: 'intrinsic',
          category: 'movement',
          requirements: [
            {
              type: 'tileProperty',
              target: 'walkable',
              value: true,
              comparison: 'equals',
              description: 'Target tile must be walkable'
            },
            {
              type: 'range',
              value: 1,
              comparison: 'lessEqual',
              description: 'Target must be adjacent'
            }
          ],
          costs: [
            {
              type: 'movement',
              amount: 5,
              description: '5 feet of movement'
            }
          ],
          effects: [
            {
              type: 'movement',
              target: 'self',
              parameters: {
                distance: 1,
                direction: 'toward'
              },
              description: 'Move to target location',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: 'single',
            range: 1,
            requiresLineOfSight: false,
            validTargets: [
              {
                type: 'tile',
                criteria: {
                  isWalkable: true
                }
              }
            ]
          },
          priority: 100,
          iconGlyph: '👣'
        },
        wait: {
          id: 'wait',
          name: 'Wait',
          description: 'Do nothing and end your turn',
          source: 'intrinsic',
          category: 'utility',
          requirements: [],
          costs: [
            {
              type: 'actionPoint',
              amount: 1,
              description: 'Uses your action for this turn'
            }
          ],
          effects: [
            {
              type: 'resourceChange',
              target: 'self',
              parameters: {
                resourceId: 'actionPoints',
                amount: 0
              },
              description: 'End turn without taking action',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: 'none',
            range: 'self',
            requiresLineOfSight: false,
            validTargets: []
          },
          priority: 1,
          iconGlyph: '⏸️'
        },
        basic_attack: {
          id: 'basic_attack',
          name: 'Unarmed Strike',
          description: 'Make a basic melee attack with your fists',
          source: 'intrinsic',
          category: 'attack',
          requirements: [
            {
              type: 'range',
              value: 1,
              comparison: 'lessEqual',
              description: 'Target must be within melee range'
            },
            {
              type: 'lineOfSight',
              value: true,
              description: 'Must be able to see target'
            }
          ],
          costs: [
            {
              type: 'actionPoint',
              amount: 1,
              description: 'Uses your action for this turn'
            }
          ],
          effects: [
            {
              type: 'damage',
              target: 'target',
              parameters: {
                amount: '1d4',
                damageType: 'bludgeoning',
                attackRoll: true
              },
              description: 'Deal bludgeoning damage',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: 'single',
            range: 1,
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
          priority: 80,
          iconGlyph: '👊'
        },
        dodge: {
          id: 'dodge',
          name: 'Dodge',
          description: 'Focus entirely on avoiding attacks until your next turn',
          source: 'intrinsic',
          category: 'defense',
          requirements: [
            {
              type: 'gameMode',
              value: 'combat',
              description: 'Only available in combat'
            }
          ],
          costs: [
            {
              type: 'actionPoint',
              amount: 1,
              description: 'Uses your action for this turn'
            }
          ],
          effects: [
            {
              type: 'statusEffect',
              target: 'self',
              parameters: {
                statusId: 'dodging',
                duration: 1
              },
              description: 'Gain advantage on Dexterity saving throws and attackers have disadvantage',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: 'self',
            range: 'self',
            requiresLineOfSight: false,
            validTargets: []
          },
          priority: 60,
          iconGlyph: '🛡️'
        },
        dash: {
          id: 'dash',
          name: 'Dash',
          description: 'Double your movement speed for this turn',
          source: 'intrinsic',
          category: 'movement',
          requirements: [
            {
              type: 'gameMode',
              value: 'combat',
              description: 'Only available in combat'
            }
          ],
          costs: [
            {
              type: 'actionPoint',
              amount: 1,
              description: 'Uses your action for this turn'
            }
          ],
          effects: [
            {
              type: 'resourceChange',
              target: 'self',
              parameters: {
                resourceId: 'movement',
                amount: 30,
                operation: 'add'
              },
              description: 'Gain additional movement equal to your speed',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: 'self',
            range: 'self',
            requiresLineOfSight: false,
            validTargets: []
          },
          priority: 70,
          iconGlyph: '💨'
        }
      };
    } else if (relativePath.includes('exploration-actions.json')) {
      return {
        examine: {
          id: 'examine',
          name: 'Examine',
          description: 'Look closely at something to learn more about it',
          source: 'intrinsic',
          category: 'utility',
          requirements: [
            {
              type: 'range',
              value: 3,
              comparison: 'lessEqual',
              description: 'Target must be within examination range'
            },
            {
              type: 'lineOfSight',
              value: true,
              description: 'Must be able to see target'
            }
          ],
          costs: [],
          effects: [
            {
              type: 'itemManipulation',
              target: 'target',
              parameters: {
                action: 'examine',
                revealProperties: true
              },
              description: 'Reveal detailed information about the target',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: 'single',
            range: 3,
            requiresLineOfSight: true,
            validTargets: [
              {
                type: 'entity',
                criteria: {}
              },
              {
                type: 'tile',
                criteria: {}
              },
              {
                type: 'item',
                criteria: {}
              }
            ]
          },
          priority: 20,
          iconGlyph: '🔍'
        },
        search: {
          id: 'search',
          name: 'Search',
          description: 'Carefully search the area for hidden objects or secrets',
          source: 'intrinsic',
          category: 'utility',
          requirements: [
            {
              type: 'gameMode',
              value: 'exploration',
              description: 'Only available during exploration'
            }
          ],
          costs: [
            {
              type: 'time',
              amount: 10,
              description: 'Takes 10 seconds to search thoroughly'
            }
          ],
          effects: [
            {
              type: 'environmentChange',
              target: 'area',
              parameters: {
                radius: 1,
                shape: 'circle',
                revealHidden: true,
                searchDC: 15
              },
              description: 'Reveal hidden objects, traps, or secrets in the area',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: 'area',
            range: 1,
            requiresLineOfSight: false,
            validTargets: [
              {
                type: 'tile',
                criteria: {}
              }
            ],
            areaOfEffect: {
              shape: 'circle',
              size: 1,
              origin: 'performer'
            }
          },
          priority: 30,
          iconGlyph: '🕵️'
        },
        rest: {
          id: 'rest',
          name: 'Rest',
          description: 'Take a short rest to recover some health and resources',
          source: 'intrinsic',
          category: 'utility',
          requirements: [
            {
              type: 'gameMode',
              value: 'exploration',
              description: 'Only available during exploration'
            }
          ],
          costs: [
            {
              type: 'time',
              amount: 600,
              description: 'Takes 10 minutes to rest'
            }
          ],
          effects: [
            {
              type: 'healing',
              target: 'self',
              parameters: {
                amount: '1d4+1',
                resourceId: 'hp'
              },
              description: 'Recover a small amount of health',
              timing: 'immediate'
            },
            {
              type: 'resourceChange',
              target: 'self',
              parameters: {
                resourceId: 'mana',
                amount: '1d4',
                operation: 'add'
              },
              description: 'Recover a small amount of mana',
              timing: 'immediate'
            }
          ],
          targeting: {
            type: 'self',
            range: 'self',
            requiresLineOfSight: false,
            validTargets: []
          },
          priority: 10,
          iconGlyph: '😴'
        }
      };
    }

    return {};
  }

  private addActionsFromData(actionData: any): void {
    for (const [_key, actionDef] of Object.entries(actionData)) {
      const action = this.createActionFromDefinition(actionDef as any);
      this.actions.set(action.id, action);
    }
  }

  private createActionFromDefinition(def: any): Action {
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      source: def.source,
      category: def.category as ActionCategory,
      requirements: def.requirements || [],
      costs: def.costs || [],
      effects: def.effects || [],
      targeting: def.targeting,
      priority: def.priority || 50,
      iconGlyph: def.iconGlyph
    };
  }

  private validateActionRequirements(action: Action, context: ActionContext): boolean {
    for (const requirement of action.requirements) {
      if (!this.validateRequirement(requirement, context)) {
        return false;
      }
    }
    return true;
  }

  private validateRequirement(requirement: ActionRequirement, context: ActionContext): boolean {
    switch (requirement.type as RequirementType) {
      case RequirementType.GAME_MODE:
        return context.gameMode === requirement.value;

      case RequirementType.RESOURCE:
        if (!requirement.target) return false;
        const resource = context.resources[requirement.target];
        if (!resource) return false;
        return this.compareValues(resource.current, requirement.value!, requirement.comparison || 'greaterEqual');

      case RequirementType.RANGE:
        // Range validation will be handled during targeting
        return true;

      case RequirementType.LINE_OF_SIGHT:
        // Line of sight validation will be handled during targeting
        return true;

      case RequirementType.EQUIPMENT:
        if (!requirement.target) return false;
        return context.equippedItems.has(requirement.target);

      case RequirementType.TILE_PROPERTY:
        // Tile property validation will be handled during targeting
        return true;

      case RequirementType.ENTITY_STATE:
        // Entity state validation will be handled during targeting
        return true;

      case RequirementType.WORLD_CONDITION:
        // World condition validation - placeholder for future implementation
        return true;

      default:
        this.logger.warn('Unknown requirement type', { type: requirement.type });
        return false;
    }
  }

  private compareValues(
    actual: number,
    expected: string | number,
    comparison: string
  ): boolean {
    const expectedValue = typeof expected === 'string' ? parseFloat(expected) : expected;

    switch (comparison) {
      case 'equals': return actual === expectedValue;
      case 'greater': return actual > expectedValue;
      case 'less': return actual < expectedValue;
      case 'greaterEqual': return actual >= expectedValue;
      case 'lessEqual': return actual <= expectedValue;
      default: return false;
    }
  }

  /**
   * Get a specific action by ID (for testing or direct access)
   */
  getAction(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Get all loaded actions (for debugging)
   */
  getAllActions(): Action[] {
    return Array.from(this.actions.values());
  }
}