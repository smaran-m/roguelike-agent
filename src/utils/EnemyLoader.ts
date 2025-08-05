import { EnemyDefinition, EntityStats, DamageType } from '../types';
import { CombatSystem } from '../game/CombatSystem';
import enemiesData from '../data/enemies.json';

export class EnemyLoader {
  private static enemies: { [key: string]: any } = enemiesData;

  /**
   * Get all available enemy types
   */
  static getAvailableEnemyTypes(): string[] {
    return Object.keys(this.enemies);
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
    const rawData = this.enemies[enemyType];
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
    
    // Roll for HP and set maxHp to the same value
    const hp = CombatSystem.rollDice(stats.hp).total;
    
    return {
      hp,
      maxHp: hp,
      ac: stats.ac,
      strength: CombatSystem.rollDice(stats.strength).total,
      dexterity: CombatSystem.rollDice(stats.dexterity).total,
      constitution: CombatSystem.rollDice(stats.constitution).total,
      intelligence: CombatSystem.rollDice(stats.intelligence).total,
      wisdom: CombatSystem.rollDice(stats.wisdom).total,
      charisma: CombatSystem.rollDice(stats.charisma).total,
      proficiencyBonus: stats.proficiencyBonus,
      level: stats.level,
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