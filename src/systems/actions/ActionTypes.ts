import { Entity, DamageType } from '../../types';
import { GameMode } from '../game-modes/GameModeTypes';

export interface Action {
  id: string;
  name: string;
  description: string;
  source: string; // Source identifier (e.g., 'intrinsic', 'equipment:longsword', 'environment:door')
  category: ActionCategory;
  requirements: ActionRequirement[];
  costs: ActionCost[];
  effects: ActionEffect[];
  targeting: TargetingInfo;
  priority?: number; // Higher priority actions shown first in UI
  iconGlyph?: string; // Optional emoji/icon for UI display
}

export enum ActionCategory {
  MOVEMENT = 'movement',
  ATTACK = 'attack',
  DEFENSE = 'defense',
  UTILITY = 'utility',
  MAGIC = 'magic',
  ITEM = 'item',
  ENVIRONMENT = 'environment',
  SOCIAL = 'social'
}

export interface ActionRequirement {
  type: RequirementType;
  target?: string; // Resource ID, equipment slot, etc.
  value?: string | number; // Required value (can be dice notation)
  comparison?: 'equals' | 'greater' | 'less' | 'greaterEqual' | 'lessEqual';
  description: string; // Human-readable requirement description
}

export enum RequirementType {
  RESOURCE = 'resource',           // Requires minimum resource value
  EQUIPMENT = 'equipment',         // Requires item in specific slot
  GAME_MODE = 'gameMode',         // Requires specific game mode
  RANGE = 'range',                // Requires target within range
  LINE_OF_SIGHT = 'lineOfSight',  // Requires clear line of sight to target
  TILE_PROPERTY = 'tileProperty', // Requires specific tile property
  ENTITY_STATE = 'entityState',   // Requires entity in specific state
  WORLD_CONDITION = 'worldCondition' // Requires world-specific condition
}

export interface ActionCost {
  type: CostType;
  resource?: string; // Resource ID for resource costs
  amount: string | number; // Cost amount (can be dice notation)
  description: string; // Human-readable cost description
}

export enum CostType {
  RESOURCE = 'resource',     // Costs HP, mana, etc.
  ACTION_POINT = 'actionPoint', // Costs action economy
  MOVEMENT = 'movement',     // Costs movement points
  ITEM_CHARGE = 'itemCharge', // Consumes item charges/durability
  TIME = 'time'             // Takes time to perform
}

export interface ActionEffect {
  type: EffectType;
  target: EffectTarget;
  parameters: EffectParameters;
  description: string; // Human-readable effect description
  timing?: EffectTiming; // When effect occurs (immediate, start of turn, etc.)
}

export enum EffectType {
  RESOURCE_CHANGE = 'resourceChange',   // Modify entity resources
  DAMAGE = 'damage',                    // Deal damage
  HEALING = 'healing',                  // Restore health/resources
  STATUS_EFFECT = 'statusEffect',       // Apply/remove status effects
  MOVEMENT = 'movement',                // Move entity
  ENVIRONMENT_CHANGE = 'environmentChange', // Modify tiles/environment
  SUMMON = 'summon',                    // Create new entity
  TELEPORT = 'teleport',               // Instant movement
  ITEM_MANIPULATION = 'itemManipulation' // Create/destroy/modify items
}

export type EffectTarget = 'self' | 'target' | 'area' | 'allEnemies' | 'allAllies' | 'environment';

export type EffectTiming = 'immediate' | 'startOfTurn' | 'endOfTurn' | 'onHit' | 'onMiss' | 'delayed';

export interface EffectParameters {
  // Resource/damage effects
  amount?: string | number; // Amount (can be dice notation)
  resourceId?: string;      // Target resource ID
  damageType?: DamageType | string; // Type of damage

  // Movement effects
  distance?: number;        // Movement distance
  direction?: 'forward' | 'backward' | 'toward' | 'away' | 'random';

  // Area effects
  radius?: number;          // Effect radius
  shape?: 'circle' | 'square' | 'line' | 'cone';

  // Status effects
  statusId?: string;        // Status effect ID
  duration?: number;        // Effect duration in turns

