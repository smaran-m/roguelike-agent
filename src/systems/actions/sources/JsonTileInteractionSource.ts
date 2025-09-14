import {
  Action,
  ActionContext,
  IActionSource
} from '../ActionTypes';
import { Tile } from '../../../types';
import { Logger } from '../../../utils/Logger';

interface TileInteractionDefinition {
  id: string;
  glyph: string;
  name: string;
  description: string;
  interactions: any[]; // Use any[] to allow JSON import, will be cast to Action[] internally
}

interface TileInteractionCollection {
  [tileId: string]: TileInteractionDefinition;
}

/**
 * JSON-driven tile interaction source
 * Reads tile interaction definitions from JSON and provides contextual actions
 */
export class JsonTileInteractionSource implements IActionSource {
  readonly id = 'json_tile_interactions';
  readonly priority = 70; // Medium priority

  private tileInteractions: TileInteractionCollection;
  private logger: Logger;

  constructor(tileInteractionsData: TileInteractionCollection, logger: Logger) {
    this.tileInteractions = tileInteractionsData;
    this.logger = logger;
    this.logger.info('JsonTileInteractionSource initialized', {
      tileInteractionCount: Object.keys(this.tileInteractions).length
    });
  }

  canActivate(context: ActionContext): boolean {
    // Available if there are nearby tiles with interactive properties
    return context.nearbyTiles.length > 0;
  }

  getAvailableActions(context: ActionContext): Action[] {
    const availableActions: Action[] = [];

    for (const tileInfo of context.nearbyTiles) {
      const tileActions = this.getActionsForTile(tileInfo, context);
      availableActions.push(...tileActions);
    }

    this.logger.debug('Tile interaction actions discovered', {
      entityId: context.entity.id,
      nearbyTiles: context.nearbyTiles.length,
      availableActions: availableActions.length
    });

    return availableActions;
  }

  getDescription(): string {
    return 'Provides contextual actions based on nearby tiles using JSON configuration';
  }

  /**
   * Get all tile interaction definitions
   */
  getTileInteractionDefinitions(): TileInteractionCollection {
    return this.tileInteractions;
  }

  /**
   * Get a specific tile interaction definition
   */
  getTileInteractionDefinition(tileId: string): TileInteractionDefinition | null {
    return this.tileInteractions[tileId] || null;
  }

  /**
   * Update tile interactions from new JSON data
   */
  updateTileInteractions(tileInteractionsData: TileInteractionCollection): void {
    this.tileInteractions = tileInteractionsData;
    this.logger.info('Tile interactions updated', {
      tileInteractionCount: Object.keys(this.tileInteractions).length
    });
  }

  private getActionsForTile(
    tileInfo: { x: number; y: number; tile: Tile; distance: number },
    context: ActionContext
  ): Action[] {
    const actions: Action[] = [];
    const { x, y, tile } = tileInfo;

    // Find tile interaction definitions that match this tile
    for (const [tileId, tileDef] of Object.entries(this.tileInteractions)) {
      if (this.tileMatchesDefinition(tile, tileDef)) {
        // Add all interactions for this tile type
        for (const interaction of tileDef.interactions) {
          // Create a unique action ID that includes the tile position (cast to Action)
          const uniqueAction: Action = {
            ...(interaction as Action),
            id: `${interaction.id}_${x}_${y}`,
            source: `${this.id}:${tileId}`
          };

          // Validate that the action is appropriate for the current context
          if (this.isActionValidForContext(uniqueAction, context, tileInfo)) {
            actions.push(uniqueAction);
          }
        }

        this.logger.debug('Tile interaction found', {
          tileId,
          position: { x, y },
          interactionCount: tileDef.interactions.length,
          tileGlyph: tile.glyph
        });
      }
    }

    return actions;
  }

  private tileMatchesDefinition(tile: Tile, tileDef: TileInteractionDefinition): boolean {
    // Primary match: tile glyph matches definition glyph
    if (tile.glyph === tileDef.glyph) {
      return true;
    }

    // Additional matching logic can be added here for more complex matching
    // For example, checking tile properties or multiple glyphs per definition

    return false;
  }

  private isActionValidForContext(
    action: Action,
    context: ActionContext,
    tileInfo: { x: number; y: number; tile: Tile; distance: number }
  ): boolean {
    // Basic validation - check if action requirements could be met
    // More detailed requirement checking would be done during action execution

    // Check range requirements
    for (const requirement of action.requirements) {
      if (requirement.type === 'range') {
        const requiredRange = typeof requirement.value === 'number' ? requirement.value : 1;
        if (tileInfo.distance > requiredRange) {
          return false;
        }
      }

      // Additional requirement validation can be added here
      // For example, checking if player has required equipment
      if (requirement.type === 'equipment') {
        if (!this.hasRequiredEquipment(context, requirement.target)) {
          return false;
        }
      }
    }

    return true;
  }

  private hasRequiredEquipment(context: ActionContext, equipmentType?: string): boolean {
    if (!equipmentType) return true;

    // Check if player has required equipment type
    for (const item of context.equippedItems.values()) {
      // Simple equipment type matching
      if (equipmentType === 'container' &&
          (item.name.toLowerCase().includes('bottle') ||
           item.name.toLowerCase().includes('waterskin'))) {
        return true;
      }

      if (equipmentType === 'breaking_tool' &&
          item.type === 'weapon' &&
          (item.damageType === 'bludgeoning' || item.name.toLowerCase().includes('hammer'))) {
        return true;
      }

      if (equipmentType === 'disarming_tools' &&
          (item.abilities?.includes('Trap Disarming') ||
           item.name.toLowerCase().includes('thieves'))) {
        return true;
      }

      if (equipmentType === 'valuable_item' &&
          (item.rarity !== 'common' || (item.value && item.value > 10))) {
        return true;
      }
    }

    return false;
  }
}