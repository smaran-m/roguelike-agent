import { Entity, Resource, ResourceDefinition, ResourceOperation, WorldConfig } from '../types';
import { DiceSystem } from '../systems/dice/DiceSystem';
import { WorldConfigLoader } from '../loaders/WorldConfigLoader';
import { GameMechanics } from '../engine/GameMechanics';
import { Logger } from '../utils/Logger';

export class ResourceManager {
  /**
   * Get a resource from an entity, with fallback for legacy HP system
   */
  static getResource(entity: Entity, resourceId: string): Resource | null {
    // Check new resource system first
    if (entity.stats.resources && entity.stats.resources[resourceId]) {
      return entity.stats.resources[resourceId];
    }
    
    // Fallback for legacy HP system
    if (resourceId === 'hp' && entity.stats.hp !== undefined && entity.stats.maxHp !== undefined) {
      return {
        id: 'hp',
        current: entity.stats.hp,
        maximum: entity.stats.maxHp,
        minimum: 0,
        displayName: 'Health',
        color: '#FF0000'
      };
    }
    
    return null;
  }

  /**
   * Set a resource on an entity, with legacy HP sync
   */
  static setResource(entity: Entity, resource: Resource): void {
    // Initialize resources object if it doesn't exist
    if (!entity.stats.resources) {
      entity.stats.resources = {};
    }
    
    entity.stats.resources[resource.id] = resource;
    
    // Sync with legacy HP system for backwards compatibility
    if (resource.id === 'hp') {
      entity.stats.hp = resource.current;
      entity.stats.maxHp = resource.maximum || resource.current;
    }
  }

  /**
   * Initialize an entity's resources based on world configuration
   */
  static initializeResources(entity: Entity): void {
    const worldConfig = WorldConfigLoader.getCurrentWorld();
    if (!worldConfig || !worldConfig.mechanics.resources) {
      // Create basic HP resource for backwards compatibility
      this.createResource(entity, 'hp', entity.stats.hp || 10, entity.stats.maxHp || 10);
      return;
    }

    // Initialize resources based on world config
    Object.values(worldConfig.mechanics.resources).forEach(resourceDef => {
      if (!this.getResource(entity, resourceDef.id)) {
        // Check if entity already has this resource in stats.resources
        const existingResource = entity.stats.resources?.[resourceDef.id];
        if (existingResource) {
          // Use existing values from entity stats
          this.createResource(
            entity,
            resourceDef.id,
            existingResource.current,
            existingResource.maximum,
            resourceDef
          );
        } else {
          // Use default values
          const defaultCurrent = resourceDef.hasCap ? (resourceDef.defaultMaximum || 10) : 0;
          const defaultMax = resourceDef.hasCap ? (resourceDef.defaultMaximum || 10) : undefined;
          this.createResource(entity, resourceDef.id, defaultCurrent, defaultMax, resourceDef);
        }
      }
    });
  }

  /**
   * Create a new resource for an entity
   */
  static createResource(
    entity: Entity, 
    resourceId: string, 
    current: number, 
    maximum?: number, 
    definition?: ResourceDefinition
  ): Resource {
    const resource: Resource = {
      id: resourceId,
      current,
      maximum,
      minimum: definition?.defaultMinimum || 0,
      changeRate: definition?.defaultChangeRate || 0,
      displayName: definition?.displayName || resourceId,
      color: definition?.color
    };

    this.setResource(entity, resource);
    return resource;
  }

  /**
   * Modify a resource by a given amount (can be dice notation)
   */
  static modify(entity: Entity, resourceId: string, amount: string | number): number {
    const resource = this.getResource(entity, resourceId);
    if (!resource) {
      Logger.warn(`Resource '${resourceId}' not found on entity`);
      return 0;
    }

    // Parse amount (handle dice notation)
    let actualAmount: number;
    if (typeof amount === 'string') {
      const diceResult = DiceSystem.rollDice(amount);
      actualAmount = diceResult.total;
    } else {
      actualAmount = amount;
    }

    const oldValue = resource.current;
    resource.current += actualAmount;

    // Apply bounds
    if (resource.minimum !== undefined) {
      resource.current = Math.max(resource.current, resource.minimum);
    }
    if (resource.maximum !== undefined) {
      resource.current = Math.min(resource.current, resource.maximum);
    }

    // Update the resource
    this.setResource(entity, resource);

    return resource.current - oldValue; // Return actual change
  }

