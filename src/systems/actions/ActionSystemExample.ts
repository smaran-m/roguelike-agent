import { Entity } from '../../types';
import { TileMap } from '../../core/TileMap';
import { EventBus } from '../../core/events/EventBus';
import { Logger } from '../../utils/Logger';
import { ActionCategory } from './ActionTypes';

import { ActionDiscoveryPipeline } from './ActionDiscoveryPipeline';
import { IntrinsicActionSource } from './sources/IntrinsicActionSource';
import { EquipmentActionSource } from './sources/EquipmentActionSource';
import { JsonTileInteractionSource } from './sources/JsonTileInteractionSource';
import { ActionProviderRegistry } from './providers/ActionProviderRegistry';
import { JsonStatusEffectProvider } from './providers/JsonStatusEffectProvider';

// Import JSON data
import statusEffectsData from '../../data/status-effects.json';
import tileInteractionsData from '../../data/tile-interactions.json';

/**
 * Example integration showing how to set up and use the Action Discovery System
 * This demonstrates Task 3.1 integration with existing systems
 */
export class ActionSystemExample {
  private actionPipeline: ActionDiscoveryPipeline;
  private providerRegistry: ActionProviderRegistry;

  constructor(
    private eventBus: EventBus,
    private logger: Logger
  ) {
    // Initialize the action discovery pipeline
    this.actionPipeline = new ActionDiscoveryPipeline(eventBus, logger);
    this.providerRegistry = new ActionProviderRegistry(eventBus, logger);

    this.setupActionSystem();
  }

  private setupActionSystem(): void {
    // Register strict action sources (performance-critical, 90% of actions)
    this.actionPipeline.registerSource(new IntrinsicActionSource(this.logger));
    this.actionPipeline.registerSource(new EquipmentActionSource(this.logger));
    this.actionPipeline.registerSource(new JsonTileInteractionSource(tileInteractionsData, this.logger));

    // Register generic action providers (dynamic/rare actions, 10% of actions)
    this.providerRegistry.register(new JsonStatusEffectProvider(statusEffectsData, this.logger));

    // Enable dynamic provider registration via EventBus
    this.providerRegistry.enableDynamicRegistration();

    this.logger.info('Action system initialized', {
      sources: this.actionPipeline.getRegisteredSources().filter(s => s.type === 'source').length,
      providers: this.providerRegistry.getProviderCount()
    });
  }

  /**
   * Example: Discover actions for a player in exploration mode
   */
  async demonstrateExplorationActions(): Promise<void> {
    this.logger.info('=== Exploration Mode Action Discovery Demo ===');

    // Create example entities and world
    const player = this.createExamplePlayer();
    const enemies = this.createExampleEnemies();
    const allEntities = [player, ...enemies];
    const tileMap = new TileMap(20, 20);

    // Discover actions in exploration mode
    const result = this.actionPipeline.discoverActions(
      player,
      'exploration',
      allEntities,
      tileMap
    );

    this.logger.info('Exploration actions discovered', {
      totalActions: result.actions.length,
      discoveryTime: `${result.discoveryTime.toFixed(2)}ms`,
      sourceBreakdown: result.sourceResults
    });

    // Display discovered actions by category
    const actionsByCategory = this.groupActionsByCategory(result.actions);
    for (const [category, actions] of Object.entries(actionsByCategory)) {
      this.logger.info(`${category.toUpperCase()} actions:`, {
        count: actions.length,
        actions: actions.map(a => ({ name: a.name, source: a.source, priority: a.priority }))
      });
    }
  }

  /**
   * Example: Discover actions for a player in combat mode
   */
  async demonstrateCombatActions(): Promise<void> {
    this.logger.info('=== Combat Mode Action Discovery Demo ===');

    // Create combat scenario
    const player = this.createExamplePlayer();
    const enemies = this.createExampleEnemies();
    const allEntities = [player, ...enemies];
    const tileMap = new TileMap(20, 20);

    // Add combat state to options
    const result = this.actionPipeline.discoverActions(
      player,
      'combat',
      allEntities,
      tileMap,
      {
        combatState: {
          actionsRemaining: 1,
          movementRemaining: 30,
          hasUsedReaction: false
        }
      }
    );

    this.logger.info('Combat actions discovered', {
      totalActions: result.actions.length,
      discoveryTime: `${result.discoveryTime.toFixed(2)}ms`,
      sourceBreakdown: result.sourceResults
    });

    // Show highest priority actions (what player would likely see first)
    const topActions = result.actions
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 8);

