import { Entity } from '../../types';
import { Text, Container } from 'pixi.js';
import { getFontFamily } from '../../config/fonts';

export interface AnimationTarget {
  entity: Entity;
  text: Text;
  hpText?: Text;
}

export interface RippleAnimation {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  amplitude: number;
  frequency: number;
}

export interface ColorRippleAnimation {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color: number;
  intensity: number;
  radius: number;
}

export interface LinearWaveAnimation {
  startX: number;
  startY: number;
  direction: number; // angle in radians
  length: number;
  waveWidth: number; // width of the wave beam
  startTime: number;
  duration: number;
  amplitude: number;
  speed: number;
}

export interface ConicalWaveAnimation {
  startX: number;
  startY: number;
  startAngle: number; // start angle in degrees
  endAngle: number; // end angle in degrees
  length: number;
  startTime: number;
  duration: number;
  amplitude: number;
  speed: number;
}

export interface TileAnimationData {
  originalBgY: number;
  originalTextY: number;
  originalBgColor?: number;
  originalTextColor?: number;
  currentOffset: number;
  currentBgColor?: number;
  currentTextColor?: number;
  rotationAngle?: number;
}

export class AnimationSystem {
  private tileSize: number;
  private entityContainer: Container;
  private entityTextMap: Map<string, Text>;
  private hpTextMap: Map<string, Text>;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private activeRipples: RippleAnimation[] = [];
  private activeColorRipples: ColorRippleAnimation[] = [];
  private activeLinearWaves: LinearWaveAnimation[] = [];
  private activeConicalWaves: ConicalWaveAnimation[] = [];
  private tileGraphicsMap?: Map<string, {bg: any, text: any, originalColor: number}>;
  private tileAnimations: Map<string, TileAnimationData> = new Map();

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
      fontFamily: getFontFamily(),
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

  startRipple(x: number, y: number) {
    const ripple: RippleAnimation = {
      x,
      y,
      startTime: performance.now(),
      duration: 4500, // 1.5 second ripple (longer for better visibility)
      amplitude: 60, // maximum bounce height in pixels (more visible)
      frequency: 0.8 // ripple frequency multiplier
    };
    
    this.activeRipples.push(ripple);
    console.log(`🌊 Death ripple started at (${x}, ${y})`);
  }

  updateRipples(currentTime: number = performance.now()): Map<string, number> {
    const rippleOffsets = new Map<string, number>();
    
    // Remove completed ripples
    const initialRippleCount = this.activeRipples.length;
    this.activeRipples = this.activeRipples.filter(ripple => {
      const elapsed = currentTime - ripple.startTime;
      return elapsed < ripple.duration;
    });
    
    if (initialRippleCount !== this.activeRipples.length) {
      console.log(`🌊 Ripples removed: ${initialRippleCount - this.activeRipples.length}, active: ${this.activeRipples.length}`);
    }
    
    // Calculate offsets for active ripples
    this.activeRipples.forEach((ripple, index) => {
      const elapsed = currentTime - ripple.startTime;
      const progress = elapsed / ripple.duration;
      
      if (progress < 1) {
        console.log(`🌊 Processing ripple ${index}: elapsed=${elapsed.toFixed(0)}ms, progress=${(progress*100).toFixed(1)}%`);
        // Calculate ripple effect in a radius around the death position
        const maxRadius = 6; // tiles affected by ripple
        
        for (let offsetX = -maxRadius; offsetX <= maxRadius; offsetX++) {
          for (let offsetY = -maxRadius; offsetY <= maxRadius; offsetY++) {
            const tileX = ripple.x + offsetX;
            const tileY = ripple.y + offsetY;
            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            
            if (distance <= maxRadius) {
              // Very simple test calculation - just a constant offset for debugging
              const key = `${tileX},${tileY}`;
              const testOffset = 10; // Simple 10px offset for all tiles in range
              rippleOffsets.set(key, testOffset);
              console.log(`🎯 Setting test offset for tile ${key}: ${testOffset}px`);
            }
          }
        }
      }
    });
    
    return rippleOffsets;
  }

  hasActiveRipples(): boolean {
    return this.activeRipples.length > 0 || this.activeColorRipples.length > 0 || this.activeLinearWaves.length > 0 || this.activeConicalWaves.length > 0;
  }

