import { Entity } from '../../types';
import { EventBus } from '../../core/events/EventBus';
import { Logger } from '../../utils/Logger';
import { DiceSystem } from '../dice/DiceSystem';
import { generateEventId } from '../../core/events/GameEvent';
import { 
  InitiativeRoll, 
  TurnData, 
  CombatState,
  ActionEconomyState,
  DEFAULT_ACTION_ECONOMY
} from './CombatTypes';

export class TurnOrderManager {
  private combatState: CombatState;
  private turnData: Map<string, TurnData> = new Map();
  private actionEconomy: Map<string, ActionEconomyState> = new Map();

  constructor(
    private eventBus: EventBus,
    private logger: Logger
  ) {
    this.combatState = {
      isActive: false,
      participants: [],
      turnOrder: [],
      currentTurnIndex: 0,
      currentTurn: 1,
      combatStartTime: 0
    };
    this.setupEventHandlers();
    this.logger.info('TurnOrderManager initialized');
  }

  private setupEventHandlers(): void {
    // Listen for combat start to initialize turns
    this.eventBus.subscribe('CombatStarted', () => {
      this.logger.info('Received CombatStarted event, turn order already initialized');
    });

    // Listen for entity deaths to remove from turn order
    this.eventBus.subscribe('EnemyDied', (event: any) => {
      this.removeFromCombat(event.enemyId);
    });

    // Listen for combat end to cleanup
    this.eventBus.subscribe('CombatEnded', () => {
      this.endCombat();
    });
  }

  startCombat(participants: Entity[]): void {
    if (this.combatState.isActive) {
      this.logger.warn('Attempted to start combat while combat is already active');
      return;
    }

    this.logger.info('Starting combat with participants', {
      count: participants.length,
      participants: participants.map(p => ({ id: p.id, name: p.name }))
    });

    // Roll initiative for all participants
    const initiativeRolls = this.rollInitiative(participants);
    
    // Sort by initiative (highest first)
    initiativeRolls.sort((a, b) => b.initiative - a.initiative);

    this.combatState = {
      isActive: true,
      participants: participants.map(p => p.id),
      turnOrder: initiativeRolls,
      currentTurnIndex: 0,
      currentTurn: 1,
      combatStartTime: Date.now()
    };

    // Initialize turn data and action economy for all participants
    for (const participant of participants) {
      this.turnData.set(participant.id, {
        entityId: participant.id,
        initiative: initiativeRolls.find(r => r.entityId === participant.id)?.initiative || 0,
        turnNumber: 0,
        actionsRemaining: DEFAULT_ACTION_ECONOMY.actions,
        movementRemaining: DEFAULT_ACTION_ECONOMY.movement,
        hasUsedReaction: false
      });

      this.actionEconomy.set(participant.id, { ...DEFAULT_ACTION_ECONOMY });
    }

    // Publish combat started event
    this.eventBus.publish({
      type: 'CombatStarted',
      id: generateEventId(),
      timestamp: Date.now(),
      participants: this.combatState.participants,
      turnOrder: initiativeRolls.map(roll => ({
        entityId: roll.entityId,
        initiative: roll.initiative
      }))
    });

    // Start the first turn (don't increment - start at index 0 with highest initiative)
    const currentInitiative = this.combatState.turnOrder[this.combatState.currentTurnIndex];
    const entityId = currentInitiative.entityId;

    // Reset action economy for the new turn
    this.resetActionEconomy(entityId);

    // Update turn data
    const turnData = this.turnData.get(entityId);
    if (turnData) {
      turnData.turnNumber = this.combatState.currentTurn;
      turnData.actionsRemaining = DEFAULT_ACTION_ECONOMY.actions;
      turnData.movementRemaining = DEFAULT_ACTION_ECONOMY.movement;
      turnData.hasUsedReaction = false;
    }

    // Publish turn started event
    this.eventBus.publish({
      type: 'TurnStarted',
      id: generateEventId(),
      timestamp: Date.now(),
      entityId,
      turnNumber: this.combatState.currentTurn,
      initiative: currentInitiative.initiative
    });

    this.logger.debug('First turn started', {
      entityId,
      turnNumber: this.combatState.currentTurn,
      initiative: currentInitiative.initiative
    });
  }

  endCombat(): void {
    if (!this.combatState.isActive) {
      return;
    }

    this.logger.info('Ending combat', {
      duration: Date.now() - this.combatState.combatStartTime,
      totalTurns: this.combatState.currentTurn
    });

    this.combatState.isActive = false;
    this.turnData.clear();
    this.actionEconomy.clear();
  }

  getCurrentTurn(): { entityId: string; turnNumber: number } | null {
    if (!this.combatState.isActive || this.combatState.turnOrder.length === 0) {
      return null;
    }

    const currentInitiative = this.combatState.turnOrder[this.combatState.currentTurnIndex];
    return {
      entityId: currentInitiative.entityId,
      turnNumber: this.combatState.currentTurn
    };
  }

  getTurnOrder(): InitiativeRoll[] {
    return [...this.combatState.turnOrder];
  }

