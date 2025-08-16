// Demo script to show the new enemy system capabilities
import { CreateEntity } from '../entities/CreateEntity';
import { EnemyLoader } from '../loaders/EnemyLoader';
import { Logger } from '../utils/Logger';

Logger.info('=== Enemy System Demo ===\n');

// Show all available enemy types
const enemyTypes = CreateEntity.getAvailableEnemyTypes();
Logger.info('Available Enemy Types:');
enemyTypes.forEach(type => {
  const definition = EnemyLoader.getEnemyDefinition(type);
  if (definition) {
    Logger.info(`- ${type}: ${definition.name} ${definition.glyph} (${definition.description})`);
  }
});

Logger.info('\n=== Sample Enemy Stats Generation ===\n');

// Generate sample stats for each enemy type
enemyTypes.forEach(type => {
  Logger.info(`${type.toUpperCase()}:`);
  const definition = EnemyLoader.getEnemyDefinition(type);
  if (definition) {
    Logger.info(`  Base Ranges: HP=${definition.stats.hp}, AC=${definition.stats.ac}, STR=${definition.stats.strength}`);
    
    // Generate 3 sample stat blocks
    for (let i = 1; i <= 3; i++) {
      const stats = EnemyLoader.generateEnemyStats(type);
      if (stats) {
        Logger.info(`  Sample ${i}: HP=${stats.hp}/${stats.maxHp}, AC=${stats.ac}, STR=${stats.strength}, DEX=${stats.dexterity}, CON=${stats.constitution}`);
      }
    }
  }
  Logger.info('');
});

export {};