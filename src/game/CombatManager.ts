import { Entity } from '../types';
import { CombatSystem } from './CombatSystem';
import { Renderer } from './Renderer';
import { AnimationSystem } from './AnimationSystem';

export interface CombatResult {
  success: boolean;
  targetKilled: boolean;
  target?: Entity;
  attackResult?: any;
}

export class CombatManager {
  private renderer: Renderer;
  private animationSystem: AnimationSystem;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.animationSystem = renderer.animationSystem;
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
    const attackResult = CombatSystem.meleeAttack(attacker, target);
    
    // Visual effects for attack attempt
    this.animationSystem.nudgeEntity(attacker, target.x, target.y);
    
    this.renderer.addMessage(`${attacker.name} attacks ${target.name}!`);
    this.renderer.addMessage(`Attack: ${attackResult.attackRoll} vs AC ${target.stats.ac}`);
    
    let targetKilled = false;
    
    if (attackResult.hit) {
      targetKilled = CombatSystem.applyDamage(target, attackResult.damage);
      
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