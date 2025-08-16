import { Tile, Entity, TileVisibility } from '../../types';

export interface IRenderer {
  // Core properties
  app?: any; // For PixiJS compatibility
  tileSize: number;
  gridWidth: number;
  gridHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  
  // Camera properties
  readonly cameraX: number;
  readonly cameraY: number;
  
  // PixiJS-specific properties (optional for other renderers)
  characterSheet?: any;
  entityTextMap?: Map<string, any>;
  hpTextMap?: Map<string, any>;
  
  // Core rendering methods
  renderTile(worldX: number, worldY: number, tile: Tile, visibility: TileVisibility): void;
  renderEntity(entity: Entity, visible: boolean): void;
  renderEntityWithVisibility(entity: Entity, distance: number, hasLOS: boolean): void;
  renderTileWithVisibility(worldX: number, worldY: number, tile: Tile, distance: number, hasLOS: boolean): void;
  
  // Clearing methods
  clearTiles(): void;
  clearEntities(): void;
  removeEntity(entityId: string): void;
  
  // Animation methods
  animateMove(entity: Entity, fromX: number, fromY: number, toX: number, toY: number): void;
  shakeEntity(entity: Entity): void;
  nudgeEntity(entity: Entity, targetX: number, targetY: number): void;
  showFloatingDamage(entity: Entity, damage: number): void;
  
  // Camera methods
  updateCameraForPlayer(entity: Entity): boolean;
  centerCameraOn(entity: Entity): void;
  worldToScreen(worldX: number, worldY: number): {x: number, y: number};
  screenToWorld(screenX: number, screenY: number): {x: number, y: number};
  
  // UI methods
  addMessage(message: string): void;
  updatePositionText(x: number, y: number): void;
  updateVisibilityAlpha(playerX: number, playerY: number, tileMap: any, lineOfSight: any): void;
  
  // Position tracking
  updateEntityPositions(): void;
  
  // Utility methods
  darkenColor(color: number, factor: number): number;
  
  // Renderer capabilities
  needsEntityClearingEachFrame?(): boolean;
  hasNativeLOS?(): boolean;
  setLightPassesFunction?(lightPasses: (x: number, y: number) => boolean): void;
  render?(): void; // Optional render method for double-buffered renderers
}