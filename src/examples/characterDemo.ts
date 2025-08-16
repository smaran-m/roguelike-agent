// Demo script to show the new character system capabilities
import { CharacterManager } from '../managers/CharacterManager';
import { CreateEntity } from '../entities/CreateEntity';
import { Logger } from '../utils/Logger';

Logger.info('=== Character System Demo ===\n');

const characterManager = CharacterManager.getInstance();

// Show all available character classes
const classes = CreateEntity.getAvailableCharacterClasses();
Logger.info('Available Character Classes:');
classes.forEach(className => {
  const classDef = characterManager.getCharacterClass(className);
  if (classDef) {
    Logger.info(`- ${className}: ${classDef.name} ${classDef.appearance.defaultGlyph}`);
    Logger.info(`  ${classDef.description}`);
    Logger.info(`  Base HP: ${classDef.baseStats.hp}, AC: ${classDef.baseStats.ac}`);
    Logger.info(`  Str: ${classDef.baseStats.strength}, Int: ${classDef.baseStats.intelligence}`);
    Logger.info('');
  }
});

Logger.info('=== Sample Character Generation ===\n');

// Create different character types
const characterTypes = [
  { name: 'Aragorn', class: 'warrior', glyph: '🤺' },
  { name: 'Gandalf', class: 'mage', glyph: '🧙' },
  { name: 'Legolas', class: 'ranger', glyph: '🏹' },
  { name: 'Gimli', class: 'cleric', glyph: '⛪' },
  { name: 'Bilbo', class: 'rogue', glyph: '🗡️' }
];

characterTypes.forEach(({ name, class: className, glyph }) => {
  characterManager.resetCharacter();
  const character = characterManager.createCharacter(name, className, {
    selectedGlyph: glyph,
    customName: name
  });
  
  if (character) {
    Logger.info(`${character.name} the ${character.className.toUpperCase()} ${character.appearance.glyph}`);
    Logger.info(`  Level ${character.level} - HP: ${character.stats.hp}/${character.stats.maxHp}, AC: ${character.stats.ac}`);
    Logger.info(`  STR: ${character.stats.strength}, DEX: ${character.stats.dexterity}, CON: ${character.stats.constitution}`);
    Logger.info(`  INT: ${character.stats.intelligence}, WIS: ${character.stats.wisdom}, CHA: ${character.stats.charisma}`);
    Logger.info(`  Features: ${character.features.join(', ')}`);
    Logger.info(`  Equipment: ${character.equipment.weapon}, ${character.equipment.armor}${character.equipment.shield ? ', shield' : ''}`);
    
    // Demo level progression
    characterManager.addExperience(1000);
    const leveledUp = characterManager.getCurrentCharacter();
    if (leveledUp && leveledUp.level > 1) {
      Logger.info(`  -> LEVELED UP! Now Level ${leveledUp.level} with ${leveledUp.stats.maxHp} HP`);
    }
    
    Logger.info('');
  }
});

Logger.info('=== Character Customization Demo ===\n');

// Demo appearance customization
characterManager.resetCharacter();
const customCharacter = characterManager.createCharacter('Arthas', 'warrior');
if (customCharacter) {
  Logger.info(`Original: ${customCharacter.name} ${customCharacter.appearance.glyph}`);
  
  const availableGlyphs = characterManager.getAvailableGlyphs();
  Logger.info(`Available glyphs for ${customCharacter.className}:`, availableGlyphs);
  
  // Change appearance
  characterManager.updateAppearance('🛡️', '0x800080');
  const updated = characterManager.getCurrentCharacter();
  Logger.info(`Updated: ${updated?.name} ${updated?.appearance.glyph} (color changed to purple)`);
  
  // Save and load demo
  const savedData = characterManager.saveCharacter();
  Logger.info('\nCharacter saved to JSON (first 100 chars):');
  Logger.info(savedData?.substring(0, 100) + '...');
}

export {};