  // Environment effects
  tileChanges?: { [property: string]: any }; // Tile property changes

  // Conditional parameters
  condition?: string;       // Condition that must be met
  probability?: number;     // Chance effect occurs (0-1)

  // Generic parameters for extensibility
  [key: string]: any;
}

export interface TargetingInfo {
  type: TargetingType;
  range: number | 'unlimited' | 'touch' | 'self';
  requiresLineOfSight: boolean;
  validTargets: TargetFilter[];
  areaOfEffect?: AreaOfEffect;
}

export enum TargetingType {
  SELF = 'self',           // No targeting needed, affects performer
  SINGLE = 'single',       // Target single entity/tile
  AREA = 'area',          // Target area
  DIRECTION = 'direction', // Target direction
  LINE = 'line',          // Target in straight line
  NONE = 'none'           // No target required
}

export interface TargetFilter {
  type: 'entity' | 'tile' | 'item';
  criteria: FilterCriteria;
}

export interface FilterCriteria {
  // Entity filters
  isPlayer?: boolean;
  isAlive?: boolean;
  isHostile?: boolean;
  hasResource?: string;

  // Tile filters
  isWalkable?: boolean;
  hasProperty?: string;

  // Item filters
  itemType?: string;

  // Generic filters
  [key: string]: any;
}

export interface AreaOfEffect {
  shape: 'circle' | 'square' | 'line' | 'cone';
  size: number; // Radius for circle, side length for square, length for line, etc.
  origin?: 'performer' | 'target'; // Where AoE is centered
}

// Context object passed to action sources for discovery
export interface ActionContext {
  // Core context
  entity: Entity;
  gameMode: GameMode;

  // Spatial context
  nearbyTiles: Array<{ x: number; y: number; tile: any; distance: number }>;
  visibleEntities: Entity[];

  // Equipment context
  equippedItems: Map<string, any>; // slotId -> Item

  // Resource context
  resources: { [resourceId: string]: { current: number; maximum?: number } };

  // Combat context (when applicable)
  isInCombat?: boolean;
  actionPointsRemaining?: number;
  movementPointsRemaining?: number;
  hasUsedReaction?: boolean;

  // World context
  worldConfig?: any; // Current world configuration

  // Environmental context
  lightLevel?: number;
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  weather?: string;

  // Event context
  recentEvents?: string[]; // Recent game events that might affect actions
}

// Query object for generic action providers
export interface ActionQuery {
  context: ActionContext;
  category?: ActionCategory; // Filter by category
  source?: string; // Filter by source
  sourceFilter?: string; // Filter by source prefix
  maxResults?: number; // Limit number of results
}

// Result from action discovery
export interface ActionDiscoveryResult {
  actions: Action[];
  context: ActionContext;
  discoveryTime: number; // Time taken to discover actions (for performance monitoring)
  sourceResults: { [source: string]: number }; // Number of actions from each source
}

// Interfaces for the hybrid source system
export interface IActionSource {
  readonly id: string;
  readonly priority: number;

  canActivate(context: ActionContext): boolean;
  getAvailableActions(context: ActionContext): Action[];
  getDescription(): string;
}

export interface IActionProvider {
  readonly id: string;

  provideActions(query: ActionQuery): Action[];
  canProvideActions(query: ActionQuery): boolean;
  getDescription(): string;
}

// Validation result for action execution
export interface ActionValidationResult {
  isValid: boolean;
  failedRequirements: ActionRequirement[];
  insufficientResources: ActionCost[];
  errors: string[];
  warnings: string[];
}

// Action execution context (for future use in Task 3.3)
export interface ActionExecutionContext {
  action: Action;
  performer: Entity;
  target?: Entity | { x: number; y: number };
  context: ActionContext;
  validateOnly?: boolean; // If true, only validate, don't execute
}

export interface ResourceOpParameters {
  resourceId?: string;
  operation: 'add' | 'subtract' | 'set' | 'multiply' | 'min' | 'max';
  amount?: number;
  amountFormula?: string;
  clampToBounds?: boolean;
}