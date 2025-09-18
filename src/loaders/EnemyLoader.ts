import { EnemyDefinition, EntityStats, DamageType, Resource } from '../types';
import { DiceSystem } from '../systems/dice/DiceSystem';
import { WorldConfigLoader } from './WorldConfigLoader';
import enemiesData from '../data/enemies.json';
import cyberpunkEnemiesData from '../data/cyberpunk-enemies.json';

export class EnemyLoader {
  private static enemies: { [key: string]: any } = enemiesData;
  private static worldEnemies: { [worldTheme: string]: { [key: string]: any } } = {
    fantasy: enemiesData,
    cyberpunk: cyberpunkEnemiesData
  };

  /**
   * Get current world's enemies or fall back to default
   */
  private static getCurrentWorldEnemies(): { [key: string]: any } {
    const currentWorld = WorldConfigLoader.getCurrentWorld();
    if (currentWorld && this.worldEnemies[currentWorld.theme]) {
      return this.worldEnemies[currentWorld.theme];
    }
    return this.enemies; // fallback to default (fantasy)
  }

  /**
   * Set enemies for current world
   */
  static setWorldEnemies(worldTheme: string): void {
    const worldEnemies = this.worldEnemies[worldTheme];
    if (worldEnemies) {
      this.enemies = worldEnemies;
    }
  }

  /**
   * Get all available enemy types
   */
  static getAvailableEnemyTypes(): string[] {
    return Object.keys(this.getCurrentWorldEnemies());
  }

  /**
   * Convert raw JSON data to proper EnemyDefinition
   */
  private static convertToEnemyDefinition(rawData: any): EnemyDefinition {
    return {
      name: rawData.name,
      glyph: rawData.glyph,
      color: rawData.color,
      stats: rawData.stats,
      description: rawData.description,
      damageResistances: rawData.damageResistances,
      damageVulnerabilities: rawData.damageVulnerabilities,
      damageImmunities: rawData.damageImmunities ? rawData.damageImmunities.map((immunity: string) => immunity as DamageType) : undefined
    };
  }

  /**
   * Get a specific enemy definition by type
   */
  static getEnemyDefinition(enemyType: string): EnemyDefinition | null {
    const currentEnemies = this.getCurrentWorldEnemies();
    const rawData = currentEnemies[enemyType];
    if (!rawData) return null;
    return this.convertToEnemyDefinition(rawData);
  }

  /**
   * Generate random stats from an enemy definition using D&D dice notation
   */
  static generateEnemyStats(enemyType: string): EntityStats | null {
    const definition = this.getEnemyDefinition(enemyType);
    if (!definition) {
      return null;
    }

    const stats = definition.stats;

    // Handle new resource system format
    const resources: { [resourceId: string]: Resource } = {};

    if (stats.resources) {
      // New resource system format
      for (const [resourceId, resourceData] of Object.entries(stats.resources)) {
        // Roll dice once and use same value for both current and max
        if (typeof resourceData.current === 'string' && typeof resourceData.max === 'string' && resourceData.current === resourceData.max) {
          const rolledValue = DiceSystem.rollDice(resourceData.current).total;
          resources[resourceId] = {
            id: resourceId,
            current: rolledValue,
            maximum: rolledValue,
            minimum: 0,
            displayName: resourceId
          };
        } else {
          const current = typeof resourceData.current === 'string'
            ? DiceSystem.rollDice(resourceData.current).total
            : resourceData.current;
          const max = typeof resourceData.max === 'string'
            ? DiceSystem.rollDice(resourceData.max).total
            : resourceData.max;
          resources[resourceId] = {
            id: resourceId,
            current,
            maximum: max,
            minimum: 0,
            displayName: resourceId
          };
        }
      }
    } else if (stats.hp) {
      // Legacy format fallback - convert old 'hp' to new resource system
      const hp = DiceSystem.rollDice(stats.hp).total;
      resources.hp = {
        id: 'hp',
        current: hp,
        maximum: hp,
        minimum: 0,
        displayName: 'Health'
      };
    }

    return {
      hp: resources.hp?.current || 10, // Legacy compatibility
      maxHp: resources.hp?.maximum || 10, // Legacy compatibility
      ac: stats.ac,
      strength: DiceSystem.rollDice(stats.strength).total,
      dexterity: DiceSystem.rollDice(stats.dexterity).total,
      constitution: DiceSystem.rollDice(stats.constitution).total,
      intelligence: DiceSystem.rollDice(stats.intelligence).total,
      wisdom: DiceSystem.rollDice(stats.wisdom).total,
      charisma: DiceSystem.rollDice(stats.charisma).total,
      proficiencyBonus: stats.proficiencyBonus,
      level: stats.level,
      resources, // Add the new resources property
      damageResistances: definition.damageResistances,
      damageVulnerabilities: definition.damageVulnerabilities,
      damageImmunities: definition.damageImmunities
    };
  }

  /**
   * Parse color string to number (handles hex strings like "0xFF0000")
   */
  static parseColor(colorString: string): number {
    if (colorString.startsWith('0x')) {
      return parseInt(colorString, 16);
    }
    return parseInt(colorString);
  }

  /**
   * Get a random enemy type from available enemies
   */
  static getRandomEnemyType(): string {
    const types = this.getAvailableEnemyTypes();
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Check if an enemy type exists
   */
  static hasEnemyType(enemyType: string): boolean {
    return enemyType in this.enemies;
  }
}