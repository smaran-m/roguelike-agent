// Demo script to show the new character system capabilities
import { CharacterManager } from '../managers/CharacterManager';
import { CreateEntity } from '../entities/CreateEntity';

console.log('=== Character System Demo ===\n');

const characterManager = CharacterManager.getInstance();

// Show all available character classes
const classes = CreateEntity.getAvailableCharacterClasses();
console.log('Available Character Classes:');
classes.forEach(className => {
  const classDef = characterManager.getCharacterClass(className);
  if (classDef) {
    console.log(`- ${className}: ${classDef.name} ${classDef.appearance.defaultGlyph}`);
    console.log(`  ${classDef.description}`);
    console.log(`  Base HP: ${classDef.baseStats.hp}, AC: ${classDef.baseStats.ac}`);
    console.log(`  Str: ${classDef.baseStats.strength}, Int: ${classDef.baseStats.intelligence}`);
    console.log('');
  }
});

console.log('=== Sample Character Generation ===\n');

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
    console.log(`${character.name} the ${character.className.toUpperCase()} ${character.appearance.glyph}`);
    console.log(`  Level ${character.level} - HP: ${character.stats.hp}/${character.stats.maxHp}, AC: ${character.stats.ac}`);
    console.log(`  STR: ${character.stats.strength}, DEX: ${character.stats.dexterity}, CON: ${character.stats.constitution}`);
    console.log(`  INT: ${character.stats.intelligence}, WIS: ${character.stats.wisdom}, CHA: ${character.stats.charisma}`);
    console.log(`  Features: ${character.features.join(', ')}`);
    console.log(`  Equipment: ${character.equipment.weapon}, ${character.equipment.armor}${character.equipment.shield ? ', shield' : ''}`);
    
    // Demo level progression
    characterManager.addExperience(1000);
    const leveledUp = characterManager.getCurrentCharacter();
    if (leveledUp && leveledUp.level > 1) {
      console.log(`  -> LEVELED UP! Now Level ${leveledUp.level} with ${leveledUp.stats.maxHp} HP`);
    }
    
    console.log('');
  }
});

console.log('=== Character Customization Demo ===\n');

// Demo appearance customization
characterManager.resetCharacter();
const customCharacter = characterManager.createCharacter('Arthas', 'warrior');
if (customCharacter) {
  console.log(`Original: ${customCharacter.name} ${customCharacter.appearance.glyph}`);
  
  const availableGlyphs = characterManager.getAvailableGlyphs();
  console.log(`Available glyphs for ${customCharacter.className}:`, availableGlyphs);
  
  // Change appearance
  characterManager.updateAppearance('🛡️', '0x800080');
  const updated = characterManager.getCurrentCharacter();
  console.log(`Updated: ${updated?.name} ${updated?.appearance.glyph} (color changed to purple)`);
  
  // Save and load demo
  const savedData = characterManager.saveCharacter();
  console.log('\nCharacter saved to JSON (first 100 chars):');
  console.log(savedData?.substring(0, 100) + '...');
}

export {};