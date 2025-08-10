import { describe, it, expect, beforeEach } from 'vitest';
import { WorldConfigLoader } from '../../src/loaders/WorldConfigLoader';

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

  it('should get world display list for UI', () => {
    const worldList = WorldConfigLoader.getWorldDisplayList();
    
    expect(worldList).toHaveLength(4);
    
    const fantasyWorld = worldList.find(w => w.id === 'fantasy');
    expect(fantasyWorld).toBeTruthy();
    expect(fantasyWorld?.name).toBe('Fantasy Realm');
    expect(fantasyWorld?.description).toBe('A magical world of swords and sorcery');
    expect(fantasyWorld?.theme).toBe('fantasy');

    const cyberpunkWorld = worldList.find(w => w.id === 'cyberpunk');
    expect(cyberpunkWorld).toBeTruthy();
    expect(cyberpunkWorld?.name).toBe('Neon City 2088');
    expect(cyberpunkWorld?.theme).toBe('cyberpunk');
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

  it('should get available resource IDs', () => {
    WorldConfigLoader.setCurrentWorld('fantasy');
    const fantasyResources = WorldConfigLoader.getAvailableResourceIds();
    expect(fantasyResources).toContain('hp');
    expect(fantasyResources).toContain('mana');
    expect(fantasyResources).toContain('money');
    
    WorldConfigLoader.setCurrentWorld('cyberpunk');
    const cyberpunkResources = WorldConfigLoader.getAvailableResourceIds();
    expect(cyberpunkResources).toContain('hp');
    expect(cyberpunkResources).toContain('heat');
    expect(cyberpunkResources).toContain('credits');
    expect(cyberpunkResources).toContain('neural');
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