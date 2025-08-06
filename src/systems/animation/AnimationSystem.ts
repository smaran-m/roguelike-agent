import { Entity } from '../../types';
import { Text, Container } from 'pixi.js';

export interface AnimationTarget {
  entity: Entity;
  text: Text;
  hpText?: Text;
}

export class AnimationSystem {
  private tileSize: number;
  private entityContainer: Container;
  private entityTextMap: Map<string, Text>;
  private hpTextMap: Map<string, Text>;
  private cameraX: number = 0;
  private cameraY: number = 0;

  constructor(
    tileSize: number, 
    entityContainer: Container, 
    entityTextMap: Map<string, Text>,
    hpTextMap: Map<string, Text>
  ) {
    this.tileSize = tileSize;
    this.entityContainer = entityContainer;
    this.entityTextMap = entityTextMap;
    this.hpTextMap = hpTextMap;
  }

  updateCamera(cameraX: number, cameraY: number) {
    this.cameraX = cameraX;
    this.cameraY = cameraY;
  }

  private worldToScreen(worldX: number, worldY: number): {x: number, y: number} {
    return {
      x: worldX - this.cameraX,
      y: worldY - this.cameraY
    };
  }

  private screenToPixel(screenX: number, screenY: number): {x: number, y: number} {
    return {
      x: screenX * this.tileSize + this.tileSize / 2,
      y: screenY * this.tileSize + this.tileSize / 2
    };
  }

  shakeEntity(entity: Entity) {
    const text = this.entityTextMap.get(entity.id);
    const hpText = this.hpTextMap.get(entity.id);
    if (!text) return;
    
    const originalX = text.x;
    const originalY = text.y;
    const hpOriginalX = hpText?.x || 0;
    const hpOriginalY = hpText?.y || 0;
    const shakeAmount = 2;
    const duration = 150;
    
    let startTime = performance.now();
    
    const shake = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        const offsetX = (Math.random() - 0.5) * shakeAmount * 2;
        const offsetY = (Math.random() - 0.5) * shakeAmount * 2;
        
        text.x = originalX + offsetX;
        text.y = originalY + offsetY;
        
        if (hpText) {
          hpText.x = hpOriginalX + offsetX;
          hpText.y = hpOriginalY + offsetY;
        }
        
        requestAnimationFrame(shake);
      } else {
        text.x = originalX;
        text.y = originalY;
        if (hpText) {
          hpText.x = hpOriginalX;
          hpText.y = hpOriginalY;
        }
      }
    };
    
    requestAnimationFrame(shake);
  }

  nudgeEntity(entity: Entity, targetX: number, targetY: number) {
    const text = this.entityTextMap.get(entity.id);
    const hpText = this.hpTextMap.get(entity.id);
    if (!text) return;
    
    const originalX = text.x;
    const originalY = text.y;
    const hpOriginalX = hpText?.x || 0;
    const hpOriginalY = hpText?.y || 0;
    
    // Convert target world coordinates to screen, then to pixel coordinates
    const targetScreen = this.worldToScreen(targetX, targetY);
    const targetPixel = this.screenToPixel(targetScreen.x, targetScreen.y);
    
    // Calculate direction toward target
    const dx = targetPixel.x - originalX;
    const dy = targetPixel.y - originalY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const nudgeAmount = 4;
    const nudgeX = (dx / distance) * nudgeAmount;
    const nudgeY = (dy / distance) * nudgeAmount;
    
    const duration = 200;
    let startTime = performance.now();
    
    const nudge = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        // Ease out
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentNudgeX = nudgeX * (1 - easeProgress);
        const currentNudgeY = nudgeY * (1 - easeProgress);
        
        text.x = originalX + currentNudgeX;
        text.y = originalY + currentNudgeY;
        
        if (hpText) {
          hpText.x = hpOriginalX + currentNudgeX;
          hpText.y = hpOriginalY + currentNudgeY;
        }
        
        requestAnimationFrame(nudge);
      } else {
        text.x = originalX;
        text.y = originalY;
        if (hpText) {
          hpText.x = hpOriginalX;
          hpText.y = hpOriginalY;
        }
      }
    };
    
    requestAnimationFrame(nudge);
  }

  showFloatingDamage(entity: Entity, damage: number) {
    const damageText = new Text(`-${damage}`, {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 22,
      fill: 0xFF4444,
      align: 'center'
    });
    
    // Convert entity world coordinates to screen, then to pixel coordinates
    const screenPos = this.worldToScreen(entity.x, entity.y);
    const pixelPos = this.screenToPixel(screenPos.x, screenPos.y);
    
    const startX = pixelPos.x;
    const startY = pixelPos.y - 5;
    
    damageText.x = startX;
    damageText.y = startY;
    damageText.anchor.set(0.5);
    
    this.entityContainer.addChild(damageText);
    
    const duration = 1000;
    let startTime = performance.now();
    
    const float = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        // Float upward and fade out
        damageText.y = startY - (progress * 20);
        damageText.alpha = 1 - progress;
        requestAnimationFrame(float);
      } else {
        if (damageText.parent) {
          this.entityContainer.removeChild(damageText);
        }
        damageText.destroy();
      }
    };
    
    requestAnimationFrame(float);
  }
}