  setTileGraphicsMap(tileGraphicsMap: Map<string, {bg: any, text: any, originalColor: number}>) {
    this.tileGraphicsMap = tileGraphicsMap;
  }

  startColorFlash(x: number, y: number, color: number, intensity: number = 1.0, radius: number = 10) {
    if (!this.tileGraphicsMap) {
      console.log('❌ No tile graphics map available for color animations');
      return;
    }

    console.log(`🎨 Starting color flash at (${x}, ${y}) with color 0x${color.toString(16)}, intensity=${intensity}, radius=${radius}`);
    
    const colorRipple: ColorRippleAnimation = {
      x,
      y,
      startTime: performance.now(),
      duration: 2000, // 2 second color effect
      color,
      intensity,
      radius
    };
    
    this.activeColorRipples.push(colorRipple);
    this.animateColorFlash(colorRipple);
  }

  startColorRipple(x: number, y: number, color: number, intensity: number = 1.0, radius: number = 10) {
    if (!this.tileGraphicsMap) {
      console.log('❌ No tile graphics map available for color animations');
      return;
    }

    console.log(`🎨 Starting color ripple (wave front) at (${x}, ${y}) with color 0x${color.toString(16)}, radius=${radius}`);
    
    // Initialize tile animations for all tiles in radius
    for (let offsetX = -radius; offsetX <= radius; offsetX++) {
      for (let offsetY = -radius; offsetY <= radius; offsetY++) {
        const tileX = x + offsetX;
        const tileY = y + offsetY;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        
        if (distance <= radius) {
          const key = `${tileX},${tileY}`;
          const tileGraphics = this.tileGraphicsMap.get(key);
          
          if (tileGraphics && !this.tileAnimations.has(key)) {
            this.tileAnimations.set(key, {
              originalBgY: tileGraphics.bg.y,
              originalTextY: tileGraphics.text.y,
              currentOffset: 0
            });
          }
        }
      }
    }
    
    this.animateColorRippleWave(x, y, color, intensity, radius, performance.now(), 3000);
  }

  startLinearWave(startX: number, startY: number, direction: number, length: number, amplitude: number = 4, waveWidth: number = 1) {
    if (!this.tileGraphicsMap) {
      console.log('❌ No tile graphics map available for linear wave animations');
      return;
    }

    console.log(`🌊 Starting linear wave from (${startX}, ${startY}) direction ${direction} rad, length ${length}, amplitude ${amplitude}, width ${waveWidth}`);
    
    // Initialize tile animations for all tiles that will be affected by the wave
    const perpDir = direction + Math.PI / 2;
    
    for (let distance = 0; distance <= length; distance += 0.5) {
      for (let width = -waveWidth; width <= waveWidth; width += 0.5) {
        const x = Math.round(startX + Math.cos(direction) * distance + Math.cos(perpDir) * width);
        const y = Math.round(startY + Math.sin(direction) * distance + Math.sin(perpDir) * width);
        const key = `${x},${y}`;
        const tileGraphics = this.tileGraphicsMap.get(key);
        
        if (tileGraphics && !this.tileAnimations.has(key)) {
          this.tileAnimations.set(key, {
            originalBgY: tileGraphics.bg.y,
            originalTextY: tileGraphics.text.y,
            currentOffset: 0
          });
          console.log(`🎯 Linear wave: Set up animation for tile ${key}`);
        }
      }
    }
    
    const linearWave: LinearWaveAnimation = {
      startX,
      startY,
      direction,
      length,
      waveWidth,
      startTime: performance.now(),
      duration: 4000, // 4 second wave for better visibility
      amplitude,
      speed: 5 // slower speed - 5 tiles per second for better visibility
    };
    
    this.activeLinearWaves.push(linearWave);
    this.animateLinearWave(linearWave);
  }

