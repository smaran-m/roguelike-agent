import { Entity } from '../types';

export class CharacterPortrait {
  /**
   * Get character portrait emoji based on current health percentage and status
   */
  static getPortraitEmoji(entity: Entity): string {
    const healthPercentage = entity.stats.hp / entity.stats.maxHp;
    
    // Dead
    if (entity.stats.hp <= 0) {
      return '😵'; // Dead face
    }
    
    // Critical health (below 25%)
    if (healthPercentage <= 0.25) {
      return '😰'; // Anxious face with sweat
    }
    
    // Low health (25-50%)
    if (healthPercentage <= 0.5) {
      return '😟'; // Worried face
    }
    
    // Moderate health (50-75%)
    if (healthPercentage <= 0.75) {
      return '😐'; // Neutral face
    }
    
    // High health (75-90%)
    if (healthPercentage <= 0.9) {
      return '🙂'; // Slightly smiling face
    }
    
    // Full health (90-100%)
    return '😊'; // Smiling face with smiling eyes
  }
  
  /**
   * Get portrait with special status effects (for future expansion)
   */
  static getPortraitWithStatus(entity: Entity, statusEffects: string[] = []): string {
    // Base portrait
    let portrait = this.getPortraitEmoji(entity);
    
    // Override with status effects if present
    if (statusEffects.includes('poisoned')) {
      portrait = '🤢'; // Nauseated face
    } else if (statusEffects.includes('stunned')) {
      portrait = '😵‍💫'; // Dizzy face
    } else if (statusEffects.includes('angry')) {
      portrait = '😠'; // Angry face
    } else if (statusEffects.includes('blessed')) {
      portrait = '😇'; // Smiling face with halo
    } else if (statusEffects.includes('confused')) {
      portrait = '😕'; // Confused face
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