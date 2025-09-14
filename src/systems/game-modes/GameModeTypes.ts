import { Entity } from '../../types';

export type GameMode = 'exploration' | 'combat';

export interface CombatTrigger {
  hostileEntity: Entity;
  playerEntity: Entity;
  distance: number;
  hasLineOfSight: boolean;
}

export interface CombatContext {
  participants: Entity[];
  initiator: Entity;
  trigger: CombatTrigger;
}

export interface GameModeState {
  currentMode: GameMode;
  previousMode: GameMode | null;
  modeStartTime: number;
  combatContext?: CombatContext;
}

export interface CombatDetectionConfig {
  hostileDetectionRange: number;
  combatTriggerDistance: number;
  requireLineOfSight: boolean;
}