import { Entity } from '../../types';
import { ResourceManager } from '../../managers/ResourceManager';
import { FontSystem } from '../../systems/font/FontSystem';

export class CharacterPortrait {
  /**
   * Get character portrait emoji based on current health percentage and status
   */
  static getPortraitEmoji(entity: Entity): string {
    const currentHp = ResourceManager.getCurrentValue(entity, 'hp');
    const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || currentHp;
    const healthPercentage = currentHp / maxHp;
    
    // Dead
    if (ResourceManager.isAtMinimum(entity, 'hp')) {
      return FontSystem.convertToTextmode('😵');
    }
    
    // Critical health (below 25%)
    if (healthPercentage <= 0.25) {
      return FontSystem.convertToTextmode('😰');
    }
    
    // Low health (25-50%)
    if (healthPercentage <= 0.5) {
      return FontSystem.convertToTextmode('😟');
    }
    
    // Moderate health (50-75%)
    if (healthPercentage <= 0.75) {
      return FontSystem.convertToTextmode('😐'); // Neutral face
    }
    
    // High health (75-90%)
    if (healthPercentage <= 0.9) {
      return FontSystem.convertToTextmode('🙂'); // Slightly smiling face
    }
    
    // Full health (90-100%)
    return FontSystem.convertToTextmode('😊'); // Smiling face with smiling eyes
  }
  
  /**
   * Get portrait with special status effects (for future expansion)
   */
  static getPortraitWithStatus(entity: Entity, statusEffects: string[] = []): string {
    // Base portrait
    let portrait = this.getPortraitEmoji(entity);
    
    // Override with status effects if present
    if (statusEffects.includes('poisoned')) {
      portrait = FontSystem.convertToTextmode('🤢'); // Nauseated face
    } else if (statusEffects.includes('stunned')) {
      portrait = FontSystem.convertToTextmode('😵‍💫'); // Dizzy face
    } else if (statusEffects.includes('angry')) {
      portrait = FontSystem.convertToTextmode('😠'); // Angry face
    } else if (statusEffects.includes('blessed')) {
      portrait = FontSystem.convertToTextmode('😇'); // Smiling face with halo
    } else if (statusEffects.includes('confused')) {
      portrait = FontSystem.convertToTextmode('😕'); // Confused face
    }
    
    return portrait;
  }
  
  /**
   * Get all available portrait emojis for reference
   */
  static getAllPortraitEmojis(): { [key: string]: string } {
    return {
      'excellent': '😊',
      'good': '🙂',
      'neutral': '😐',
      'worried': '😟',
      'critical': '😰',
      'dead': '😵',
      'poisoned': '🤢',
      'stunned': '😵‍💫',
      'angry': '😠',
      'blessed': '😇',
      'confused': '😕'
    };
  }
}