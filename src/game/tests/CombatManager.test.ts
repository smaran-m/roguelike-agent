import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatManager } from '../CombatManager';
import { Entity } from '../../types';
import { CombatSystem } from '../CombatSystem';

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
      animationSystem: {
        nudgeEntity: vi.fn(),
        shakeEntity: vi.fn(),
        showFloatingDamage: vi.fn()
      }
    };
    
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
    expect(mockRenderer.addMessage).toHaveBeenCalledWith('Player attacks Goblin!');
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
});