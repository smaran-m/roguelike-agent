import { EventBus } from '../../../core/events/EventBus';
import { Logger } from '../../../utils/Logger';
import { generateEventId } from '../../../core/events/GameEvent';
import {
  Action,
  ActionQuery,
  IActionProvider
} from '../ActionTypes';

export class ActionProviderRegistry {
  private providers: Map<string, IActionProvider> = new Map();

  constructor(
    private eventBus: EventBus,
    private logger: Logger
  ) {
    this.setupEventHandlers();
    this.logger.info('ActionProviderRegistry initialized');
  }

  private setupEventHandlers(): void {
    // Listen for provider registration events
    this.eventBus.subscribe('ActionProviderRegistered', (event: any) => {
      this.logger.debug('Action provider registered via event', { providerId: event.providerId });
    });

    this.eventBus.subscribe('ActionProviderUnregistered', (event: any) => {
      this.logger.debug('Action provider unregistered via event', { providerId: event.providerId });
    });
  }

  /**
   * Register a new action provider
   */
  register(provider: IActionProvider): void {
    if (this.providers.has(provider.id)) {
      this.logger.warn('Action provider with same ID already registered, replacing', {
        providerId: provider.id
      });
    }

    this.providers.set(provider.id, provider);

    // Publish registration event
    this.eventBus.publish({
      type: 'ActionProviderRegistered',
      id: generateEventId(),
      timestamp: Date.now(),
      providerId: provider.id,
      description: provider.getDescription()
    });

    this.logger.info('Action provider registered', {
      providerId: provider.id,
      totalProviders: this.providers.size
    });
  }

  /**
   * Unregister an action provider
   */
  unregister(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) {
      this.logger.warn('Attempted to unregister non-existent provider', { providerId });
      return false;
    }

    this.providers.delete(providerId);

    // Publish unregistration event
    this.eventBus.publish({
      type: 'ActionProviderUnregistered',
      id: generateEventId(),
      timestamp: Date.now(),
      providerId
    });

    this.logger.info('Action provider unregistered', {
      providerId,
      totalProviders: this.providers.size
    });

    return true;
  }

  /**
   * Query all providers for actions
   */
  queryAll(query: ActionQuery): Action[] {
    const allActions: Action[] = [];
    const startTime = performance.now();

    for (const provider of this.providers.values()) {
      try {
        if (provider.canProvideActions(query)) {
          const providerActions = provider.provideActions(query);
          allActions.push(...providerActions);

          this.logger.debug('Actions provided', {
            providerId: provider.id,
            actionCount: providerActions.length
          });
        }
      } catch (error) {
        this.logger.error('Error querying action provider', {
          providerId: provider.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const queryTime = performance.now() - startTime;
    this.logger.debug('Provider query completed', {
      totalProviders: this.providers.size,
      totalActions: allActions.length,
      queryTime: `${queryTime.toFixed(2)}ms`
    });

    return allActions;
  }

  /**
   * Query a specific provider
   */
  queryProvider(providerId: string, query: ActionQuery): Action[] {
    const provider = this.providers.get(providerId);
    if (!provider) {
      this.logger.warn('Attempted to query non-existent provider', { providerId });
      return [];
    }

    try {
      if (provider.canProvideActions(query)) {
        return provider.provideActions(query);
      }
    } catch (error) {
      this.logger.error('Error querying specific provider', {
        providerId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return [];
  }

  /**
   * Get all registered provider IDs
   */
  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider information
   */
  getProviderInfo(providerId: string): { id: string; description: string } | null {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return null;
    }

    return {
      id: provider.id,
      description: provider.getDescription()
    };
  }

  /**
   * Get all provider information
   */
  getAllProviderInfo(): Array<{ id: string; description: string }> {
    return Array.from(this.providers.values()).map(provider => ({
      id: provider.id,
      description: provider.getDescription()
    }));
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Clear all providers
   */
  clear(): void {
    const providerIds = Array.from(this.providers.keys());
    this.providers.clear();

    for (const providerId of providerIds) {
      this.eventBus.publish({
        type: 'ActionProviderUnregistered',
        id: generateEventId(),
        timestamp: Date.now(),
        providerId
      });
    }

    this.logger.info('All action providers cleared');
  }

  /**
   * Dynamic provider registration via EventBus
   * This allows other systems to register providers at runtime
   */
  enableDynamicRegistration(): void {
    this.eventBus.subscribe('RegisterActionProvider', (event: any) => {
      if (event.provider && typeof event.provider === 'object' &&
          'id' in event.provider && 'provideActions' in event.provider) {
        this.register(event.provider as IActionProvider);
      } else {
        this.logger.warn('Invalid provider registration event', { event });
      }
    });

    this.eventBus.subscribe('UnregisterActionProvider', (event: any) => {
      if (event.providerId && typeof event.providerId === 'string') {
        this.unregister(event.providerId);
      } else {
        this.logger.warn('Invalid provider unregistration event', { event });
      }
    });

    this.logger.info('Dynamic action provider registration enabled');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear();
    this.logger.info('ActionProviderRegistry destroyed');
  }
}