  /**
   * Set a resource to a specific value
   */
  static set(entity: Entity, resourceId: string, value: number): void {
    const resource = this.getResource(entity, resourceId);
    if (!resource) {
      Logger.warn(`Resource '${resourceId}' not found on entity`);
      return;
    }

    resource.current = value;

    // Apply bounds
    if (resource.minimum !== undefined) {
      resource.current = Math.max(resource.current, resource.minimum);
    }
    if (resource.maximum !== undefined) {
      resource.current = Math.min(resource.current, resource.maximum);
    }

    this.setResource(entity, resource);
  }

  /**
   * Set the maximum value for a capped resource (e.g., leveling up)
   */
  static setCap(entity: Entity, resourceId: string, newMaximum: number): void {
    const resource = this.getResource(entity, resourceId);
    if (!resource) {
      Logger.warn(`Resource '${resourceId}' not found on entity`);
      return;
    }

    resource.maximum = newMaximum;
    
    // Adjust current if it exceeds new maximum
    if (resource.current > newMaximum) {
      resource.current = newMaximum;
    }

    this.setResource(entity, resource);
  }

  /**
   * Set the passive change rate for a resource
   */
  static setChangeRate(entity: Entity, resourceId: string, rate: number): void {
    const resource = this.getResource(entity, resourceId);
    if (!resource) {
      Logger.warn(`Resource '${resourceId}' not found on entity`);
      return;
    }

    resource.changeRate = rate;
    this.setResource(entity, resource);
  }

  /**
   * Apply passive changes to all resources (call each turn/tick)
   */
  static applyPassiveChanges(entity: Entity): void {
    if (!entity.stats.resources) return;

    Object.values(entity.stats.resources).forEach(resource => {
      if (resource.changeRate && resource.changeRate !== 0) {
        this.modify(entity, resource.id, resource.changeRate);
      }
    });
  }

  /**
   * Check if a resource exists on an entity
   */
  static hasResource(entity: Entity, resourceId: string): boolean {
    return this.getResource(entity, resourceId) !== null;
  }

  /**
   * Get current value of a resource
   */
  static getCurrentValue(entity: Entity, resourceId: string): number {
    const resource = this.getResource(entity, resourceId);
    return resource ? resource.current : 0;
  }

  /**
   * Get maximum value of a resource (undefined for uncapped)
   */
  static getMaximumValue(entity: Entity, resourceId: string): number | undefined {
    const resource = this.getResource(entity, resourceId);
    return resource ? resource.maximum : undefined;
  }

  /**
   * Check if a resource is at its minimum (useful for death/failure conditions)
   */
  static isAtMinimum(entity: Entity, resourceId: string): boolean {
    const resource = this.getResource(entity, resourceId);
    if (!resource) return false;
    
    const minimum = resource.minimum || 0;
    return resource.current <= minimum;
  }

  /**
   * Check if a resource is at its maximum (useful for full health/mana)
   */
  static isAtMaximum(entity: Entity, resourceId: string): boolean {
    const resource = this.getResource(entity, resourceId);
    if (!resource || resource.maximum === undefined) return false;
    
    return resource.current >= resource.maximum;
  }

  /**
   * Get all resources for an entity
   */
  static getAllResources(entity: Entity): Resource[] {
    if (!entity.stats.resources) return [];
    return Object.values(entity.stats.resources);
  }

  /**
   * Execute a resource operation (from items, abilities, etc.)
   */
  static executeOperation(entity: Entity, operation: ResourceOperation): number {
    switch (operation.operation) {
      case 'modify':
        return this.modify(entity, operation.resource, operation.amount);
      
      case 'set':
        const setValue = typeof operation.amount === 'string' 
          ? DiceSystem.rollDice(operation.amount).total 
          : operation.amount;
        this.set(entity, operation.resource, setValue);
        return setValue;
      
      case 'setCap':
        const newCap = typeof operation.amount === 'string' 
          ? DiceSystem.rollDice(operation.amount).total 
          : operation.amount;
        this.setCap(entity, operation.resource, newCap);
        return newCap;
      
      case 'setRate':
        const newRate = typeof operation.amount === 'string' 
          ? DiceSystem.rollDice(operation.amount).total 
          : operation.amount;
        this.setChangeRate(entity, operation.resource, newRate);
        return newRate;
      
      default:
        Logger.warn(`Unknown resource operation: ${operation.operation}`);
        return 0;
    }
  }

