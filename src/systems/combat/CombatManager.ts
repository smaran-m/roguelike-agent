import { Entity } from '../../types';
import { CombatSystem } from './CombatSystem';
import { Renderer } from '../../core/Renderer';
import { AnimationSystem } from '../animation/AnimationSystem';
import { CharacterManager } from '../../managers/CharacterManager';
import { EventBus } from '../../core/events/EventBus';
import { generateEventId } from '../../core/events/GameEvent';

export interface CombatResult {
  success: boolean;
  targetKilled: boolean;
  target?: Entity;
  attackResult?: any;
}

export class CombatManager {
  private renderer: Renderer;
  private animationSystem: AnimationSystem;
  private eventBus: EventBus;

  constructor(renderer: Renderer, eventBus: EventBus) {
    this.renderer = renderer;
    this.animationSystem = renderer.animationSystem;
    this.eventBus = eventBus;
  }

  attemptMeleeAttack(attacker: Entity, entities: Entity[]): CombatResult {
    // Find all enemies within melee range
    const targets = entities.filter(entity => 
      entity.id !== attacker.id && 
      CombatSystem.isInMeleeRange(attacker, entity)
    );
    
    if (targets.length === 0) {
      this.renderer.addMessage("No enemies in range!");
      return { success: false, targetKilled: false };
    }
    
    // For now, attack the first target in range
    const target = targets[0];
    
    // Get weapon damage and info for player attacks
    let weaponDamage: string | undefined;
    let weaponName = "fists"; // Default unarmed attack
    let attackType = "melee attack";
    
    if (attacker.isPlayer) {
      const characterManager = CharacterManager.getInstance();
      weaponDamage = characterManager.getWeaponDamage();
      const equippedWeapon = characterManager.getEquippedWeapon();
      if (equippedWeapon) {
        weaponName = equippedWeapon.name;
        // Determine attack type based on weapon abilities
        if (equippedWeapon.abilities?.includes('Ammunition')) {
          attackType = "ranged attack";
        } else {
          attackType = "melee attack";
        }
      }
    }
    
    const attackResult = CombatSystem.meleeAttack(attacker, target, weaponDamage);
    
    // Visual effects for attack attempt
    this.animationSystem.nudgeEntity(attacker, target.x, target.y);
    
    // Enhanced attack message with weapon and attack type
    this.renderer.addMessage(`${attacker.name} makes a ${attackType} with ${weaponName} against ${target.name}!`);
    this.renderer.addMessage(`Attack: ${attackResult.attackRoll} vs AC ${target.stats.ac}`);
    
    let targetKilled = false;
    
    if (attackResult.hit) {
      targetKilled = CombatSystem.applyDamage(target, attackResult.damage);
      
      // Publish damage dealt event
      this.eventBus.publish({
        type: 'DamageDealt',
        id: generateEventId(),
        timestamp: Date.now(),
        attackerId: attacker.id,
        targetId: target.id,
        damage: attackResult.damage,
        damageType: 'physical', // Default damage type, could be enhanced
        targetPosition: { x: target.x, y: target.y }
      });
      
      if (attackResult.critical) {
        this.renderer.addMessage(`CRITICAL HIT! ${attackResult.damageRoll} = ${attackResult.damage} damage`);
      } else {
        this.renderer.addMessage(`Hit! ${attackResult.damageRoll} = ${attackResult.damage} damage`);
      }
      
      // Visual effects for hit
      this.animationSystem.shakeEntity(target);
      this.animationSystem.showFloatingDamage(target, attackResult.damage);
      
      if (targetKilled) {
        this.renderer.addMessage(`${target.name} died!`);
        this.renderer.removeEntity(target.id);
        
        // Publish enemy died event
        this.eventBus.publish({
          type: 'EnemyDied',
          id: generateEventId(),
          timestamp: Date.now(),
          enemyId: target.id,
          position: { x: target.x, y: target.y },
          killer: attacker.id
        });
      } else {
        this.renderer.addMessage(`${target.name}: ${target.stats.hp}/${target.stats.maxHp} HP`);
      }
      
    } else {
      this.renderer.addMessage("Miss!");
      // Shake attacker to indicate miss
      this.animationSystem.shakeEntity(attacker);
    }

    return {
      success: true,
      targetKilled,
      target,
      attackResult
    };
  }

  findTargetsInRange(attacker: Entity, entities: Entity[]): Entity[] {
    return entities.filter(entity => 
      entity.id !== attacker.id && 
      CombatSystem.isInMeleeRange(attacker, entity)
    );
  }

  canAttack(attacker: Entity, entities: Entity[]): boolean {
    return this.findTargetsInRange(attacker, entities).length > 0;
  }

  calculateDistance(entity1: Entity, entity2: Entity): number {
    return Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
  }
}