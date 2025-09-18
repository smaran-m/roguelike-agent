import { Entity, WorldConfig } from '../types';
import { DiceSystem } from '../systems/dice/DiceSystem';

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

  /**
   * Get the primary combat resource for a world
   */
  static getPrimaryCombatResource(world: WorldConfig): string {
    return world.mechanics?.combatResources?.primary || 'hp';
  }

  /**
   * Roll an attack with optional advantage/disadvantage
   */
  static rollAttack(
    attacker: Entity,
    defender: Entity,
    opts: {
      abilityType: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
      advantage?: boolean;
      disadvantage?: boolean;
    }
  ): { total: number; hit: boolean; d20Roll: number; isCritical: boolean } {
    // Get ability modifier
    const abilityScore = attacker.stats[opts.abilityType];
    const abilityModifier = this.getModifier(abilityScore);
    const proficiencyBonus = attacker.stats.proficiencyBonus || 0;
    const attackBonus = abilityModifier + proficiencyBonus;

    let d20Roll: number;
    let isCritical = false;

    // Handle advantage/disadvantage
    if (opts.advantage && !opts.disadvantage) {
      const roll1 = DiceSystem.rollD20();
      const roll2 = DiceSystem.rollD20();
      d20Roll = Math.max(roll1, roll2);
    } else if (opts.disadvantage && !opts.advantage) {
      const roll1 = DiceSystem.rollD20();
      const roll2 = DiceSystem.rollD20();
      d20Roll = Math.min(roll1, roll2);
    } else {
      // Normal roll (or advantage and disadvantage cancel out)
      d20Roll = DiceSystem.rollD20();
    }

    // Check for critical hit
    isCritical = d20Roll === 20;

    const total = d20Roll + attackBonus;
    const hit = isCritical || total >= defender.stats.ac;

    return {
      total,
      hit,
      d20Roll,
      isCritical
    };
  }

  /**
   * Roll a skill check or ability check
   */
  static rollSkill(
    entity: Entity,
    skillOrAbility: string,
    opts: {
      advantage?: boolean;
      disadvantage?: boolean;
    } = {}
  ): { total: number; d20Roll: number } {
    // Map skill names to abilities (basic D&D skills)
    const skillToAbility: { [key: string]: keyof typeof entity.stats } = {
      // Strength skills
      athletics: 'strength',

      // Dexterity skills
      acrobatics: 'dexterity',
      sleightOfHand: 'dexterity',
      stealth: 'dexterity',

      // Intelligence skills
      arcana: 'intelligence',
      history: 'intelligence',
      investigation: 'intelligence',
      nature: 'intelligence',
      religion: 'intelligence',

      // Wisdom skills
      animalHandling: 'wisdom',
      insight: 'wisdom',
      medicine: 'wisdom',
      perception: 'wisdom',
      survival: 'wisdom',

      // Charisma skills
      deception: 'charisma',
      intimidation: 'charisma',
      performance: 'charisma',
      persuasion: 'charisma'
    };

    // Determine which ability to use
    let abilityName: keyof typeof entity.stats;
    if (skillToAbility[skillOrAbility]) {
      abilityName = skillToAbility[skillOrAbility];
    } else if (skillOrAbility in entity.stats &&
               ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(skillOrAbility)) {
      abilityName = skillOrAbility as keyof typeof entity.stats;
    } else {
      // Default to wisdom for unknown skills
      abilityName = 'wisdom';
    }

    // Get ability modifier
    const abilityScore = entity.stats[abilityName] as number;
    const abilityModifier = this.getModifier(abilityScore);
    const proficiencyBonus = entity.stats.proficiencyBonus || 0;

    // For now, assume all skills have proficiency (could be expanded later)
    const totalModifier = abilityModifier + proficiencyBonus;

    let d20Roll: number;

    // Handle advantage/disadvantage
    if (opts.advantage && !opts.disadvantage) {
      const roll1 = DiceSystem.rollD20();
      const roll2 = DiceSystem.rollD20();
      d20Roll = Math.max(roll1, roll2);
    } else if (opts.disadvantage && !opts.advantage) {
      const roll1 = DiceSystem.rollD20();
      const roll2 = DiceSystem.rollD20();
      d20Roll = Math.min(roll1, roll2);
    } else {
      // Normal roll (or advantage and disadvantage cancel out)
      d20Roll = DiceSystem.rollD20();
    }

    const total = d20Roll + totalModifier;

    return {
      total,
      d20Roll
    };
  }

  /**
   * Calculate damage from a dice expression with ability modifier and optional critical multiplier
   */
  static calculateDamage(
    expr: string,
    abilityMod: number,
    opts: {
      criticalMultiplier?: number;
    } = {}
  ): number {
    // Roll the base dice
    const diceResult = DiceSystem.rollDice(expr);

    // Add ability modifier to the dice total
    const baseDamage = diceResult.total + abilityMod;

    // Apply critical multiplier if provided
    const criticalMultiplier = opts.criticalMultiplier || 1;
    const finalDamage = Math.floor(baseDamage * criticalMultiplier);

    // Ensure minimum 1 damage
    return Math.max(1, finalDamage);
  }
}