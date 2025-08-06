import { describe, it, expect } from 'vitest';
import { EnemyLoader } from '../../src/loaders/EnemyLoader';

describe('EnemyLoader', () => {
  it('should load available enemy types', () => {
    const types = EnemyLoader.getAvailableEnemyTypes();
    expect(types).toContain('goblin');
    expect(types).toContain('orc');
    expect(types).toContain('skeleton');
    expect(types).toContain('wolf');
    expect(types).toContain('spider');
    expect(types.length).toBeGreaterThan(0);
  });

  it('should get enemy definition for valid type', () => {
    const goblin = EnemyLoader.getEnemyDefinition('goblin');
    expect(goblin).not.toBeNull();
    expect(goblin?.name).toBe('Goblin');
    expect(goblin?.glyph).toBe('👺');
    expect(goblin?.stats.hp).toBe('2d6+2');
  });

  it('should return null for invalid enemy type', () => {
    const invalid = EnemyLoader.getEnemyDefinition('nonexistent');
    expect(invalid).toBeNull();
  });

  it('should generate random stats from enemy definition', () => {
    const stats1 = EnemyLoader.generateEnemyStats('goblin');
    const stats2 = EnemyLoader.generateEnemyStats('goblin');
    
    expect(stats1).not.toBeNull();
    expect(stats2).not.toBeNull();
    
    if (stats1 && stats2) {
      // Stats should be in valid ranges
      expect(stats1.hp).toBeGreaterThan(0);
      expect(stats1.hp).toBeLessThanOrEqual(20); // Max possible for 2d6+2
      expect(stats1.maxHp).toBe(stats1.hp);
      expect(stats1.ac).toBe(15); // Fixed AC for goblin
      expect(stats1.strength).toBeGreaterThan(0);
      expect(stats1.strength).toBeLessThanOrEqual(25); // Max possible for ability scores
      
      // Multiple generations might produce different results (due to randomness)
      // We can't guarantee they're different, but at least they should be valid
      expect(stats2.hp).toBeGreaterThan(0);
      expect(stats2.ac).toBe(15);
    }
  });

  it('should parse color strings correctly', () => {
    expect(EnemyLoader.parseColor('0xFF0000')).toBe(0xFF0000);
    expect(EnemyLoader.parseColor('0x00FF00')).toBe(0x00FF00);
    expect(EnemyLoader.parseColor('255')).toBe(255);
  });

  it('should get random enemy type', () => {
    const randomType = EnemyLoader.getRandomEnemyType();
    const availableTypes = EnemyLoader.getAvailableEnemyTypes();
    expect(availableTypes).toContain(randomType);
  });

  it('should check if enemy type exists', () => {
    expect(EnemyLoader.hasEnemyType('goblin')).toBe(true);
    expect(EnemyLoader.hasEnemyType('orc')).toBe(true);
    expect(EnemyLoader.hasEnemyType('nonexistent')).toBe(false);
  });

  it('should generate different stats for different enemy types', () => {
    const goblinStats = EnemyLoader.generateEnemyStats('goblin');
    const orcStats = EnemyLoader.generateEnemyStats('orc');
    
    expect(goblinStats).not.toBeNull();
    expect(orcStats).not.toBeNull();
    
    if (goblinStats && orcStats) {
      // Different enemy types should have different ACs
      expect(goblinStats.ac).toBe(15);
      expect(orcStats.ac).toBe(13);
    }
  });
});