    this.logger.info('Top priority combat actions:', {
      actions: topActions.map(a => ({
        name: a.name,
        description: a.description,
        category: a.category,
        source: a.source,
        priority: a.priority,
        icon: a.iconGlyph
      }))
    });
  }

  /**
   * Example: Query specific action categories
   */
  async demonstrateTargetedQueries(): Promise<void> {
    this.logger.info('=== Targeted Action Query Demo ===');

    const player = this.createExamplePlayer();
    const enemies = this.createExampleEnemies();
    const allEntities = [player, ...enemies];
    const tileMap = new TileMap(20, 20);

    // Query only attack actions
    const attackActions = this.actionPipeline.queryActions(
      player,
      'combat',
      allEntities,
      tileMap,
      {
        context: undefined!, // Will be built automatically
        category: ActionCategory.ATTACK,
        maxResults: 5
      }
    );

    this.logger.info('Attack actions only:', {
      count: attackActions.length,
      actions: attackActions.map(a => ({ name: a.name, source: a.source }))
    });

    // Query equipment-specific actions
    const equipmentActions = this.actionPipeline.queryActions(
      player,
      'exploration',
      allEntities,
      tileMap,
      {
        context: undefined!,
        sourceFilter: 'equipment',
        maxResults: 10
      }
    );

    this.logger.info('Equipment actions only:', {
      count: equipmentActions.length,
      actions: equipmentActions.map(a => ({ name: a.name, source: a.source }))
    });
  }

  /**
   * Example: Performance testing with caching
   */
  async demonstratePerformance(): Promise<void> {
    this.logger.info('=== Performance Demo ===');

    const player = this.createExamplePlayer();
    const enemies = this.createExampleEnemies();
    const allEntities = [player, ...enemies];
    const tileMap = new TileMap(20, 20);

    // First discovery (cold cache)
    const startTime1 = performance.now();
    const result1 = this.actionPipeline.discoverActions(player, 'combat', allEntities, tileMap);
    const time1 = performance.now() - startTime1;

    // Second discovery (warm cache)
    const startTime2 = performance.now();
    const result2 = this.actionPipeline.discoverActions(player, 'combat', allEntities, tileMap);
    const time2 = performance.now() - startTime2;

    this.logger.info('Performance comparison:', {
      coldCache: {
        time: `${time1.toFixed(2)}ms`,
        actions: result1.actions.length,
        pipelineTime: `${result1.discoveryTime.toFixed(2)}ms`
      },
      warmCache: {
        time: `${time2.toFixed(2)}ms`,
        actions: result2.actions.length,
        pipelineTime: `${result2.discoveryTime.toFixed(2)}ms`
      },
      speedup: `${(time1 / time2).toFixed(1)}x faster`
    });
  }

  /**
   * Example: Dynamic provider registration
   */
  async demonstrateDynamicProviders(): Promise<void> {
    this.logger.info('=== Dynamic Provider Demo ===');

    // Register a provider via EventBus
    this.eventBus.publish({
      type: 'RegisterActionProvider',
      id: 'test-provider-registration',
      timestamp: Date.now(),
      provider: {
        id: 'test_provider',
        canProvideActions: () => true,
        provideActions: (_query: any) => [{
          id: 'test_action',
          name: 'Test Dynamic Action',
          description: 'This action was registered dynamically',
          source: 'test_provider',
          category: 'utility',
          requirements: [],
          costs: [],
          effects: [],
          targeting: {
            type: 'self',
            range: 'self',
            requiresLineOfSight: false,
            validTargets: []
          },
          priority: 1
        }],
        getDescription: () => 'Test provider registered via EventBus'
      }
    });

    // Verify it was registered
    const providerInfo = this.providerRegistry.getAllProviderInfo();
    this.logger.info('Registered providers:', {
      count: providerInfo.length,
      providers: providerInfo
    });
  }

  /**
   * Run all demonstrations
   */
  async runAllDemonstrations(): Promise<void> {
    await this.demonstrateExplorationActions();
    await this.demonstrateCombatActions();
    await this.demonstrateTargetedQueries();
    await this.demonstratePerformance();
    await this.demonstrateDynamicProviders();

    this.logger.info('=== Action Discovery System Demo Complete ===');
  }

  // Helper methods for creating test data
  private createExamplePlayer(): Entity {
    return {
      id: 'player-1',
      x: 10,
      y: 10,
      glyph: '@',
      color: 0xFFFFFF,
      name: 'Player',
      isEmoji: false,
      isPlayer: true,
      stats: {
        ac: 14,
        strength: 14,
        dexterity: 16,
        constitution: 13,
        intelligence: 12,
        wisdom: 15,
        charisma: 11,
        proficiencyBonus: 2,
        level: 1,
        resources: {
          hp: { id: 'hp', current: 12, maximum: 12, displayName: 'Health', color: '#FF0000' },
          mana: { id: 'mana', current: 8, maximum: 8, displayName: 'Mana', color: '#0000FF' }
        }
      }
    };
  }

  private createExampleEnemies(): Entity[] {
    return [
      {
        id: 'enemy-1',
        x: 8,
        y: 8,
        glyph: 'g',
        color: 0x00FF00,
        name: 'Goblin',
        isEmoji: false,
        stats: {
          ac: 15,
          strength: 12,
          dexterity: 14,
          constitution: 11,
          intelligence: 8,
          wisdom: 10,
          charisma: 8,
          proficiencyBonus: 2,
          level: 1,
          resources: {
            hp: { id: 'hp', current: 7, maximum: 7, displayName: 'Health', color: '#FF0000' }
          }
        }
      },
      {
        id: 'enemy-2',
        x: 12,
        y: 12,
        glyph: 'o',
        color: 0xFF8000,
        name: 'Orc',
        isEmoji: false,
        stats: {
          ac: 13,
          strength: 16,
          dexterity: 12,
          constitution: 16,
          intelligence: 7,
          wisdom: 11,
          charisma: 10,
          proficiencyBonus: 2,
          level: 1,
          resources: {
            hp: { id: 'hp', current: 15, maximum: 15, displayName: 'Health', color: '#FF0000' }
          }
        }
      }
    ];
  }

  private groupActionsByCategory(actions: any[]): { [category: string]: any[] } {
    return actions.reduce((groups, action) => {
      const category = action.category || 'utility';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(action);
      return groups;
    }, {});
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.actionPipeline.destroy();
    this.providerRegistry.destroy();
    this.logger.info('ActionSystemExample destroyed');
  }
}