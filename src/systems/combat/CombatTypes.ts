export interface InitiativeRoll {
  entityId: string;
  initiative: number;
  dexterityModifier: number;
  roll: number;
}

export interface TurnData {
  entityId: string;
  initiative: number;
  turnNumber: number;
  actionsRemaining: number;
  movementRemaining: number;
  hasUsedReaction: boolean;
}

export interface CombatState {
  isActive: boolean;
  participants: string[]; // Entity IDs
  turnOrder: InitiativeRoll[];
  currentTurnIndex: number;
  currentTurn: number;
  combatStartTime: number;
}

export interface ActionEconomyState {
  actions: number;
  bonusActions: number;
  reactions: number;
  movement: number; // movement points
}

export const DEFAULT_ACTION_ECONOMY: ActionEconomyState = {
  actions: 1,
  bonusActions: 1,
  reactions: 1,
  movement: 30 // D&D standard movement
};