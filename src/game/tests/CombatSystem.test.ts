import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CombatSystem } from '../CombatSystem';
import { Entity, DamageType } from '../../types';

describe('CombatSystem', () => {
  let player: Entity;
  let enemy: Entity;

  beforeEach(() => {
    // Seed the random number generator for deterministic tests
    vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

    player = {
      id: 'player',
      x: 5,
      y: 5,
      glyph: '🧙',
      color: 0x4169E1,
      name: 'Player',
      isEmoji: true,
      stats: CombatSystem.createPlayerStats(),
      isPlayer: true
    };

    enemy = {
      id: 'enemy',
      x: 6,
      y: 5,
      glyph: '👺',
      color: 0xFF0000,
      name: 'Goblin',
      isEmoji: true,
      stats: CombatSystem.createEnemyStats()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create player stats with correct values', () => {
    const stats = CombatSystem.createPlayerStats();
    
    expect(stats.level).toBe(1);
    expect(stats.hp).toBe(20);
    expect(stats.maxHp).toBe(20);
    expect(stats.ac).toBe(14);
    expect(stats.proficiencyBonus).toBe(2);
    expect(stats.strength).toBe(16);
    expect(stats.dexterity).toBe(14);
    expect(stats.constitution).toBe(15);
  });

  it('should create enemy stats with correct values', () => {
    const stats = CombatSystem.createEnemyStats();
    
    expect(stats.level).toBe(1);
    expect(stats.hp).toBe(8);
    expect(stats.maxHp).toBe(8);
    expect(stats.ac).toBe(12);
    expect(stats.proficiencyBonus).toBe(2);
    expect(stats.strength).toBe(14);
    expect(stats.dexterity).toBe(12);
    expect(stats.constitution).toBe(13);
  });

  it('should calculate ability modifiers correctly', () => {
    expect(CombatSystem.getModifier(8)).toBe(-1);
    expect(CombatSystem.getModifier(10)).toBe(0);
    expect(CombatSystem.getModifier(11)).toBe(0);
    expect(CombatSystem.getModifier(12)).toBe(1);
    expect(CombatSystem.getModifier(14)).toBe(2);
    expect(CombatSystem.getModifier(16)).toBe(3);
    expect(CombatSystem.getModifier(20)).toBe(5);
  });

  it('should determine melee range correctly', () => {
    // Adjacent entities should be in melee range
    expect(CombatSystem.isInMeleeRange(player, enemy)).toBe(true);
    
    // Same position should be in melee range
    enemy.x = player.x;
    enemy.y = player.y;
    expect(CombatSystem.isInMeleeRange(player, enemy)).toBe(true);
    
    // Diagonal should be in melee range (8-directional movement treats diagonals as 1 grid square)
    enemy.x = player.x + 1;
    enemy.y = player.y + 1;
    expect(CombatSystem.isInMeleeRange(player, enemy)).toBe(true);
    
    // Too far should not be in melee range
    enemy.x = player.x + 2;
    enemy.y = player.y;
    expect(CombatSystem.isInMeleeRange(player, enemy)).toBe(false);
  });

  it('should perform melee attack with deterministic results', () => {
    // With Math.random() mocked to 0.5, d20 roll should be 11 (1 + 0.5 * 19)
    const result = CombatSystem.meleeAttack(player, enemy);
    
    expect(result.attackRoll).toBe(16); // 11 (d20) + 3 (STR) + 2 (proficiency)
    expect(result.hit).toBe(true); // 16 vs AC 12
    expect(result.critical).toBe(false); // Not a natural 20
    expect(result.damage).toBeGreaterThan(0);
    expect(result.damageRoll).toBeDefined();
  });

  it('should handle critical hits correctly', () => {
    // Mock a natural 20 roll
    vi.spyOn(Math, 'random').mockImplementation(() => 0.95); // Should give us 20
    
    const result = CombatSystem.meleeAttack(player, enemy);
    
    expect(result.attackRoll).toBe(25); // 20 (d20) + 3 (STR) + 2 (proficiency)
    expect(result.hit).toBe(true);
    expect(result.critical).toBe(true);
    expect(result.damage).toBeGreaterThan(0);
  });

  it('should handle misses correctly', () => {
    // Mock a low roll
    vi.spyOn(Math, 'random').mockImplementation(() => 0.05); // Should give us 2
    
    const result = CombatSystem.meleeAttack(player, enemy);
    
    expect(result.attackRoll).toBe(7); // 2 (d20) + 3 (STR) + 2 (proficiency)
    expect(result.hit).toBe(false); // 7 vs AC 12
    expect(result.critical).toBe(false);
    expect(result.damage).toBe(0);
  });

  it('should apply damage correctly', () => {
    const initialHp = enemy.stats.hp;
    const damage = 5;
    
    const died = CombatSystem.applyDamage(enemy, damage);
    
    expect(enemy.stats.hp).toBe(initialHp - damage);
    expect(died).toBe(false);
  });

  it('should handle death when HP reaches 0', () => {
    const damage = enemy.stats.hp; // Exact lethal damage
    
    const died = CombatSystem.applyDamage(enemy, damage);
    
    expect(enemy.stats.hp).toBe(0);
    expect(died).toBe(true);
  });

  it('should handle overkill damage', () => {
    const damage = enemy.stats.hp + 10; // Overkill damage
    
    const died = CombatSystem.applyDamage(enemy, damage);
    
    expect(enemy.stats.hp).toBe(0); // HP should not go below 0
    expect(died).toBe(true);
  });

  it('should roll dice correctly with different notations', () => {
    // Test with seeded randomness
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    
    // d6 should roll 4 (1 + 0.5 * 5)
    expect(CombatSystem.rollDice('1d6').total).toBe(4);
    
    // 2d6 should roll 8 (4 + 4)
    expect(CombatSystem.rollDice('2d6').total).toBe(8);
    
    // 1d6+3 should roll 7 (4 + 3)
    expect(CombatSystem.rollDice('1d6+3').total).toBe(7);
    
    // 2d6+2 should roll 10 (4 + 4 + 2)
    expect(CombatSystem.rollDice('2d6+2').total).toBe(10);
  });

  it('should handle invalid dice notation gracefully', () => {
    expect(CombatSystem.rollDice('').total).toBe(1);
    expect(CombatSystem.rollDice('invalid').total).toBe(1);
    expect(CombatSystem.rollDice('d').total).toBe(1);
    expect(CombatSystem.rollDice('1d').total).toBe(1);
  });

  it('should calculate damage with strength modifier', () => {
    // Player has STR 16 (+3 modifier)
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    
    const result = CombatSystem.meleeAttack(player, enemy);
    
    // With d6 rolling 4 and +3 STR modifier, damage should be 7
    expect(result.damage).toBe(7);
    expect(result.damageRoll).toBe('4+3'); // Actual implementation format
  });

  it('should double damage on critical hits', () => {
    // Mock critical hit (natural 20)
    let callCount = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 0.95; // Natural 20 for attack
      return 0.5; // All other rolls (damage dice)
    });
    
    const result = CombatSystem.meleeAttack(player, enemy);
    
    expect(result.critical).toBe(true);
    // Critical hit adds extra dice damage
    // With 0.5 random: each d6 rolls 4, so base 4 + crit 4 + STR 3 = 11
    expect(result.damage).toBe(11);
    expect(result.damageRoll).toBe('4+4+3 (crit)'); // Actual implementation format
  });

  it('should handle edge case ability scores', () => {
    // Test minimum ability score
    expect(CombatSystem.getModifier(1)).toBe(-5);
    
    // Test maximum reasonable ability score
    expect(CombatSystem.getModifier(30)).toBe(10);
  });

  it('should maintain stat consistency', () => {
    const playerStats = CombatSystem.createPlayerStats();
    const enemyStats = CombatSystem.createEnemyStats();
    
    // Stats should be positive
    expect(playerStats.hp).toBeGreaterThan(0);
    expect(playerStats.ac).toBeGreaterThan(0);
    expect(enemyStats.hp).toBeGreaterThan(0);
    expect(enemyStats.ac).toBeGreaterThan(0);
    
    // HP should equal maxHp for new entities
    expect(playerStats.hp).toBe(playerStats.maxHp);
    expect(enemyStats.hp).toBe(enemyStats.maxHp);
  });

  describe('Damage Type System', () => {
    it('should apply damage resistance correctly', () => {
      const target: Entity = {
        ...enemy,
        stats: {
          ...enemy.stats,
          damageResistances: {
            [DamageType.FIRE]: 0.5
          }
        }
      };

      const baseDamage = 10;
      const finalDamage = CombatSystem.calculateFinalDamage(baseDamage, DamageType.FIRE, target);
      
      expect(finalDamage).toBe(5); // 10 * 0.5 = 5
    });

    it('should apply damage vulnerability correctly', () => {
      const target: Entity = {
        ...enemy,
        stats: {
          ...enemy.stats,
          damageVulnerabilities: {
            [DamageType.FIRE]: 2.0
          }
        }
      };

      const baseDamage = 8;
      const finalDamage = CombatSystem.calculateFinalDamage(baseDamage, DamageType.FIRE, target);
      
      expect(finalDamage).toBe(16); // 8 * 2.0 = 16
    });

    it('should handle damage immunity', () => {
      const target: Entity = {
        ...enemy,
        stats: {
          ...enemy.stats,
          damageImmunities: [DamageType.POISON]
        }
      };

      const baseDamage = 15;
      const finalDamage = CombatSystem.calculateFinalDamage(baseDamage, DamageType.POISON, target);
      
      expect(finalDamage).toBe(0); // Immune to poison
    });

    it('should apply multiple modifiers correctly', () => {
      const target: Entity = {
        ...enemy,
        stats: {
          ...enemy.stats,
          damageResistances: {
            [DamageType.FIRE]: 0.75
          },
          damageVulnerabilities: {
            [DamageType.COLD]: 1.5
          }
        }
      };

      // Test fire resistance
      const fireDamage = CombatSystem.calculateFinalDamage(12, DamageType.FIRE, target);
      expect(fireDamage).toBe(9); // 12 * 0.75 = 9

      // Test cold vulnerability  
      const coldDamage = CombatSystem.calculateFinalDamage(6, DamageType.COLD, target);
      expect(coldDamage).toBe(9); // 6 * 1.5 = 9
    });

    it('should ensure minimum 1 damage unless immune', () => {
      const target: Entity = {
        ...enemy,
        stats: {
          ...enemy.stats,
          damageResistances: {
            [DamageType.BLUDGEONING]: 0.1
          }
        }
      };

      const baseDamage = 2;
      const finalDamage = CombatSystem.calculateFinalDamage(baseDamage, DamageType.BLUDGEONING, target);
      
      expect(finalDamage).toBe(1); // Minimum 1 damage even with heavy resistance
    });

    it('should include damage type in attack result', () => {
      const result = CombatSystem.meleeAttack(player, enemy, '1d6', DamageType.SLASHING);
      
      expect(result.damageType).toBe(DamageType.SLASHING);
      expect(result.finalDamage).toBeDefined();
    });
  });
});