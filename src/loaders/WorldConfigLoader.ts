import { WorldConfig, WorldsCollection, ResourceDefinition } from '../types';
import worldsData from '../data/worlds.json';

export class WorldConfigLoader {
  private static worlds: WorldsCollection = worldsData as WorldsCollection;
  private static currentWorld: WorldConfig | null = null;

  /**
   * Get all available world themes
   */
  static getAvailableWorlds(): string[] {
    return Object.keys(this.worlds);
  }

  /**
   * Get a specific world configuration
   */
  static getWorldConfig(worldKey: string): WorldConfig | null {
    return this.worlds[worldKey] || null;
  }

  /**
   * Set the current active world
   */
  static setCurrentWorld(worldKey: string): boolean {
    const worldConfig = this.getWorldConfig(worldKey);
    if (worldConfig) {
      this.currentWorld = worldConfig;
      return true;
    }
    return false;
  }

  /**
   * Get the currently active world configuration
   */
  static getCurrentWorld(): WorldConfig | null {
    return this.currentWorld;
  }

  /**
   * Get all damage types for the current world
   */
  static getCurrentDamageTypes(): string[] {
    if (!this.currentWorld) return [];
    
    const allDamageTypes: string[] = [];
    Object.values(this.currentWorld.damageTypes).forEach(categoryTypes => {
      allDamageTypes.push(...categoryTypes);
    });
    return allDamageTypes;
  }

  /**
   * Get damage types by category for the current world
   */
  static getCurrentDamageTypesByCategory(): { [category: string]: string[] } {
    return this.currentWorld?.damageTypes || {};
  }

  /**
   * Get weapon types for the current world
   */
  static getCurrentWeaponTypes(): string[] {
    return this.currentWorld?.weaponTypes || [];
  }

  /**
   * Check if a damage type exists in the current world
   */
  static isDamageTypeValid(damageType: string): boolean {
    return this.getCurrentDamageTypes().includes(damageType);
  }

  /**
   * Check if a weapon type exists in the current world
   */
  static isWeaponTypeValid(weaponType: string): boolean {
    return this.getCurrentWeaponTypes().includes(weaponType);
  }

  /**
   * Get resistance multiplier for a given resistance level
   */
  static getResistanceMultiplier(resistanceLevel: 'immunity' | 'heavy_resistance' | 'resistance' | 'normal' | 'vulnerability' | 'heavy_vulnerability'): number {
    if (!this.currentWorld) return 1.0;
    
    const system = this.currentWorld.resistanceSystem;
    switch (resistanceLevel) {
      case 'immunity': return system.immunityMultiplier;
      case 'heavy_resistance': return system.heavyResistanceMultiplier;
      case 'resistance': return system.resistanceMultiplier;
      case 'normal': return system.normalMultiplier;
      case 'vulnerability': return system.vulnerabilityMultiplier;
      case 'heavy_vulnerability': return system.heavyVulnerabilityMultiplier;
      default: return system.normalMultiplier;
    }
  }

  /**
   * Apply world-specific damage calculation
   */
  static calculateDamage(baseDamage: number, resistanceMultiplier: number): number {
    if (!this.currentWorld) return Math.max(1, Math.floor(baseDamage * resistanceMultiplier));
    
    const mechanics = this.currentWorld.mechanics;
    let finalDamage = baseDamage * resistanceMultiplier;
    
    // Handle immunity (0 multiplier) as special case - no minimum damage
    if (resistanceMultiplier === this.currentWorld.resistanceSystem.immunityMultiplier) {
      return 0;
    }
    
    // Apply rounding rule
    switch (mechanics.roundingRule) {
      case 'floor':
        finalDamage = Math.floor(finalDamage);
        break;
      case 'ceiling':
        finalDamage = Math.ceil(finalDamage);
        break;
      case 'round':
        finalDamage = Math.round(finalDamage);
        break;
    }
    
    // Apply minimum damage rule (except for immunity)
    return Math.max(mechanics.minimumDamage, finalDamage);
  }


  /**
   * Get resource definitions for the current world
   */
  static getCurrentResourceDefinitions(): { [resourceId: string]: ResourceDefinition } {
    return this.currentWorld?.mechanics.resources || {};
  }

  /**
   * Get a specific resource definition
   */
  static getResourceDefinition(resourceId: string): ResourceDefinition | null {
    const resources = this.getCurrentResourceDefinitions();
    return resources[resourceId] || null;
  }

  /**
   * Check if a resource is defined in the current world
   */
  static isResourceDefined(resourceId: string): boolean {
    return resourceId in this.getCurrentResourceDefinitions();
  }

  /**
   * Get all available resource IDs for the current world
   */
  static getAvailableResourceIds(): string[] {
    return Object.keys(this.getCurrentResourceDefinitions());
  }

  /**
   * Get the primary combat resource for the current world
   */
  static getCombatResource(type: 'primary'): string {
    const combatResources = this.currentWorld?.mechanics.combatResources;
    if (!combatResources) {
      // Fallback to 'hp' for worlds that don't define combat resources
      return 'hp';
    }

    switch (type) {
      case 'primary':
        return combatResources.primary;
      default:
        return 'hp';
    }
  }

  /**
   * Get secondary combat resources for the current world
   */
  static getSecondaryCombatResources(): string[] {
    const combatResources = this.currentWorld?.mechanics.combatResources;
    return combatResources?.secondary || [];
  }

  /**
   * Check if a resource is combat-critical (determines life/death)
   */
  static isCombatCritical(resourceId: string): boolean {
    return this.getCombatResource('primary') === resourceId;
  }

  /**
   * Get world display information for UI
   */
  static getWorldDisplayList(): Array<{
    id: string;
    name: string;
    description: string;
    theme: string;
  }> {
    return Object.entries(this.worlds).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      theme: config.theme
    }));
  }

  /**
   * Initialize with default world (fantasy)
   */
  static initialize(defaultWorld: string = 'fantasy'): boolean {
    return this.setCurrentWorld(defaultWorld);
  }

  /**
   * Validate world configuration
   */
  static validateWorldConfig(worldConfig: WorldConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    if (!worldConfig.name) errors.push('Missing world name');
    if (!worldConfig.theme) errors.push('Missing world theme');
    if (!worldConfig.damageTypes) errors.push('Missing damage types');
    if (!worldConfig.weaponTypes) errors.push('Missing weapon types');
    if (!worldConfig.resistanceSystem) errors.push('Missing resistance system');
    if (!worldConfig.mechanics) errors.push('Missing game mechanics');
    
    // Validate resistance system multipliers
    if (worldConfig.resistanceSystem) {
      const system = worldConfig.resistanceSystem;
      if (system.immunityMultiplier < 0) errors.push('Immunity multiplier cannot be negative');
      if (system.normalMultiplier !== 1.0) errors.push('Normal multiplier should be 1.0');
    }
    
    // Validate mechanics
    if (worldConfig.mechanics) {
      if (worldConfig.mechanics.minimumDamage < 0) errors.push('Minimum damage cannot be negative');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}