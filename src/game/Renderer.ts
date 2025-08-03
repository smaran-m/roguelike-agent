import { Application, Container, Graphics, Text } from 'pixi.js';
import { Tile, Entity } from '../types';

export class Renderer {
  app: Application;
  tileSize: number = 24;
  gridWidth: number;
  gridHeight: number;
  tileContainer: Container;
  entityContainer: Container;
  messageContainer: Container;
  entityTextMap: Map<string, Text> = new Map(); // Track text objects by entity ID
  hpTextMap: Map<string, Text> = new Map(); // Track HP text objects by entity ID
  messages: string[] = [];
  messageText: Text;
  
  constructor(width: number, height: number) {
    this.gridWidth = width;
    this.gridHeight = height;
    
    this.app = new Application({
      width: width * this.tileSize + 300, // Add space for messages
      height: height * this.tileSize,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    // Layer containers
    this.tileContainer = new Container();
    this.entityContainer = new Container();
    this.messageContainer = new Container();
    
    this.app.stage.addChild(this.tileContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.messageContainer);
    
    // Add a separator line
    const separator = new Graphics();
    separator.lineStyle(2, 0x444444);
    separator.moveTo(width * this.tileSize + 10, 0);
    separator.lineTo(width * this.tileSize + 10, height * this.tileSize);
    this.messageContainer.addChild(separator);
    
    // Add title
    const titleText = new Text('Combat Log:', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 16,
      fill: 0xAAAAAA,
      align: 'left'
    });
    titleText.x = width * this.tileSize + 20;
    titleText.y = 10;
    this.messageContainer.addChild(titleText);
    
    // Initialize message display (positioned on the right side)
    this.messageText = new Text('Move near goblin and press SPACE to attack', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 12,
      fill: 0xFFFFFF,
      align: 'left'
    });
    this.messageText.x = width * this.tileSize + 20; // Right of the game area
    this.messageText.y = 40;
    this.messageContainer.addChild(this.messageText);
    
    // Add to DOM
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.app.view as HTMLCanvasElement);
    }
  }
  
  renderTile(x: number, y: number, tile: Tile) {
    // Background
    const bg = new Graphics();
    bg.beginFill(tile.bgColor);
    bg.drawRect(
      x * this.tileSize,
      y * this.tileSize,
      this.tileSize,
      this.tileSize
    );
    bg.endFill();
    this.tileContainer.addChild(bg);
    
    // Glyph
    const text = new Text(tile.glyph, {
      fontFamily: tile.isEmoji ? 'Noto Emoji' : 'Noto Sans Mono',
      fontSize: tile.isEmoji ? 20 : 18,
      fill: tile.fgColor,
      align: 'center'
    });
    
    text.x = x * this.tileSize + this.tileSize / 2;
    text.y = y * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    
    this.tileContainer.addChild(text);
  }
  
  clearTiles() {
    this.tileContainer.removeChildren();
  }
  
  clearEntities() {
    this.entityContainer.removeChildren();
    this.entityTextMap.clear();
    this.hpTextMap.clear();
  }
  
  renderEntity(entity: Entity) {
    const text = new Text(entity.glyph, {
      fontFamily: entity.isEmoji ? 'Noto Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif' : 'Noto Sans Mono, monospace',
      fontSize: entity.isEmoji ? 20 : 18,
      fill: entity.isEmoji ? 0xFFFFFF : entity.color,
      align: 'center'
    });
    
    // Apply color tint for emojis
    if (entity.isEmoji) {
      text.tint = entity.color;
    }
    
    text.x = entity.x * this.tileSize + this.tileSize / 2;
    text.y = entity.y * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    
    // Store reference for animations
    this.entityTextMap.set(entity.id, text);
    this.entityContainer.addChild(text);
    
    // Render HP above entity with bar-like appearance
    const hpRatio = entity.stats.hp / entity.stats.maxHp;
    const hpColor = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
    const hpDisplay = `${entity.stats.hp}/${entity.stats.maxHp}`;
    
    const hpText = new Text(hpDisplay, {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 12,
      fill: hpColor,
      align: 'center'
    });
    
    hpText.x = entity.x * this.tileSize + this.tileSize / 2;
    hpText.y = entity.y * this.tileSize + this.tileSize / 2 - 10;
    hpText.anchor.set(0.5);
    
    // Store reference for animations
    this.hpTextMap.set(entity.id, hpText);
    this.entityContainer.addChild(hpText);
  }
  
  animateMove(entity: Entity, fromX: number, fromY: number, toX: number, toY: number) {
    const text = this.entityTextMap.get(entity.id);
    const hpText = this.hpTextMap.get(entity.id);
    if (!text) return;
    
    text.x = fromX * this.tileSize + this.tileSize / 2;
    text.y = fromY * this.tileSize + this.tileSize / 2;
    
    if (hpText) {
      hpText.x = fromX * this.tileSize + this.tileSize / 2;
      hpText.y = fromY * this.tileSize + this.tileSize / 2 - 10;
    }
    
    // Simple linear animation
    const targetX = toX * this.tileSize + this.tileSize / 2;
    const targetY = toY * this.tileSize + this.tileSize / 2;
    
    const duration = 60; // ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      text.x = text.x + (targetX - text.x) * progress;
      text.y = text.y + (targetY - text.y) * progress;
      
      if (hpText) {
        hpText.x = hpText.x + (targetX - hpText.x) * progress;
        hpText.y = hpText.y + (targetY - 10 - hpText.y) * progress;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
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
    
    // Calculate direction toward target
    const dx = targetX * this.tileSize + this.tileSize / 2 - originalX;
    const dy = targetY * this.tileSize + this.tileSize / 2 - originalY;
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
  
  addMessage(message: string) {
    this.messages.push(message);
    
    // Keep only last 5 messages
    if (this.messages.length > 5) {
      this.messages.shift();
    }
    
    // Update message display
    this.messageText.text = this.messages.join('\n');
  }
  
  showFloatingDamage(entity: Entity, damage: number) {
    const damageText = new Text(`-${damage}`, {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 18,
      fill: 0xFF4444,
      align: 'center'
    });
    
    const startX = entity.x * this.tileSize + this.tileSize / 2;
    const startY = entity.y * this.tileSize + this.tileSize / 2 - 5;
    
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
        this.entityContainer.removeChild(damageText);
      }
    };
    
    requestAnimationFrame(float);
  }
}