import { Application, Container, Graphics, Text } from 'pixi.js';
import { Tile, Entity } from '../types';

export class Renderer {
  app: Application;
  tileSize: number = 16;
  gridWidth: number;
  gridHeight: number;
  tileContainer: Container;
  entityContainer: Container;
  entityTextMap: Map<string, Text> = new Map(); // Track text objects by entity ID
  hpTextMap: Map<string, Text> = new Map(); // Track HP text objects by entity ID
  
  constructor(width: number, height: number) {
    this.gridWidth = width;
    this.gridHeight = height;
    
    this.app = new Application({
      width: width * this.tileSize,
      height: height * this.tileSize,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    // Layer containers
    this.tileContainer = new Container();
    this.entityContainer = new Container();
    
    this.app.stage.addChild(this.tileContainer);
    this.app.stage.addChild(this.entityContainer);
    
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
      fontSize: tile.isEmoji ? 14 : 12,
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
      fontSize: entity.isEmoji ? 14 : 12,
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
    
    // Render HP above entity
    const hpText = new Text(entity.stats.hp.toString(), {
      fontFamily: 'Noto Sans Mono',
      fontSize: 10,
      fill: 0xFFFFFF,
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
    if (!text) return;
    
    const originalX = text.x;
    const shakeAmount = 2;
    const duration = 100;
    
    let startTime = performance.now();
    
    const shake = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        text.x = originalX + (Math.random() - 0.5) * shakeAmount * 2;
        requestAnimationFrame(shake);
      } else {
        text.x = originalX;
      }
    };
    
    requestAnimationFrame(shake);
  }
}