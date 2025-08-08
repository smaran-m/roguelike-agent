import { Entity, AttackResult, DamageType } from '../../types';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';
import { ResourceManager } from '../../managers/ResourceManager';
import { DiceSystem } from '../dice/DiceSystem';
import { Logger } from '../../utils/Logger';

export class CombatSystem {
  
  // Calculate distance between two entities (in grid units)
  static getDistance(entity1: Entity, entity2: Entity): number {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Check if entity is within melee range (5 feet = 1 grid square in D&D, including diagonals)
  static isInMeleeRange(attacker: Entity, target: Entity): boolean {
    // Use Chebyshev distance (max of x or y difference) for 8-directional movement
    // This considers diagonals as the same distance as orthogonal moves
    const dx = Math.abs(attacker.x - target.x);
    const dy = Math.abs(attacker.y - target.y);
    return Math.max(dx, dy) <= 1;
  }
  
  
  // Get ability modifier from ability score
  static getModifier(abilityScore: number): number {
    return Math.floor((abilityScore - 10) / 2);
  }
  
  // Calculate attack bonus
  static getAttackBonus(attacker: Entity): number {
    const strMod = this.getModifier(attacker.stats.strength);
    return strMod + attacker.stats.proficiencyBonus;
  }
  
  // Calculate final damage after applying resistances/vulnerabilities/immunities
  static calculateFinalDamage(baseDamage: number, damageType: DamageType | string, target: Entity): number {
    // Convert damage type to string for validation
    const damageTypeStr = typeof damageType === 'string' ? damageType : damageType;
    
    // Check if damage type is valid in current world
    if (!WorldConfigLoader.isDamageTypeValid(damageTypeStr)) {
      Logger.warn(`Invalid damage type '${damageTypeStr}' for current world`);
      // Fall back to normal damage
      return WorldConfigLoader.calculateDamage(baseDamage, 1.0);
    }
    
    // Check for immunity first - convert both to strings for comparison
    const damageTypeForComparison = typeof damageType === 'string' ? damageType : damageType;
    if (target.stats.damageImmunities?.some(immunity => 
      (typeof immunity === 'string' ? immunity : immunity) === damageTypeForComparison
    )) {
      return WorldConfigLoader.calculateDamage(baseDamage, WorldConfigLoader.getResistanceMultiplier('immunity'));
    }
    
    let resistanceMultiplier = 1.0;
    
    // Apply resistances (reduce damage) - use string key for lookup
    if (target.stats.damageResistances && target.stats.damageResistances[damageTypeForComparison]) {
      resistanceMultiplier = target.stats.damageResistances[damageTypeForComparison];
    }
    
    // Apply vulnerabilities (increase damage) - use string key for lookup
    if (target.stats.damageVulnerabilities && target.stats.damageVulnerabilities[damageTypeForComparison]) {
      resistanceMultiplier = target.stats.damageVulnerabilities[damageTypeForComparison];
    }
    
    return WorldConfigLoader.calculateDamage(baseDamage, resistanceMultiplier);
  }

  // Perform a melee attack with optional weapon damage
  static meleeAttack(attacker: Entity, target: Entity, weaponDamage?: string, damageType: DamageType | string = DamageType.BLUDGEONING): AttackResult {
    // Roll d20 + attack bonus
    const d20Roll = DiceSystem.rollD20();
    const attackBonus = this.getAttackBonus(attacker);
    const attackRoll = d20Roll + attackBonus;
    
    // Check for critical hit
    const critical = d20Roll === 20;
    
    // Check if attack hits
    const hit = critical || attackRoll >= target.stats.ac;
    
    let damage = 0;
    let finalDamage = 0;
    let damageRoll = "0";
    
    if (hit) {
      // Use weapon damage or default to 1d6
      const damageDice = weaponDamage || "1d6";
      const strMod = this.getModifier(attacker.stats.strength);
      const baseDamage = DiceSystem.rollDice(damageDice);
      damage = baseDamage.total + strMod;
      
      // Double damage on critical
      if (critical) {
        const critDamage = DiceSystem.rollDice(damageDice);
        damage += critDamage.total;
        damageRoll = `${baseDamage.rolls.join('+')}+${critDamage.rolls.join('+')}+${strMod} (crit)`;
      } else {
        damageRoll = `${baseDamage.rolls.join('+')}+${strMod}`;
      }
      
      // Minimum 1 damage before resistances
      damage = Math.max(1, damage);
      
      // Apply damage type modifiers
      finalDamage = this.calculateFinalDamage(damage, damageType, target);
    }
    
    return {
      hit,
      damage,
      critical,
      attackRoll,
      damageRoll,
      damageType,
      finalDamage
    };
  }
  
  // Apply damage to an entity
  static applyDamage(entity: Entity, damage: number): boolean {
    ResourceManager.modify(entity, 'hp', -damage);
    return ResourceManager.isAtMinimum(entity, 'hp'); // Returns true if entity died
  }
  
  // Create default player stats with resources initialized
  static createPlayerStats(): import('../../types').EntityStats {
    const stats: import('../../types').EntityStats = {
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
  
  // Create default enemy stats with resources initialized
  static createEnemyStats(): import('../../types').EntityStats {
    const stats: import('../../types').EntityStats = {
      hp: 8,
      maxHp: 8,
      ac: 12, // Natural armor
      strength: 14, // +2 modifier
      dexterity: 12, // +1 modifier
      constitution: 13, // +1 modifier
      intelligence: 8, // -1 modifier
      wisdom: 10, // +0 modifier
      charisma: 6, // -2 modifier
      proficiencyBonus: 2,
      level: 1
    };
    return stats;
  }
}