  startConicalWave(startX: number, startY: number, startAngle: number, endAngle: number, length: number, amplitude: number = 6) {
    if (!this.tileGraphicsMap) {
      console.log('❌ No tile graphics map available for conical wave animations');
      return;
    }

    console.log(`🎆 Starting conical wave from (${startX}, ${startY}) angles ${startAngle}°-${endAngle}°, length ${length}, amplitude ${amplitude}`);
    
    // Convert degrees to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    // Initialize tile animations for all tiles that will be affected by the conical wave
    let tilesInitialized = 0;
    
    for (let distance = 1; distance <= length; distance += 0.5) { // Start from 1 to avoid division by zero
      // Calculate angle step based on distance for good coverage
      const circumference = 2 * Math.PI * distance;
      const angleStep = Math.max(0.05, (endRad - startRad) / Math.max(10, distance * 2)); // More granular
      
      for (let angle = startRad; angle <= endRad; angle += angleStep) {
        const x = Math.round(startX + Math.cos(angle) * distance);
        const y = Math.round(startY + Math.sin(angle) * distance);
        const key = `${x},${y}`;
        const tileGraphics = this.tileGraphicsMap.get(key);
        
        if (tileGraphics && !this.tileAnimations.has(key)) {
          this.tileAnimations.set(key, {
            originalBgY: tileGraphics.bg.y,
            originalTextY: tileGraphics.text.y,
            currentOffset: 0
          });
          tilesInitialized++;
        }
      }
    }
    
    console.log(`🎯 Conical wave: Initialized ${tilesInitialized} tiles for animation`);
    
    const conicalWave: ConicalWaveAnimation = {
      startX,
      startY,
      startAngle,
      endAngle,
      length,
      startTime: performance.now(),
      duration: 4000, // 4 second wave
      amplitude,
      speed: 6 // tiles per second
    };
    
    this.activeConicalWaves.push(conicalWave);
    this.animateConicalWave(conicalWave);
  }

  startTileRipple(x: number, y: number) {
    if (!this.tileGraphicsMap) {
      console.log('❌ No tile graphics map available for animations');
      return;
    }

    console.log(`🌊 Starting tile ripple animation at (${x}, ${y})`);
    
    const maxRadius = 25; // Much larger to fill screen (viewport is ~20x20)
    const duration = 4500; // Match your updated duration
    const amplitude = 6; // Slightly larger but still reasonable
    
    // Set up tile animations for all tiles in radius
    for (let offsetX = -maxRadius; offsetX <= maxRadius; offsetX++) {
      for (let offsetY = -maxRadius; offsetY <= maxRadius; offsetY++) {
        const tileX = x + offsetX;
        const tileY = y + offsetY;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        
        if (distance <= maxRadius) {
          const key = `${tileX},${tileY}`;
          const tileGraphics = this.tileGraphicsMap.get(key);
          
          if (tileGraphics) {
            // Store original positions if not already stored
            if (!this.tileAnimations.has(key)) {
              this.tileAnimations.set(key, {
                originalBgY: tileGraphics.bg.y,
                originalTextY: tileGraphics.text.y,
                currentOffset: 0
              });
            }
            
            console.log(`🎯 Setting up animation for tile ${key}`);
          }
        }
      }
    }
    
    // Start the animation loop
    this.animateTileRipple(x, y, performance.now(), duration, amplitude);
  }

