import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceManager } from '../../utils/ResourceManager';
import { WorldConfigLoader } from '../../utils/WorldConfigLoader';
import { Entity } from '../../types';
import { CombatSystem } from '../CombatSystem';

describe('ResourceDisplay', () => {
  let entity: Entity;

  beforeEach(() => {
    // Initialize world configuration
    WorldConfigLoader.initialize('fantasy');
    
    entity = {
      id: 'test-entity',
      x: 5,
      y: 5,
      glyph: '🧙',
      color: 0x4169E1,
      name: 'Test Entity',
      isEmoji: true,
      stats: CombatSystem.createPlayerStats()
    };
    
    // Initialize resources for the entity
    ResourceManager.initializeResources(entity);
  });

  it('should generate bar display for capped resources', () => {
    // Set HP to 15/20 for testing
    ResourceManager.set(entity, 'hp', 15);
    
    const display = ResourceManager.getResourceDisplay(entity, 'hp', 10);
    expect(display).toMatch(/\[#+[-]*\] \d+\/\d+/); // Should match "[#######---] 15/20"
    expect(display).toContain('15/20');
  });

  it('should generate text display for uncapped resources', () => {
    // Set money to 100 (uncapped resource)
    ResourceManager.set(entity, 'money', 100);
    
    const display = ResourceManager.getResourceDisplay(entity, 'money', 10);
    expect(display).toBe('100'); // Should be just the number for text display
  });

  it('should use correct colors based on resource percentage', () => {
    // Test different HP levels
    ResourceManager.set(entity, 'hp', 20); // Full HP
    expect(ResourceManager.getResourceColor(entity, 'hp')).toBe(0x00FF00); // Green
    
    ResourceManager.set(entity, 'hp', 15); // 75% HP (exactly 0.75)
    expect(ResourceManager.getResourceColor(entity, 'hp')).toBe(0xFFFF00); // Yellow (not > 0.75)
    
    ResourceManager.set(entity, 'hp', 10); // 50% HP
    expect(ResourceManager.getResourceColor(entity, 'hp')).toBe(0xFFFF00); // Yellow
    
    ResourceManager.set(entity, 'hp', 5); // 25% HP
    expect(ResourceManager.getResourceColor(entity, 'hp')).toBe(0xFF8000); // Orange
    
    ResourceManager.set(entity, 'hp', 2); // 10% HP
    expect(ResourceManager.getResourceColor(entity, 'hp')).toBe(0xFF0000); // Red
  });

  it('should respect display preferences from world config', () => {
    // Switch to cyberpunk world which has different resources
    WorldConfigLoader.initialize('cyberpunk');
    
    // Re-initialize entity with cyberpunk resources
    ResourceManager.initializeResources(entity);
    
    // Bio-Status should use bar display
    const bioStatusDisplay = ResourceManager.getResourceDisplay(entity, 'hp', 10);
    expect(bioStatusDisplay).toMatch(/\[#+[-]*\] \d+\/\d+/);
    
    // Credits should use text display
    ResourceManager.set(entity, 'credits', 500);
    const creditsDisplay = ResourceManager.getResourceDisplay(entity, 'credits', 10);
    expect(creditsDisplay).toBe('500');
  });

  it('should handle different world themes correctly', () => {
    // Test fantasy resources
    WorldConfigLoader.initialize('fantasy');
    let availableResources = WorldConfigLoader.getAvailableResourceIds();
    expect(availableResources).toContain('hp');
    expect(availableResources).toContain('mana');
    expect(availableResources).toContain('money');
    
    // Test horror resources
    WorldConfigLoader.initialize('horror');
    availableResources = WorldConfigLoader.getAvailableResourceIds();
    expect(availableResources).toContain('hp');
    expect(availableResources).toContain('sanity');
    expect(availableResources).toContain('corruption');
    expect(availableResources).toContain('money');
    
    // Test steampunk resources
    WorldConfigLoader.initialize('steampunk');
    availableResources = WorldConfigLoader.getAvailableResourceIds();
    expect(availableResources).toContain('hp');
    expect(availableResources).toContain('steam');
    expect(availableResources).toContain('oil');
    expect(availableResources).toContain('money');
  });
});