import { Entity } from '../../types';
import { AnimationSystem } from '../animation/AnimationSystem';

export interface CameraState {
  cameraX: number;
  cameraY: number;
  viewportWidth: number;
  viewportHeight: number;
  gridWidth: number;
  gridHeight: number;
}

export class CameraSystem {
  private cameraX: number = 0;
  private cameraY: number = 0;
  private viewportWidth: number;
  private viewportHeight: number;
  private gridWidth: number;
  private gridHeight: number;
  private animationSystem: AnimationSystem;

  constructor(
    gridWidth: number,
    gridHeight: number,
    viewportWidth: number = 25,
    viewportHeight: number = 15,
    animationSystem: AnimationSystem
  ) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.animationSystem = animationSystem;
  }

  get x(): number {
    return this.cameraX;
  }

  get y(): number {
    return this.cameraY;
  }

  getCameraState(): CameraState {
    return {
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight
    };
  }

  updateForPlayer(entity: Entity): boolean {
    const oldCameraX = this.cameraX;
    const oldCameraY = this.cameraY;

    // Calculate player position relative to current camera
    const playerScreenX = entity.x - this.cameraX;
    const playerScreenY = entity.y - this.cameraY;

    // Camera movement thresholds (quarter of viewport)
    const quarterViewportX = Math.floor(this.viewportWidth / 4);
    const quarterViewportY = Math.floor(this.viewportHeight / 4);

    // Update camera X if player moves too close to edges
    if (playerScreenX < quarterViewportX) {
      this.cameraX = Math.max(0, entity.x - (this.viewportWidth - quarterViewportX));
    } else if (playerScreenX > this.viewportWidth - quarterViewportX) {
      this.cameraX = Math.min(this.gridWidth - this.viewportWidth, entity.x - quarterViewportX);
    }

    // Update camera Y if player moves too close to edges
    if (playerScreenY < quarterViewportY) {
      this.cameraY = Math.max(0, entity.y - (this.viewportHeight - quarterViewportY));
    } else if (playerScreenY > this.viewportHeight - quarterViewportY) {
      this.cameraY = Math.min(this.gridHeight - this.viewportHeight, entity.y - quarterViewportY);
    }

    // Check if camera moved and notify animation system
    const cameraMoved = oldCameraX !== this.cameraX || oldCameraY !== this.cameraY;
    if (cameraMoved) {
      this.animationSystem.updateCamera(this.cameraX, this.cameraY);
    }

    return cameraMoved;
  }

  setCenterOnEntity(entity: Entity) {
    const targetCameraX = entity.x - Math.floor(this.viewportWidth / 2);
    const targetCameraY = entity.y - Math.floor(this.viewportHeight / 2);

    // Clamp to valid ranges
    this.cameraX = Math.max(0, Math.min(this.gridWidth - this.viewportWidth, targetCameraX));
    this.cameraY = Math.max(0, Math.min(this.gridHeight - this.viewportHeight, targetCameraY));

    // Update animation system
    this.animationSystem.updateCamera(this.cameraX, this.cameraY);
  }

  // Testing-only methods for setting camera position directly
  setCameraX(x: number) {
    this.cameraX = Math.max(0, Math.min(this.gridWidth - this.viewportWidth, x));
    this.animationSystem.updateCamera(this.cameraX, this.cameraY);
  }

  setCameraY(y: number) {
    this.cameraY = Math.max(0, Math.min(this.gridHeight - this.viewportHeight, y));
    this.animationSystem.updateCamera(this.cameraX, this.cameraY);
  }

  setCameraPosition(x: number, y: number) {
    this.cameraX = Math.max(0, Math.min(this.gridWidth - this.viewportWidth, x));
    this.cameraY = Math.max(0, Math.min(this.gridHeight - this.viewportHeight, y));
    this.animationSystem.updateCamera(this.cameraX, this.cameraY);
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.cameraX,
      y: worldY - this.cameraY
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.cameraX,
      y: screenY + this.cameraY
    };
  }

  getVisibleTileBounds(): { startX: number; endX: number; startY: number; endY: number } {
    return {
      startX: Math.max(0, this.cameraX),
      endX: Math.min(this.gridWidth, this.cameraX + this.viewportWidth),
      startY: Math.max(0, this.cameraY),
      endY: Math.min(this.gridHeight, this.cameraY + this.viewportHeight)
    };
  }
}