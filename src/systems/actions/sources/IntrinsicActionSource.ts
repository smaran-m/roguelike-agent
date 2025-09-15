import {
  Action,
  ActionContext,
  IActionSource,
  ActionRequirement,
  RequirementType,
  ActionCategory
} from '../ActionTypes';
import { Logger } from '../../../utils/Logger';
import basicActionsJson from '../../../data/actions/intrinsic/basic-actions.json';

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
      const isValid = this.validateActionRequirements(action, context);

      if (isValid) {
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
      // Load basic actions from the imported JSON file
      this.addActionsFromData(basicActionsJson);

      this.logger.info('Intrinsic actions loaded', {
        totalActions: this.actions.size,
        actions: Array.from(this.actions.keys())
      });
    } catch (error) {
      this.logger.error('Failed to load intrinsic actions', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback: Create essential basic actions if JSON loading fails
      this.createFallbackActions();
    }
  }

  /**
   * Create fallback actions if JSON loading fails
   */
  private createFallbackActions(): void {
    // Create minimal essential actions as fallback
    const basicAttack: Action = {
      id: 'basic_attack',
      name: 'Unarmed Strike',
      description: 'Make a basic melee attack with your fists',
      source: 'intrinsic',
      category: ActionCategory.ATTACK,
      requirements: [
        {
          type: RequirementType.RANGE,
          value: 1,
          comparison: 'lessEqual',
          description: 'Target must be within melee range'
        },
        {
          type: RequirementType.LINE_OF_SIGHT,
          value: 'true',
          description: 'Must be able to see target'
        }
      ],
      costs: [
        {
          type: 'actionPoint' as any,
          amount: 1,
          description: 'Uses your action for this turn'
        }
      ],
      effects: [
        {
          type: 'damage' as any,
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
        type: 'single' as any,
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
    };

    const wait: Action = {
      id: 'wait',
      name: 'Wait',
      description: 'Do nothing and end your turn',
      source: 'intrinsic',
      category: ActionCategory.UTILITY,
      requirements: [],
      costs: [
        {
          type: 'actionPoint' as any,
          amount: 1,
          description: 'Uses your action for this turn'
        }
      ],
      effects: [],
      targeting: {
        type: 'none' as any,
        range: 'self',
        requiresLineOfSight: false,
        validTargets: []
      },
      priority: 1,
      iconGlyph: '⏸️'
    };

    this.actions.set('basic_attack', basicAttack);
    this.actions.set('wait', wait);

    this.logger.warn('Using fallback actions due to JSON loading failure', {
      fallbackActions: Array.from(this.actions.keys())
    });
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