import { Entity, AttackResult } from '../types';

export class CombatSystem {
  
  // Calculate distance between two entities (in grid units)
  static getDistance(entity1: Entity, entity2: Entity): number {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Check if entity is within melee range (5 feet = 1 grid square in D&D)
  static isInMeleeRange(attacker: Entity, target: Entity): boolean {
    return this.getDistance(attacker, target) <= 1.0;
  }
  
  // Roll a d20
  static rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
  }
  
  // Roll dice (e.g., "2d6+3")
  static rollDice(diceString: string): { total: number; rolls: number[] } {
    const match = diceString.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!match) {
      return { total: 1, rolls: [1] };
    }
    
    const numDice = parseInt(match[1]);
    const diceSides = parseInt(match[2]);
    const modifier = parseInt(match[3] || '0');
    
    const rolls: number[] = [];
    let total = modifier;
    
    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * diceSides) + 1;
      rolls.push(roll);
      total += roll;
    }
    
    return { total, rolls };
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
  
  // Perform a melee attack
  static meleeAttack(attacker: Entity, target: Entity): AttackResult {
    // Roll d20 + attack bonus
    const d20Roll = this.rollD20();
    const attackBonus = this.getAttackBonus(attacker);
    const attackRoll = d20Roll + attackBonus;
    
    // Check for critical hit
    const critical = d20Roll === 20;
    
    // Check if attack hits
    const hit = critical || attackRoll >= target.stats.ac;
    
    let damage = 0;
    let damageRoll = "0";
    
    if (hit) {
      // Base damage: 1d6 + strength modifier (simple sword)
      const strMod = this.getModifier(attacker.stats.strength);
      const baseDamage = this.rollDice("1d6");
      damage = baseDamage.total + strMod;
      
      // Double damage on critical
      if (critical) {
        const critDamage = this.rollDice("1d6");
        damage += critDamage.total;
        damageRoll = `${baseDamage.rolls[0]}+${critDamage.rolls[0]}+${strMod} (crit)`;
      } else {
        damageRoll = `${baseDamage.rolls[0]}+${strMod}`;
      }
      
      // Minimum 1 damage
      damage = Math.max(1, damage);
    }
    
    return {
      hit,
      damage,
      critical,
      attackRoll,
      damageRoll
    };
  }
  
  // Apply damage to an entity
  static applyDamage(entity: Entity, damage: number): boolean {
    entity.stats.hp -= damage;
    entity.stats.hp = Math.max(0, entity.stats.hp);
    return entity.stats.hp <= 0; // Returns true if entity died
  }
  
  // Create default player stats
  static createPlayerStats(): import('../types').EntityStats {
    return {
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
  }
  
  // Create default enemy stats
  static createEnemyStats(): import('../types').EntityStats {
    return {
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
  }
}