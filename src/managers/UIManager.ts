import { Entity } from '../types';
import { EventBus } from '../core/events/EventBus';
import { MessageAddedEvent, PlayerUpdatedEvent, UIRefreshEvent, EventUnsubscriber } from '../core/events/GameEvent';
import { Logger } from '../utils/Logger';

export class UIManager {
  private messages: string[] = [];
  private currentPlayer?: Entity;
  private eventUnsubscribers: EventUnsubscriber[] = [];
  private uiUpdateCallbacks: Array<() => void> = [];

  constructor(private eventBus: EventBus, private logger: Logger) {
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions(): void {
    this.logger.debug('UIManager: Setting up event subscriptions');

    // Subscribe to MessageAdded events
    const messageAddedUnsub = this.eventBus.subscribe('MessageAdded', (event) => {
      const messageEvent = event as MessageAddedEvent;
      this.logger.debug('UIManager: MessageAdded event received', { 
        message: messageEvent.message, 
        category: messageEvent.category 
      });
      this.addMessage(messageEvent.message);
    });
    this.eventUnsubscribers.push(messageAddedUnsub);

    // Subscribe to PlayerUpdated events
    const playerUpdatedUnsub = this.eventBus.subscribe('PlayerUpdated', (event) => {
      const playerEvent = event as PlayerUpdatedEvent;
      this.logger.debug('UIManager: PlayerUpdated event received', { 
        playerId: playerEvent.player.id,
        position: { x: playerEvent.player.x, y: playerEvent.player.y }
      });
      this.setCurrentPlayer(playerEvent.player);
    });
    this.eventUnsubscribers.push(playerUpdatedUnsub);

    // Subscribe to UIRefresh events
    const uiRefreshUnsub = this.eventBus.subscribe('UIRefresh', (event) => {
      const refreshEvent = event as UIRefreshEvent;
      this.logger.debug('UIManager: UIRefresh event received', { reason: refreshEvent.reason });
      this.triggerUIUpdate();
    });
    this.eventUnsubscribers.push(uiRefreshUnsub);

    this.logger.debug('UIManager: Event subscriptions completed');
  }

  // Add a message to the UI state
  private addMessage(message: string): void {
    this.logger.debug(`UIManager: Adding message: "${message}"`);
    this.messages.push(message);
    
    // Keep only the last 30 messages
    if (this.messages.length > 30) {
      this.messages = this.messages.slice(-30);
    }
    
    this.triggerUIUpdate();
  }

  // Set the current player entity
  private setCurrentPlayer(player: Entity): void {
    this.currentPlayer = { ...player }; // Store copy to prevent external modification
    this.triggerUIUpdate();
  }

  // Register a callback to be called when UI needs updating
  public onUIUpdate(callback: () => void): void {
    this.uiUpdateCallbacks.push(callback);
  }

  // Trigger all registered UI update callbacks
  private triggerUIUpdate(): void {
    this.logger.debug('UIManager: Triggering UI update', { 
      callbackCount: this.uiUpdateCallbacks.length,
      messageCount: this.messages.length
    });
    
    for (const callback of this.uiUpdateCallbacks) {
      try {
        callback();
      } catch (error) {
        this.logger.error('UIManager: Error in UI update callback', { error });
      }
    }
  }

  // Public getters for UI state (read-only)
  public getMessages(): readonly string[] {
    return [...this.messages]; // Return copy to prevent external modification
  }

  public getCurrentPlayer(): Entity | undefined {
    return this.currentPlayer ? { ...this.currentPlayer } : undefined; // Return copy
  }

  // Public method to manually trigger player update
  public updatePlayer(player: Entity): void {
    this.setCurrentPlayer(player);
  }

  // Public method to manually add message (for direct calls if needed)
  public addMessageDirect(message: string): void {
    this.addMessage(message);
  }

  // Cleanup method
  public destroy(): void {
    this.logger.debug('UIManager: Cleaning up event subscriptions');
    
    for (const unsubscriber of this.eventUnsubscribers) {
      unsubscriber();
    }
    this.eventUnsubscribers.length = 0;
    this.uiUpdateCallbacks.length = 0;
    this.messages.length = 0;
  }
}