  /**
   * Validate that a resource exists in the current world configuration
   */
  static validateResource(resourceId: string): boolean {
    const worldConfig = WorldConfigLoader.getCurrentWorld();
    if (!worldConfig || !worldConfig.mechanics.resources) {
      // In worlds without resource config, allow basic resources
      return ['hp', 'mana', 'money'].includes(resourceId);
    }
    
    return resourceId in worldConfig.mechanics.resources;
  }

  /**
   * Generate a visual representation of a resource for UI display
   */
  static getResourceDisplay(entity: Entity, resourceId: string, barLength: number = 10): string {
    const resource = this.getResource(entity, resourceId);
    if (!resource) return '';

    const resourceDef = WorldConfigLoader.getResourceDefinition(resourceId);
    const displayMode = resourceDef?.display || 'bar';

    if (displayMode === 'text' || !resource.maximum) {
      // Text display for uncapped resources or text-preferred resources
      return `${resource.current}`;
    }

    // Bar display for capped resources
    const percentage = resource.current / resource.maximum;
    const filledChars = Math.floor(percentage * barLength);
    const emptyChars = barLength - filledChars;
    
    const filled = '#'.repeat(filledChars);
    const empty = '-'.repeat(emptyChars);
    
    return `[${filled}${empty}] ${resource.current}/${resource.maximum}`;
  }

  /**
   * Get color for resource display based on current value percentage
   */
  static getResourceColor(entity: Entity, resourceId: string): number {
    const resource = this.getResource(entity, resourceId);
    if (!resource || !resource.maximum) {
      // Default color for uncapped resources
      const resourceDef = WorldConfigLoader.getResourceDefinition(resourceId);
      return resourceDef?.color ? parseInt(resourceDef.color.replace('#', '0x')) : 0xFFFFFF;
    }

    const percentage = resource.current / resource.maximum;
    
    // Color gradient based on percentage
    if (percentage > 0.75) return 0x00FF00; // Green
    if (percentage >= 0.5) return 0xFFFF00;  // Yellow
    if (percentage >= 0.25) return 0xFF8000; // Orange
    return 0xFF0000; // Red
  }

  /**
   * Advanced resource modification with full operation support
   */
  static modifyAdvanced(
    entity: Entity,
    opts: {
      resourceId: string;
      op: 'add'|'subtract'|'set'|'multiply'|'min'|'max';
      amount: number;
      clamp?: boolean;
      world?: WorldConfig
    }
  ): { before: number; after: number } {
    const resource = this.getResource(entity, opts.resourceId);
    if (!resource) {
      return { before: 0, after: 0 };
    }

    const before = resource.current;
    let after: number;

    // Apply operation
    switch (opts.op) {
      case 'add':
        after = before + opts.amount;
        break;
      case 'subtract':
        after = before - opts.amount;
        break;
      case 'set':
        after = opts.amount;
        break;
      case 'multiply':
        after = before * opts.amount;
        break;
      case 'min':
        after = Math.min(before, opts.amount);
        break;
      case 'max':
        after = Math.max(before, opts.amount);
        break;
      default:
        after = before;
    }

    // Apply clamping if enabled
    if (opts.clamp !== false) { // Default to true
      if (resource.minimum !== undefined) {
        after = Math.max(after, resource.minimum);
      }
      if (resource.maximum !== undefined) {
        after = Math.min(after, resource.maximum);
      }
    }

    // Update the resource
    resource.current = after;
    this.setResource(entity, resource);

    return { before, after };
  }

  /**
   * Get the primary combat resource for a world
   */
  static getPrimaryCombatResource(world: WorldConfig): string {
    return GameMechanics.getPrimaryCombatResource(world);
  }


  /**
   * Apply damage with resistances/vulnerabilities (stub implementation)
   */
  static applyDamageWithResistances(
    _entity: Entity,
    dmg: number,
    _type: string,
    _world: WorldConfig
  ): number {
    // TODO: Implement resistance/vulnerability logic based on world config and entity stats
    // For now, return damage unchanged
    return dmg;
  }
}