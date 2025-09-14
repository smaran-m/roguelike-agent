import { Entity } from '../../types';
import { GameMode } from '../game-modes/GameModeTypes';
import { TileMap } from '../../core/TileMap';
import { EventBus } from '../../core/events/EventBus';
import { Logger } from '../../utils/Logger';
import {
  Action,
  ActionContext,
  ActionQuery,
  ActionDiscoveryResult,
  ActionCategory,
  IActionSource,
  IActionProvider
} from './ActionTypes';
import { ActionContextBuilder, ActionContextOptions } from './ActionContext';

export class ActionDiscoveryPipeline {
  private strictSources: Map<string, IActionSource> = new Map();
  private genericProviders: Map<string, IActionProvider> = new Map();
  private contextCache: Map<string, { context: ActionContext; timestamp: number }> = new Map();
  private resultCache: Map<string, { result: ActionDiscoveryResult; timestamp: number }> = new Map();

  private readonly CONTEXT_CACHE_TTL = 1000; // 1 second
  private readonly RESULT_CACHE_TTL = 500;   // 0.5 seconds

  constructor(
    private eventBus: EventBus,
    private logger: Logger
  ) {
    this.setupEventHandlers();
    this.logger.info('ActionDiscoveryPipeline initialized');
  }

  private setupEventHandlers(): void {
    // Clear caches when game state changes
    this.eventBus.subscribe('EntityMoved', () => this.clearCaches());
    this.eventBus.subscribe('GameModeChanged', () => this.clearCaches());
    this.eventBus.subscribe('EntityDied', () => this.clearCaches());
    this.eventBus.subscribe('TurnStarted', () => this.clearCaches());
  }

  /**
   * Register a strict action source
   */
  registerSource(source: IActionSource): void {
    this.strictSources.set(source.id, source);
    this.logger.info('Action source registered', {
      sourceId: source.id,
      priority: source.priority
    });
  }

  /**
   * Register a generic action provider
   */
  registerProvider(provider: IActionProvider): void {
    this.genericProviders.set(provider.id, provider);
    this.logger.info('Action provider registered', { providerId: provider.id });
  }

  /**
   * Unregister an action source
   */
  unregisterSource(sourceId: string): boolean {
    const removed = this.strictSources.delete(sourceId);
    if (removed) {
      this.logger.info('Action source unregistered', { sourceId });
    }
    return removed;
  }

  /**
   * Unregister an action provider
   */
  unregisterProvider(providerId: string): boolean {
    const removed = this.genericProviders.delete(providerId);
    if (removed) {
      this.logger.info('Action provider unregistered', { providerId });
    }
    return removed;
  }

  /**
   * Discover all available actions for an entity
   */
  discoverActions(
    entity: Entity,
    gameMode: GameMode,
    allEntities: Entity[],
    tileMap: TileMap,
    options?: ActionDiscoveryOptions
  ): ActionDiscoveryResult {
    const startTime = performance.now();

    // Build or retrieve cached context
    const context = this.buildOrGetContext(entity, gameMode, allEntities, tileMap, options);

    // Check for cached result
    const cacheKey = this.getResultCacheKey(context, options);
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      this.logger.debug('Using cached action discovery result', {
        entityId: entity.id,
        actions: cachedResult.actions.length
      });
      return cachedResult;
    }

    // Discover actions from sources
    const sourceResults: { [source: string]: number } = {};
    const allActions: Action[] = [];

    // Phase 1: Query strict sources (performance-critical)
    const activeSources = this.getActiveSources(context);
    for (const source of activeSources) {
      try {
        const sourceActions = source.getAvailableActions(context);
        allActions.push(...sourceActions);
        sourceResults[source.id] = sourceActions.length;

        this.logger.debug('Actions discovered from strict source', {
          sourceId: source.id,
          actionCount: sourceActions.length
        });
      } catch (error) {
        this.logger.warn('Error discovering actions from source', {
          sourceId: source.id,
          error: error instanceof Error ? error.message : String(error)
        });
        sourceResults[source.id] = 0;
      }
    }

    // Phase 2: Query generic providers (dynamic/rare actions)
    if (!options?.strictSourcesOnly) {
      const query: ActionQuery = {
        context,
        category: options?.category,
        source: options?.sourceFilter,
        maxResults: options?.maxResults
      };

      for (const provider of this.genericProviders.values()) {
        try {
          if (provider.canProvideActions(query)) {
            const providerActions = provider.provideActions(query);
            allActions.push(...providerActions);
            sourceResults[provider.id] = providerActions.length;

            this.logger.debug('Actions discovered from generic provider', {
              providerId: provider.id,
              actionCount: providerActions.length
            });
          }
        } catch (error) {
          this.logger.warn('Error discovering actions from provider', {
            providerId: provider.id,
            error: error instanceof Error ? error.message : String(error)
          });
          sourceResults[provider.id] = 0;
        }
      }
    }

    // Filter and sort actions
    const filteredActions = this.filterActions(allActions, options);
    const sortedActions = this.sortActions(filteredActions);

    // Build result
    const discoveryTime = performance.now() - startTime;
    const result: ActionDiscoveryResult = {
      actions: sortedActions,
      context,
      discoveryTime,
      sourceResults
    };

    // Cache result
    this.cacheResult(cacheKey, result);

    this.logger.debug('Action discovery completed', {
      entityId: entity.id,
      totalActions: result.actions.length,
      discoveryTime: `${discoveryTime.toFixed(2)}ms`,
      sourceResults
    });

