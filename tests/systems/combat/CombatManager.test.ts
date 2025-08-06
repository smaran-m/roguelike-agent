import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatManager } from '../../../src/systems/combat/CombatManager';
import { Entity } from '../../../src/types';
import { CombatSystem } from '../../../src/systems/combat/CombatSystem';
import { CharacterManager } from '../../../src/managers/CharacterManager';

// Mock CharacterManager
vi.mock('../../../src/managers/CharacterManager');

describe('CombatManager', () => {
  let combatManager: CombatManager;
  let mockRenderer: any;
  let player: Entity;
  let enemy: Entity;
  let entities: Entity[];

  beforeEach(() => {
    mockRenderer = {
      addMessage: vi.fn(),
      nudgeEntity: vi.fn(),
      shakeEntity: vi.fn(),
      showFloatingDamage: vi.fn(),
      removeEntity: vi.fn(),
      animationSystem: {
        nudgeEntity: vi.fn(),
        shakeEntity: vi.fn(),
        showFloatingDamage: vi.fn()
      }
    };
    
    // Set up default CharacterManager mock
    const defaultCharacterManager = {
      getWeaponDamage: vi.fn().mockReturnValue('1d6'),
      getEquippedWeapon: vi.fn().mockReturnValue(null)
    };
    vi.mocked(CharacterManager.getInstance).mockReturnValue(defaultCharacterManager as any);
    
    combatManager = new CombatManager(mockRenderer);
    
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

    entities = [player, enemy];
  });

  it('should find targets in melee range', () => {
    const targets = combatManager.findTargetsInRange(player, entities);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toBe(enemy);
  });

  it('should determine if entity can attack', () => {
    const canAttack = combatManager.canAttack(player, entities);
    expect(canAttack).toBe(true);
  });

  it('should determine if entity cannot attack when no targets in range', () => {
    enemy.x = 10;
    enemy.y = 10;
    
    const canAttack = combatManager.canAttack(player, entities);
    expect(canAttack).toBe(false);
  });

  it('should calculate distance between entities', () => {
    const distance = combatManager.calculateDistance(player, enemy);
    expect(distance).toBe(1); // Adjacent entities
  });

  it('should attempt melee attack when targets in range', () => {
    vi.spyOn(CombatSystem, 'meleeAttack').mockReturnValue({
      hit: true,
      damage: 5,
      critical: false,
      attackRoll: 15,
      damageRoll: '1d6+2'
    });
    
    vi.spyOn(CombatSystem, 'applyDamage').mockReturnValue(false);
    
    const result = combatManager.attemptMeleeAttack(player, entities);
    
    expect(result.success).toBe(true);
    expect(result.targetKilled).toBe(false);
    expect(result.target).toBe(enemy);
    expect(mockRenderer.addMessage).toHaveBeenCalledWith('Player makes a melee attack with fists against Goblin!');
    expect(mockRenderer.animationSystem.nudgeEntity).toHaveBeenCalledWith(player, enemy.x, enemy.y);
  });

  it('should handle no targets in range', () => {
    enemy.x = 10;
    enemy.y = 10;
    
    const result = combatManager.attemptMeleeAttack(player, entities);
    
    expect(result.success).toBe(false);
    expect(result.targetKilled).toBe(false);
    expect(mockRenderer.addMessage).toHaveBeenCalledWith('No enemies in range!');
  });

  it('should handle critical hits', () => {
    vi.spyOn(CombatSystem, 'meleeAttack').mockReturnValue({
      hit: true,
      damage: 10,
      critical: true,
      attackRoll: 20,
      damageRoll: '2d6+4'
    });
    
    vi.spyOn(CombatSystem, 'applyDamage').mockReturnValue(false);
    
    const result = combatManager.attemptMeleeAttack(player, entities);
    
    expect(result.success).toBe(true);
    expect(mockRenderer.addMessage).toHaveBeenCalledWith('CRITICAL HIT! 2d6+4 = 10 damage');
    expect(mockRenderer.animationSystem.showFloatingDamage).toHaveBeenCalledWith(enemy, 10);
  });

  it('should handle target death', () => {
    vi.spyOn(CombatSystem, 'meleeAttack').mockReturnValue({
      hit: true,
      damage: 15,
      critical: false,
      attackRoll: 18,
      damageRoll: '1d6+8'
    });
    
    vi.spyOn(CombatSystem, 'applyDamage').mockReturnValue(true); // Target dies
    
    const result = combatManager.attemptMeleeAttack(player, entities);
    
    expect(result.success).toBe(true);
    expect(result.targetKilled).toBe(true);
    expect(mockRenderer.addMessage).toHaveBeenCalledWith('Goblin died!');
  });

  it('should handle miss', () => {
    vi.spyOn(CombatSystem, 'meleeAttack').mockReturnValue({
      hit: false,
      damage: 0,
      critical: false,
      attackRoll: 5,
      damageRoll: ''
    });
    
    const result = combatManager.attemptMeleeAttack(player, entities);
    
    expect(result.success).toBe(true);
    expect(mockRenderer.addMessage).toHaveBeenCalledWith('Miss!');
    expect(mockRenderer.animationSystem.shakeEntity).toHaveBeenCalledWith(player);
  });

  it('should show weapon name in combat messages when player has equipped weapon', () => {
    // Mock character manager to return a weapon
    const mockCharacterManager = {
      getWeaponDamage: vi.fn().mockReturnValue('1d8'),
      getEquippedWeapon: vi.fn().mockReturnValue({
        name: 'Longsword',
        abilities: ['Versatile']
      })
    };
    vi.mocked(CharacterManager.getInstance).mockReturnValue(mockCharacterManager as any);
    
    // Mock combat result
    vi.spyOn(CombatSystem, 'meleeAttack').mockReturnValue({
      hit: true,
      damage: 8,
      critical: false,
      attackRoll: 15,
      damageRoll: '1d8+3'
    });
    
    const result = combatManager.attemptMeleeAttack(player, entities);
    
    expect(result.success).toBe(true);
    expect(mockRenderer.addMessage).toHaveBeenCalledWith('Player makes a melee attack with Longsword against Goblin!');
  });

  it('should detect ranged attacks from weapon abilities', () => {
    // Mock character manager to return a ranged weapon
    const mockCharacterManager = {
      getWeaponDamage: vi.fn().mockReturnValue('1d8'),
      getEquippedWeapon: vi.fn().mockReturnValue({
        name: 'Longbow',
        abilities: ['Ammunition', 'Heavy', 'Two-Handed']
      })
    };
    vi.mocked(CharacterManager.getInstance).mockReturnValue(mockCharacterManager as any);
    
    // Mock combat result
    vi.spyOn(CombatSystem, 'meleeAttack').mockReturnValue({
      hit: true,
      damage: 6,
      critical: false,
      attackRoll: 14,
      damageRoll: '1d8+2'
    });
    
    const result = combatManager.attemptMeleeAttack(player, entities);
    
    expect(result.success).toBe(true);
    expect(mockRenderer.addMessage).toHaveBeenCalledWith('Player makes a ranged attack with Longbow against Goblin!');
  });
});