  private animateTileRipple(centerX: number, centerY: number, startTime: number, duration: number, amplitude: number) {
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        // Calculate animation for all tiles in radius
        const maxRadius = 25; // Match the setup radius
        let animatedCount = 0;
        
        for (let offsetX = -maxRadius; offsetX <= maxRadius; offsetX++) {
          for (let offsetY = -maxRadius; offsetY <= maxRadius; offsetY++) {
            const tileX = centerX + offsetX;
            const tileY = centerY + offsetY;
            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            
            if (distance <= maxRadius) {
              const key = `${tileX},${tileY}`;
              const tileGraphics = this.tileGraphicsMap?.get(key);
              const animData = this.tileAnimations.get(key);
              
              if (tileGraphics && animData) {
                // Proper wave propagation - wave moves outward from center
                const waveSpeed = 12; // tiles per second (faster for larger area)
                const waveProgress = (elapsed / 1000) * waveSpeed;
                
                // Distance from current wave front
                const distanceFromWave = Math.abs(distance - waveProgress);
                
                // Only animate tiles near the wave front
                if (distanceFromWave < 2.0) {
                  const timeInSeconds = elapsed / 1000;
                  const waveFrequency = 6; // oscillations per second
                  
                  // Add phase delay based on distance from center for wave effect
                  const phaseDelay = distance * 0.5; // stagger the wave
                  const wavePhase = (timeInSeconds - phaseDelay) * waveFrequency * Math.PI * 2;
                  
                  // Wave intensity decreases with distance from wave front and over time
                  const waveFrontIntensity = Math.exp(-distanceFromWave * 1.5);
                  const timeIntensity = 1 - (progress * 0.7);
                  const waveIntensity = waveFrontIntensity * timeIntensity;
                  
                  const bounceOffset = Math.sin(wavePhase) * amplitude * waveIntensity;
                  
                  // Apply to both background and text, but check bounds
                  const newBgY = animData.originalBgY + bounceOffset;
                  const newTextY = animData.originalTextY + bounceOffset;
                  
                  // Ensure text stays within reasonable bounds
                  if (newTextY > 0 && newTextY < 1000) {
                    tileGraphics.bg.y = newBgY;
                    tileGraphics.text.y = newTextY;
                    animData.currentOffset = bounceOffset;
                    animatedCount++;
                  }
                } else {
                  // Reset tiles that are not near the wave front
                  tileGraphics.bg.y = animData.originalBgY;
                  tileGraphics.text.y = animData.originalTextY;
                  animData.currentOffset = 0;
                }
              }
            }
          }
        }
        
        if (animatedCount > 0) {
          console.log(`🌊 Animating ${animatedCount} tiles, progress: ${(progress * 100).toFixed(1)}%`);
        }
        
        requestAnimationFrame(animate);
      } else {
        // Animation complete - reset tiles to original positions
        console.log('🏁 Ripple animation complete, resetting tiles');
        this.resetTileAnimations();
      }
    };
    
    requestAnimationFrame(animate);
  }

  private resetTileAnimations() {
    this.tileAnimations.forEach((animData, key) => {
      const tileGraphics = this.tileGraphicsMap?.get(key);
      if (tileGraphics) {
        tileGraphics.bg.y = animData.originalBgY;
        tileGraphics.text.y = animData.originalTextY;
        // Reset background tint to white (no color change)
        tileGraphics.bg.tint = 0xFFFFFF;
      }
    });
    this.tileAnimations.clear();
  }

  private animateColorFlash(colorRipple: ColorRippleAnimation) {
    let frameCount = 0;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - colorRipple.startTime;
      const progress = elapsed / colorRipple.duration;
      frameCount++;
      
      if (progress < 1) {
        let tilesModified = 0;
        
        // Color ripple effect - flash and fade
        for (let offsetX = -colorRipple.radius; offsetX <= colorRipple.radius; offsetX++) {
          for (let offsetY = -colorRipple.radius; offsetY <= colorRipple.radius; offsetY++) {
            const tileX = colorRipple.x + offsetX;
            const tileY = colorRipple.y + offsetY;
            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            
            if (distance <= colorRipple.radius) {
              const key = `${tileX},${tileY}`;
              const tileGraphics = this.tileGraphicsMap?.get(key);
              
              if (tileGraphics) {
                // Store original color if not already stored
                if (!this.tileAnimations.has(key)) {
                  this.tileAnimations.set(key, {
                    originalBgY: tileGraphics.bg.y,
                    originalTextY: tileGraphics.text.y,
                    originalTextColor: tileGraphics.originalColor,
                    currentOffset: 0
                  });
                }
                
                // Calculate color intensity based on distance and time
                const distanceIntensity = Math.max(0, 1 - (distance / colorRipple.radius));
                const timeIntensity = Math.sin(progress * Math.PI); // Fade in and out
                const totalIntensity = distanceIntensity * timeIntensity * colorRipple.intensity;
                
                // Change background color using tint for dramatic visual effect
                if (totalIntensity > 0.1) {
                  tileGraphics.bg.tint = 0xFF0000; // Pure red background using tint
                  if (frameCount === 1) { // Only log once per tile
                    console.log(`🎨 Setting tile ${key} background tint to red`);
                    console.log(`🎨 Background graphics:`, tileGraphics.bg);
                  }
                } else {
                  tileGraphics.bg.tint = 0xFFFFFF; // Reset to white tint (no color change)
                }
                tilesModified++;
              }
            }
          }
        }
        
        if (frameCount % 30 === 0) { // Log every 30 frames (~every 0.5 seconds)
          console.log(`🎨 Color ripple frame ${frameCount}: progress=${(progress*100).toFixed(1)}%, tiles modified: ${tilesModified}`);
        }
        
        requestAnimationFrame(animate);
      } else {
        // Animation complete - remove from active list
        console.log(`🎨 Color ripple animation complete after ${frameCount} frames`);
        this.activeColorRipples = this.activeColorRipples.filter(r => r !== colorRipple);
        this.resetColorAnimations();
      }
    };
    
    requestAnimationFrame(animate);
  }

  private animateLinearWave(wave: LinearWaveAnimation) {
    let frameCount = 0;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - wave.startTime;
      const progress = elapsed / wave.duration;
      frameCount++;
      
      if (progress < 1) {
        const waveProgress = (elapsed / 1000) * wave.speed;
        let tilesAnimated = 0;
        
        // Calculate perpendicular direction for wave width
        const perpDir = wave.direction + Math.PI / 2;
        const waveWidth = wave.waveWidth; // use the wave's width parameter
        
        for (let distance = 0; distance <= wave.length; distance += 0.5) {
          for (let width = -waveWidth; width <= waveWidth; width += 0.5) {
            // Calculate position along the wave line
            const x = Math.round(wave.startX + Math.cos(wave.direction) * distance + Math.cos(perpDir) * width);
            const y = Math.round(wave.startY + Math.sin(wave.direction) * distance + Math.sin(perpDir) * width);
            
            const key = `${x},${y}`;
            const tileGraphics = this.tileGraphicsMap?.get(key);
            const animData = this.tileAnimations.get(key);
            
            if (tileGraphics && animData) {
              // Check if wave front has reached this position
              const distanceFromWave = Math.abs(distance - waveProgress);
              
              if (distanceFromWave < 2.0) {
                const timeInSeconds = elapsed / 1000;
                const wavePhase = (timeInSeconds - distance * 0.1) * 6 * Math.PI * 2;
                const widthIntensity = Math.max(0, 1 - Math.abs(width) / waveWidth);
                const waveIntensity = Math.exp(-distanceFromWave * 1.5) * (1 - progress * 0.7) * widthIntensity;
                
                const bounceOffset = Math.sin(wavePhase) * wave.amplitude * waveIntensity;
                
                tileGraphics.bg.y = animData.originalBgY + bounceOffset;
                tileGraphics.text.y = animData.originalTextY + bounceOffset;
                tilesAnimated++;
              }
            }
          }
        }
        
        if (frameCount % 30 === 0) { // Log every 30 frames
          console.log(`🌊 Linear wave frame ${frameCount}: progress=${(progress*100).toFixed(1)}%, waveProgress=${waveProgress.toFixed(1)}, tiles animated: ${tilesAnimated}`);
        }
        
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        console.log(`🌊 Linear wave animation complete after ${frameCount} frames`);
        this.activeLinearWaves = this.activeLinearWaves.filter(w => w !== wave);
      }
    };
    
    requestAnimationFrame(animate);
  }

  private blendColors(color1: number, color2: number, factor: number): number {
    const r1 = (color1 >> 16) & 0xFF;
    const g1 = (color1 >> 8) & 0xFF;
    const b1 = color1 & 0xFF;
    
    const r2 = (color2 >> 16) & 0xFF;
    const g2 = (color2 >> 8) & 0xFF;
    const b2 = color2 & 0xFF;
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return (r << 16) | (g << 8) | b;
  }

  private resetColorAnimations() {
    // Reset any color-modified tiles back to white tint (no color change)
    this.tileAnimations.forEach((animData, key) => {
      const tileGraphics = this.tileGraphicsMap?.get(key);
      if (tileGraphics) {
        tileGraphics.bg.tint = 0xFFFFFF; // Reset background tint to white
      }
    });
  }

  private animateColorRippleWave(centerX: number, centerY: number, color: number, intensity: number, radius: number, startTime: number, duration: number) {
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        // Calculate animation for all tiles in radius using wave front
        let tilesColored = 0;
        
        for (let offsetX = -radius; offsetX <= radius; offsetX++) {
          for (let offsetY = -radius; offsetY <= radius; offsetY++) {
            const tileX = centerX + offsetX;
            const tileY = centerY + offsetY;
            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            
            if (distance <= radius) {
              const key = `${tileX},${tileY}`;
              const tileGraphics = this.tileGraphicsMap?.get(key);
              
              if (tileGraphics) {
                // Color wave propagation - similar to position ripple
                const waveSpeed = 8; // tiles per second
                const waveProgress = (elapsed / 1000) * waveSpeed;
                
                // Distance from current wave front
                const distanceFromWave = Math.abs(distance - waveProgress);
                
                // Only color tiles near the wave front
                if (distanceFromWave < 1.5) {
                  const waveFrontIntensity = Math.exp(-distanceFromWave * 2);
                  const timeIntensity = 1 - (progress * 0.5);
                  const colorIntensity = waveFrontIntensity * timeIntensity * intensity;
                  
                  if (colorIntensity > 0.1) {
                    tileGraphics.bg.tint = color;
                    tilesColored++;
                  } else {
                    tileGraphics.bg.tint = 0xFFFFFF;
                  }
                } else {
                  tileGraphics.bg.tint = 0xFFFFFF;
                }
              }
            }
          }
        }
        
        if (tilesColored > 0) {
          console.log(`🎨 Color ripple wave: ${tilesColored} tiles colored, progress: ${(progress * 100).toFixed(1)}%`);
        }
        
        requestAnimationFrame(animate);
      } else {
        // Animation complete - reset colors
        console.log('🎨 Color ripple wave animation complete');
        this.resetColorAnimations();
      }
    };
    
    requestAnimationFrame(animate);
  }

  private animateConicalWave(wave: ConicalWaveAnimation) {
    let frameCount = 0;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - wave.startTime;
      const progress = elapsed / wave.duration;
      frameCount++;
      
      if (progress < 1) {
        const waveProgress = (elapsed / 1000) * wave.speed;
        let tilesAnimated = 0;
        
        // Convert degrees to radians
        const startRad = (wave.startAngle * Math.PI) / 180;
        const endRad = (wave.endAngle * Math.PI) / 180;
        
        for (let distance = 1; distance <= wave.length; distance += 0.5) { // Start from 1
          const angleStep = Math.max(0.05, (endRad - startRad) / Math.max(10, distance * 2));
          
          for (let angle = startRad; angle <= endRad; angle += angleStep) {
            const x = Math.round(wave.startX + Math.cos(angle) * distance);
            const y = Math.round(wave.startY + Math.sin(angle) * distance);
            
            const key = `${x},${y}`;
            const tileGraphics = this.tileGraphicsMap?.get(key);
            const animData = this.tileAnimations.get(key);
            
            if (tileGraphics && animData) {
              // Check if wave front has reached this position
              const distanceFromWave = Math.abs(distance - waveProgress);
              
              if (distanceFromWave < 2.0) {
                const timeInSeconds = elapsed / 1000;
                const wavePhase = (timeInSeconds - distance * 0.1) * 5 * Math.PI * 2;
                const waveIntensity = Math.exp(-distanceFromWave * 1.5) * (1 - progress * 0.7);
                
                const bounceOffset = Math.sin(wavePhase) * wave.amplitude * waveIntensity;
                
                tileGraphics.bg.y = animData.originalBgY + bounceOffset;
                tileGraphics.text.y = animData.originalTextY + bounceOffset;
                tilesAnimated++;
              }
            }
          }
        }
        
        if (frameCount % 30 === 0) { // Log every 30 frames
          console.log(`🎆 Conical wave frame ${frameCount}: progress=${(progress*100).toFixed(1)}%, waveProgress=${waveProgress.toFixed(1)}, tiles animated: ${tilesAnimated}`);
        }
        
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        console.log(`🎆 Conical wave animation complete after ${frameCount} frames`);
        this.activeConicalWaves = this.activeConicalWaves.filter(w => w !== wave);
      }
    };
    
    requestAnimationFrame(animate);
  }
}