  endCurrentTurn(): void {
    if (!this.combatState.isActive) {
      this.logger.warn('Attempted to end turn while combat is not active');
      return;
    }

    const currentTurn = this.getCurrentTurn();
    if (!currentTurn) {
      this.logger.warn('No current turn to end');
      return;
    }

    // Publish turn ended event
    this.eventBus.publish({
      type: 'TurnEnded',
      id: generateEventId(),
      timestamp: Date.now(),
      entityId: currentTurn.entityId,
      turnNumber: currentTurn.turnNumber
    });

    this.logger.debug('Turn ended', {
      entityId: currentTurn.entityId,
      turnNumber: currentTurn.turnNumber
    });

    this.startNextTurn();
  }

  private startNextTurn(): void {
    if (!this.combatState.isActive) {
      return;
    }

    // Move to next participant
    this.combatState.currentTurnIndex = 
      (this.combatState.currentTurnIndex + 1) % this.combatState.turnOrder.length;

    // If we've cycled through all participants, increment turn number
    if (this.combatState.currentTurnIndex === 0) {
      this.combatState.currentTurn++;
    }

    const currentInitiative = this.combatState.turnOrder[this.combatState.currentTurnIndex];
    const entityId = currentInitiative.entityId;

    // Reset action economy for the new turn
    this.resetActionEconomy(entityId);

    // Update turn data
    const turnData = this.turnData.get(entityId);
    if (turnData) {
      turnData.turnNumber = this.combatState.currentTurn;
      turnData.actionsRemaining = DEFAULT_ACTION_ECONOMY.actions;
      turnData.movementRemaining = DEFAULT_ACTION_ECONOMY.movement;
      turnData.hasUsedReaction = false;
    }

    // Publish turn started event
    this.eventBus.publish({
      type: 'TurnStarted',
      id: generateEventId(),
      timestamp: Date.now(),
      entityId,
      turnNumber: this.combatState.currentTurn,
      initiative: currentInitiative.initiative
    });

    this.logger.debug('Turn started', {
      entityId,
      turnNumber: this.combatState.currentTurn,
      initiative: currentInitiative.initiative
    });
  }

  private rollInitiative(participants: Entity[]): InitiativeRoll[] {
    const rolls: InitiativeRoll[] = [];

    for (const participant of participants) {
      const dexModifier = this.calculateAbilityModifier(participant.stats.dexterity);
      const rollResult = DiceSystem.rollDice('1d20');
      const initiative = rollResult.total + dexModifier;

      rolls.push({
        entityId: participant.id,
        initiative,
        dexterityModifier: dexModifier,
        roll: rollResult.total
      });

      this.logger.debug('Initiative rolled', {
        entity: participant.name,
        roll: rollResult.total,
        dexModifier,
        totalInitiative: initiative
      });
    }

    return rolls;
  }

  private calculateAbilityModifier(abilityScore: number): number {
    return Math.floor((abilityScore - 10) / 2);
  }

  private removeFromCombat(entityId: string): void {
    if (!this.combatState.isActive) {
      return;
    }

    // Find the entity in turn order
    const turnIndex = this.combatState.turnOrder.findIndex(roll => roll.entityId === entityId);
    if (turnIndex === -1) {
      return; // Entity not in combat
    }

    this.logger.debug('Removing entity from combat', { entityId, turnIndex });

    // Remove from turn order
    this.combatState.turnOrder.splice(turnIndex, 1);
    
    // Remove from participants
    this.combatState.participants = this.combatState.participants.filter(id => id !== entityId);
    
    // Clean up data
    this.turnData.delete(entityId);
    this.actionEconomy.delete(entityId);

    // Adjust current turn index if necessary
    if (turnIndex <= this.combatState.currentTurnIndex && this.combatState.currentTurnIndex > 0) {
      this.combatState.currentTurnIndex--;
    }

    // If this was the current turn, start the next turn
    if (turnIndex === this.combatState.currentTurnIndex) {
      // Adjust index to account for removal
      if (this.combatState.currentTurnIndex >= this.combatState.turnOrder.length) {
        this.combatState.currentTurnIndex = 0;
        this.combatState.currentTurn++;
      }
      
      if (this.combatState.turnOrder.length > 0) {
        this.startNextTurn();
      }
    }
  }

  private resetActionEconomy(entityId: string): void {
    this.actionEconomy.set(entityId, { ...DEFAULT_ACTION_ECONOMY });
  }

  // Public methods for action economy management
  getActionEconomy(entityId: string): ActionEconomyState | null {
    return this.actionEconomy.get(entityId) || null;
  }

  consumeAction(entityId: string, actionType: 'action' | 'bonus' | 'reaction'): boolean {
    const economy = this.actionEconomy.get(entityId);
    if (!economy) {
      return false;
    }

    switch (actionType) {
      case 'action':
        if (economy.actions > 0) {
          economy.actions--;
          return true;
        }
        break;
      case 'bonus':
        if (economy.bonusActions > 0) {
          economy.bonusActions--;
          return true;
        }
        break;
      case 'reaction':
        if (economy.reactions > 0) {
          economy.reactions--;
          return true;
        }
        break;
    }

    return false;
  }

  consumeMovement(entityId: string, movementCost: number): boolean {
    const economy = this.actionEconomy.get(entityId);
    if (!economy) {
      return false;
    }

    if (economy.movement >= movementCost) {
      economy.movement -= movementCost;
      return true;
    }

    return false;
  }

  isActive(): boolean {
    return this.combatState.isActive;
  }

  getCombatState(): Readonly<CombatState> {
    return { ...this.combatState };
  }

  destroy(): void {
    this.endCombat();
    this.logger.info('TurnOrderManager destroyed');
  }
}