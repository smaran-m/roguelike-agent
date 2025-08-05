import { describe, it, expect, beforeEach } from 'vitest';
import { WorldConfigLoader } from '../../utils/WorldConfigLoader';

describe('WorldConfigLoader', () => {
  beforeEach(() => {
    WorldConfigLoader.initialize('fantasy');
  });

  it('should initialize with default world', () => {
    const result = WorldConfigLoader.initialize('fantasy');
    expect(result).toBe(true);
    
    const currentWorld = WorldConfigLoader.getCurrentWorld();
    expect(currentWorld).toBeTruthy();
    expect(currentWorld?.theme).toBe('fantasy');
  });

  it('should get available worlds', () => {
    const worlds = WorldConfigLoader.getAvailableWorlds();
    expect(worlds).toContain('fantasy');
    expect(worlds).toContain('cyberpunk');
    expect(worlds).toContain('steampunk');
    expect(worlds).toContain('horror');
  });

  it('should switch between world configurations', () => {
    // Start with fantasy
    WorldConfigLoader.setCurrentWorld('fantasy');
    let currentWorld = WorldConfigLoader.getCurrentWorld();
    expect(currentWorld?.theme).toBe('fantasy');
    
    const fantasyDamageTypes = WorldConfigLoader.getCurrentDamageTypes();
    expect(fantasyDamageTypes).toContain('slashing');
    expect(fantasyDamageTypes).toContain('fire');
    
    // Switch to cyberpunk
    WorldConfigLoader.setCurrentWorld('cyberpunk');
    currentWorld = WorldConfigLoader.getCurrentWorld();
    expect(currentWorld?.theme).toBe('cyberpunk');
    
    const cyberpunkDamageTypes = WorldConfigLoader.getCurrentDamageTypes();
    expect(cyberpunkDamageTypes).toContain('kinetic');
    expect(cyberpunkDamageTypes).toContain('plasma');
    expect(cyberpunkDamageTypes).not.toContain('slashing');
  });

  it('should validate damage types for current world', () => {
    WorldConfigLoader.setCurrentWorld('fantasy');
    expect(WorldConfigLoader.isDamageTypeValid('fire')).toBe(true);
    expect(WorldConfigLoader.isDamageTypeValid('plasma')).toBe(false);
    
    WorldConfigLoader.setCurrentWorld('cyberpunk');
    expect(WorldConfigLoader.isDamageTypeValid('plasma')).toBe(true);
    expect(WorldConfigLoader.isDamageTypeValid('fire')).toBe(false);
  });

  it('should validate weapon types for current world', () => {
    WorldConfigLoader.setCurrentWorld('fantasy');
    expect(WorldConfigLoader.isWeaponTypeValid('melee')).toBe(true);
    expect(WorldConfigLoader.isWeaponTypeValid('ballistic')).toBe(false);
    
    WorldConfigLoader.setCurrentWorld('cyberpunk');
    expect(WorldConfigLoader.isWeaponTypeValid('ballistic')).toBe(true);
    expect(WorldConfigLoader.isWeaponTypeValid('melee')).toBe(false);
  });

  it('should get resistance multipliers', () => {
    WorldConfigLoader.setCurrentWorld('fantasy');
    expect(WorldConfigLoader.getResistanceMultiplier('immunity')).toBe(0);
    expect(WorldConfigLoader.getResistanceMultiplier('resistance')).toBe(0.5);
    expect(WorldConfigLoader.getResistanceMultiplier('normal')).toBe(1.0);
    expect(WorldConfigLoader.getResistanceMultiplier('vulnerability')).toBe(1.5);
  });

  it('should calculate damage with world-specific rules', () => {
    WorldConfigLoader.setCurrentWorld('fantasy');
    // Fantasy uses floor rounding and minimum 1 damage
    expect(WorldConfigLoader.calculateDamage(10, 0.7)).toBe(7); // floor(7) = 7
    expect(WorldConfigLoader.calculateDamage(1, 0.5)).toBe(1); // minimum 1 damage
    
    WorldConfigLoader.setCurrentWorld('steampunk');
    // Steampunk uses ceiling rounding and minimum 1 damage
    expect(WorldConfigLoader.calculateDamage(10, 0.7)).toBe(7); // ceiling(7) = 7
    expect(WorldConfigLoader.calculateDamage(10, 0.61)).toBe(7); // ceiling(6.1) = 7
  });

  it('should get world-specific tiles', () => {
    WorldConfigLoader.setCurrentWorld('fantasy');
    const fantasyTiles = WorldConfigLoader.getCurrentTiles();
    expect(fantasyTiles.wall).toBe('🧱');
    
    WorldConfigLoader.setCurrentWorld('cyberpunk');
    const cyberpunkTiles = WorldConfigLoader.getCurrentTiles();
    expect(cyberpunkTiles.wall).toBe('🏢');
  });

  it('should handle invalid world gracefully', () => {
    const result = WorldConfigLoader.setCurrentWorld('nonexistent');
    expect(result).toBe(false);
    
    // Should maintain previous world
    const currentWorld = WorldConfigLoader.getCurrentWorld();
    expect(currentWorld?.theme).toBe('fantasy'); // from beforeEach
  });

  it('should get damage types by category', () => {
    WorldConfigLoader.setCurrentWorld('fantasy');
    const categories = WorldConfigLoader.getCurrentDamageTypesByCategory();
    expect(categories.physical).toContain('slashing');
    expect(categories.elemental).toContain('fire');
    expect(categories.magical).toContain('force');
    
    WorldConfigLoader.setCurrentWorld('cyberpunk');
    const cyberpunkCategories = WorldConfigLoader.getCurrentDamageTypesByCategory();
    expect(cyberpunkCategories.physical).toContain('kinetic');
    expect(cyberpunkCategories.energy).toContain('plasma');
    expect(cyberpunkCategories.cyber).toContain('viral');
  });

  it('should validate world configuration', () => {
    const validConfig = WorldConfigLoader.getWorldConfig('fantasy');
    expect(validConfig).toBeTruthy();
    
    if (validConfig) {
      const validation = WorldConfigLoader.validateWorldConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });
});