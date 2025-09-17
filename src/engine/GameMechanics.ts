import { Entity } from '../types';

export class GameMechanics {

  // Get ability modifier from ability score
  static getModifier(abilityScore: number): number {
    return Math.floor((abilityScore - 10) / 2);
  }

  // Check if entity is within melee range (5 feet = 1 grid square in D&D, including diagonals)
  static isInMeleeRange(attacker: Entity, target: Entity): boolean {
    // Use Chebyshev distance (max of x or y difference) for 8-directional movement
    // This considers diagonals as the same distance as orthogonal moves
    const dx = Math.abs(attacker.x - target.x);
    const dy = Math.abs(attacker.y - target.y);
    return Math.max(dx, dy) <= 1;
  }

  // Calculate distance between two entities (in grid units)
  static getDistance(entity1: Entity, entity2: Entity): number {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get grid distance between two points (for game logic)
   */
  static getGridDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  // Create default player stats with resources initialized
  static createPlayerStats(): import('../types').EntityStats {
    const stats: import('../types').EntityStats = {
      hp: 20,
      maxHp: 20,
      ac: 14, // Leather armor + dex
      strength: 16, // +3 modifier
      dexterity: 14, // +2 modifier
      constitution: 15, // +2 modifier
      intelligence: 12, // +1 modifier
      wisdom: 13, // +1 modifier
      charisma: 10, // +0 modifier
      proficiencyBonus: 2,
      level: 1
    };
    return stats;
  }
}