import { Entity } from '../../types';
import { CombatSystem } from './CombatSystem';
import { IRenderer } from '../../core/renderers/IRenderer';
import { CharacterManager } from '../../managers/CharacterManager';
import { ResourceManager } from '../../managers/ResourceManager';
import { EventBus } from '../../core/events/EventBus';
import { generateEventId, EnemyDiedEvent } from '../../core/events/GameEvent';

export interface CombatResult {
  success: boolean;
  targetKilled: boolean;
  target?: Entity;
  attackResult?: any;
}

export class CombatManager {
  private renderer: IRenderer;
  private eventBus: EventBus;

  constructor(renderer: IRenderer, eventBus: EventBus) {
    this.renderer = renderer;
    this.eventBus = eventBus;
    
    this.setupDeathAnimations();
  }
  
  private setupDeathAnimations() {
    this.eventBus.subscribe('EnemyDied', (event) => {
      const deathEvent = event as EnemyDiedEvent;
      console.log('💀 CombatManager: EnemyDied event received for animations!', { 
        position: deathEvent.position,
        enemyId: deathEvent.enemyId 
      });
      
      // Trigger death ripple animation if supported by renderer
      // if (this.renderer && this.renderer.startDeathRipple) {
      //   console.log('CombatManager: Starting death ripple');
      //   this.renderer.startDeathRipple(deathEvent.position.x, deathEvent.position.y);
        
      //   if (this.renderer.startColorRipple) {
      //     console.log('CombatManager: Adding red death color ripple wave');
      //     this.renderer.startColorRipple(deathEvent.position.x, deathEvent.position.y, 0xFF0000, 1.0, 15);
      //   }
        
      //   if (this.renderer.startLinearWave) {
      //     console.log('CombatManager: Adding linear wave effect');
      //     this.renderer.startLinearWave(deathEvent.position.x, deathEvent.position.y, 0, 20, 12, 2);
      //   }
        
      //   if (this.renderer.startConicalWave) {
      //     console.log('CombatManager: Adding conical wave effect');
      //     this.renderer.startConicalWave(deathEvent.position.x, deathEvent.position.y, -60, 60, 18, 10);
      //   }
      // } else {
      //   console.log('CombatManager: Renderer does not support death animations');
      // }
    });
  }

  attemptMeleeAttack(attacker: Entity, entities: Entity[]): CombatResult {
    // Find all enemies within melee range
    const targets = entities.filter(entity => 
      entity.id !== attacker.id && 
      CombatSystem.isInMeleeRange(attacker, entity)
    );
    
    if (targets.length === 0) {
      this.eventBus.publish({
        type: 'MessageAdded',
        id: generateEventId(),
        timestamp: Date.now(),
        message: "No enemies in range! Move closer or end turn.",
        category: 'combat'
      });
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
    this.renderer.nudgeEntity(attacker, target.x, target.y);
    
    // Enhanced attack message with weapon and attack type
    this.eventBus.publish({
      type: 'MessageAdded',
      id: generateEventId(),
      timestamp: Date.now(),
      message: `${attacker.name} makes a ${attackType} with ${weaponName} against ${target.name}!`,
      category: 'combat'
    });
    this.eventBus.publish({
      type: 'MessageAdded',
      id: generateEventId(),
      timestamp: Date.now(),
      message: `Attack: ${attackResult.attackRoll} vs AC ${target.stats.ac}`,
      category: 'combat'
    });
    
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
        this.eventBus.publish({
          type: 'MessageAdded',
          id: generateEventId(),
          timestamp: Date.now(),
          message: `CRITICAL HIT! ${attackResult.damageRoll} = ${attackResult.damage} damage`,
          category: 'combat'
        });
      } else {
        this.eventBus.publish({
          type: 'MessageAdded',
          id: generateEventId(),
          timestamp: Date.now(),
          message: `Hit! ${attackResult.damageRoll} = ${attackResult.damage} damage`,
          category: 'combat'
        });
      }
      
      // Visual effects for hit
      this.renderer.shakeEntity(target);
      this.renderer.showFloatingDamage(target, attackResult.damage);
      
      if (targetKilled) {
        this.eventBus.publish({
          type: 'MessageAdded',
          id: generateEventId(),
          timestamp: Date.now(),
          message: `${target.name} died!`,
          category: 'combat'
        });
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
        const currentHp = ResourceManager.getCurrentValue(target, 'hp');
        const maxHp = ResourceManager.getMaximumValue(target, 'hp') || currentHp;
        this.eventBus.publish({
          type: 'MessageAdded',
          id: generateEventId(),
          timestamp: Date.now(),
          message: `${target.name}: ${currentHp}/${maxHp} HP`,
          category: 'combat'
        });
      }
      
    } else {
      this.eventBus.publish({
        type: 'MessageAdded',
        id: generateEventId(),
        timestamp: Date.now(),
        message: "Miss!",
        category: 'combat'
      });
      // Shake attacker to indicate miss
      this.renderer.shakeEntity(attacker);
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