import {
  Action,
  ActionQuery,
  IActionProvider
} from '../ActionTypes';
import { Logger } from '../../../utils/Logger';

interface StatusEffectTurnEffect {
  timing: string; // Allow any string to support JSON imports
  type: string;
  target: string;
  parameters: { [key: string]: any };
  description: string;
}

interface StatusEffectDefinition {
  id: string;
  name: string;
  description: string;
  duration: number;
  iconGlyph: string;
  turnEffects?: StatusEffectTurnEffect[];
  grantedActions?: any[]; // Use any[] to allow JSON import, will be cast to Action[] internally
}

interface StatusEffectCollection {
  [statusId: string]: StatusEffectDefinition;
}

/**
 * JSON-driven status effect action provider
 * Reads status effect definitions from JSON and provides actions based on active effects
 */
export class JsonStatusEffectProvider implements IActionProvider {
  readonly id = 'json_status_effects';

  private statusEffects: StatusEffectCollection;
  private logger: Logger;

  constructor(statusEffectsData: StatusEffectCollection, logger: Logger) {
    this.statusEffects = statusEffectsData;
    this.logger = logger;
    this.logger.info('JsonStatusEffectProvider initialized', {
      statusEffectCount: Object.keys(this.statusEffects).length
    });
  }

  canProvideActions(query: ActionQuery): boolean {
    // Check if the entity has any active status effects that grant actions
    const hasActiveStatusEffects = this.hasActiveStatusEffects(query.context.entity);

    if (!hasActiveStatusEffects) {
      return false;
    }

    // Check if any of the active status effects have granted actions
    return this.getActiveStatusEffectIds(query.context.entity).some(statusId => {
      const statusDef = this.statusEffects[statusId];
      return statusDef && statusDef.grantedActions && statusDef.grantedActions.length > 0;
    });
  }

  provideActions(query: ActionQuery): Action[] {
    const actions: Action[] = [];
    const activeStatusIds = this.getActiveStatusEffectIds(query.context.entity);

    for (const statusId of activeStatusIds) {
      const statusDef = this.statusEffects[statusId];
      if (statusDef && statusDef.grantedActions) {
        // Add all granted actions from this status effect (cast to Action[])
        actions.push(...(statusDef.grantedActions as Action[]));

        this.logger.debug('Status effect actions provided', {
          entityId: query.context.entity.id,
          statusEffect: statusId,
          actionCount: statusDef.grantedActions.length
        });
      }
    }

    return actions;
  }

  getDescription(): string {
    return 'Provides actions granted by active status effects from JSON configuration';
  }

  /**
   * Get all status effect definitions
   */
  getStatusEffectDefinitions(): StatusEffectCollection {
    return this.statusEffects;
  }

  /**
   * Get a specific status effect definition
   */
  getStatusEffectDefinition(statusId: string): StatusEffectDefinition | null {
    return this.statusEffects[statusId] || null;
  }

  /**
   * Check if entity has any active status effects
   */
  private hasActiveStatusEffects(entity: any): boolean {
    // Check if entity has any temporary effects
    if (entity.stats && entity.stats.statusEffects) {
      return entity.stats.statusEffects.length > 0;
    }

    // Check for temporary modifiers that indicate status effects
    if (entity.stats && entity.stats.resources) {
      for (const resource of Object.values(entity.stats.resources)) {
        const res = resource as any;
        if (res.changeRate && res.changeRate !== 0) {
          return true; // Passive regeneration/degeneration indicates status effects
        }
      }
    }

    // Additional status effect detection logic can be added here
    return false;
  }

  /**
   * Get list of active status effect IDs for an entity
   */
  private getActiveStatusEffectIds(entity: any): string[] {
    const activeIds: string[] = [];

    // Check entity's status effects array
    if (entity.stats && entity.stats.statusEffects) {
      for (const effect of entity.stats.statusEffects) {
        if (typeof effect === 'string') {
          activeIds.push(effect);
        } else if (effect && effect.id) {
          activeIds.push(effect.id);
        }
      }
    }

    // For demonstration purposes, simulate some status effects based on entity properties
    // In a real implementation, this would be replaced with proper status effect tracking
    const entityHash = this.simpleHash(entity.id);

    // Simulate different status effects based on entity hash
    if (entityHash % 10 === 0) activeIds.push('blessed');
    if (entityHash % 13 === 0) activeIds.push('poisoned');
    if (entityHash % 17 === 0) activeIds.push('haste');
    if (entityHash % 19 === 0) activeIds.push('invisible');
    if (entityHash % 23 === 0) activeIds.push('burning');

    return activeIds.filter(id => id in this.statusEffects);
  }

  /**
   * Simple hash function for demonstration purposes
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Update status effects from new JSON data
   */
  updateStatusEffects(statusEffectsData: StatusEffectCollection): void {
    this.statusEffects = statusEffectsData;
    this.logger.info('Status effects updated', {
      statusEffectCount: Object.keys(this.statusEffects).length
    });
  }
}