    return result;
  }

  /**
   * Discover actions with specific query parameters
   */
  queryActions(
    entity: Entity,
    gameMode: GameMode,
    allEntities: Entity[],
    tileMap: TileMap,
    query: ActionQuery
  ): Action[] {
    const context = query.context || this.buildOrGetContext(entity, gameMode, allEntities, tileMap);
    const fullQuery: ActionQuery = { ...query, context };

    const actions: Action[] = [];

    // Query sources if no source filter or if source filter matches
    for (const source of this.strictSources.values()) {
      if (!fullQuery.source || source.id === fullQuery.source) {
        if (source.canActivate(context)) {
          const sourceActions = source.getAvailableActions(context);
          actions.push(...sourceActions);
        }
      }
    }

    // Query providers
    for (const provider of this.genericProviders.values()) {
      if (!fullQuery.source || provider.id === fullQuery.source) {
        if (provider.canProvideActions(fullQuery)) {
          const providerActions = provider.provideActions(fullQuery);
          actions.push(...providerActions);
        }
      }
    }

    // Apply filters and limits
    let filteredActions = actions;

    if (fullQuery.category) {
      filteredActions = filteredActions.filter(action => action.category === fullQuery.category);
    }

    if (fullQuery.maxResults && filteredActions.length > fullQuery.maxResults) {
      filteredActions = this.sortActions(filteredActions).slice(0, fullQuery.maxResults);
    }

    return filteredActions;
  }

  /**
   * Get list of registered sources and providers
   */
  getRegisteredSources(): Array<{ id: string; type: 'source' | 'provider'; description: string }> {
    const sources: Array<{ id: string; type: 'source' | 'provider'; description: string }> = [];

    for (const source of this.strictSources.values()) {
      sources.push({
        id: source.id,
        type: 'source',
        description: source.getDescription()
      });
    }

    for (const provider of this.genericProviders.values()) {
      sources.push({
        id: provider.id,
        type: 'provider',
        description: provider.getDescription()
      });
    }

    return sources;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.contextCache.clear();
    this.resultCache.clear();
    this.logger.debug('Action discovery caches cleared');
  }

  private buildOrGetContext(
    entity: Entity,
    gameMode: GameMode,
    allEntities: Entity[],
    tileMap: TileMap,
    options?: ActionDiscoveryOptions
  ): ActionContext {
    const contextKey = this.getContextCacheKey(entity, gameMode);
    const cached = this.getCachedContext(contextKey);

    if (cached) {
      return cached;
    }

    const contextOptions: ActionContextOptions = {
      nearbyRange: options?.nearbyRange,
      visibilityRange: options?.visibilityRange,
      combatState: options?.combatState
    };

    const context = ActionContextBuilder.buildContext(
      entity,
      gameMode,
      allEntities,
      tileMap,
      contextOptions
    );

    this.cacheContext(contextKey, context);
    return context;
  }

  private getActiveSources(context: ActionContext): IActionSource[] {
    const activeSources: IActionSource[] = [];

    for (const source of this.strictSources.values()) {
      if (source.canActivate(context)) {
        activeSources.push(source);
      }
    }

    // Sort by priority (higher priority first)
    activeSources.sort((a, b) => b.priority - a.priority);

    return activeSources;
  }

  private filterActions(actions: Action[], options?: ActionDiscoveryOptions): Action[] {
    let filtered = actions;

    if (options?.category) {
      filtered = filtered.filter(action => action.category === options.category);
    }

    if (options?.sourceFilter) {
      filtered = filtered.filter(action => action.source.startsWith(options.sourceFilter!));
    }

    // Remove duplicates by ID (later actions with same ID override earlier ones)
    const uniqueActions = new Map<string, Action>();
    for (const action of filtered) {
      uniqueActions.set(action.id, action);
    }

    return Array.from(uniqueActions.values());
  }

  private sortActions(actions: Action[]): Action[] {
    return actions.sort((a, b) => {
      // Sort by priority (higher first), then by category, then by name
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }

      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }

      return a.name.localeCompare(b.name);
    });
  }

  private getContextCacheKey(entity: Entity, gameMode: GameMode): string {
    return `${entity.id}:${entity.x}:${entity.y}:${gameMode}`;
  }

  private getResultCacheKey(context: ActionContext, options?: ActionDiscoveryOptions): string {
    const optionsKey = options ? JSON.stringify(options) : 'default';
    return `${context.entity.id}:${context.gameMode}:${optionsKey}`;
  }

  private getCachedContext(key: string): ActionContext | null {
    const cached = this.contextCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CONTEXT_CACHE_TTL) {
      return cached.context;
    }
    this.contextCache.delete(key);
    return null;
  }

  private cacheContext(key: string, context: ActionContext): void {
    this.contextCache.set(key, {
      context,
      timestamp: Date.now()
    });
  }

  private getCachedResult(key: string): ActionDiscoveryResult | null {
    const cached = this.resultCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.RESULT_CACHE_TTL) {
      return cached.result;
    }
    this.resultCache.delete(key);
    return null;
  }

  private cacheResult(key: string, result: ActionDiscoveryResult): void {
    this.resultCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearCaches();
    this.strictSources.clear();
    this.genericProviders.clear();
    this.logger.info('ActionDiscoveryPipeline destroyed');
  }
}

export interface ActionDiscoveryOptions {
  category?: ActionCategory;
  sourceFilter?: string; // Filter by source ID prefix
  maxResults?: number;
  nearbyRange?: number;
  visibilityRange?: number;
  strictSourcesOnly?: boolean; // Skip generic providers
  combatState?: {
    actionsRemaining: number;
    movementRemaining: number;
    hasUsedReaction: boolean;
  };
}