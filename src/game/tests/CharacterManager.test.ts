import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterManager } from '../../managers/CharacterManager';

describe('CharacterManager', () => {
  let characterManager: CharacterManager;

  beforeEach(() => {
    characterManager = CharacterManager.getInstance();
    characterManager.resetCharacter(); // Start fresh for each test
  });

  it('should be a singleton', () => {
    const instance1 = CharacterManager.getInstance();
    const instance2 = CharacterManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should load available character classes', () => {
    const classes = characterManager.getAvailableClasses();
    expect(classes).toContain('warrior');
    expect(classes).toContain('mage');
    expect(classes).toContain('rogue');
    expect(classes).toContain('cleric');
    expect(classes).toContain('ranger');
    expect(classes.length).toBeGreaterThanOrEqual(5);
  });

  it('should get character class definition', () => {
    const warrior = characterManager.getCharacterClass('warrior');
    expect(warrior).not.toBeNull();
    expect(warrior?.name).toBe('Warrior');
    expect(warrior?.baseStats.strength).toBe('3d6+3');
    expect(warrior?.appearance.defaultGlyph).toBe('⚔️');
  });

  it('should return null for invalid character class', () => {
    const invalid = characterManager.getCharacterClass('nonexistent');
    expect(invalid).toBeNull();
  });

  it('should create a character with default settings', () => {
    const character = characterManager.createCharacter();
    expect(character).not.toBeNull();
    
    if (character) {
      expect(character.name).toBe('Hero');
      expect(character.className).toBe('warrior');
      expect(character.level).toBe(1);
      expect(character.experience).toBe(0);
      expect(character.stats.hp).toBeGreaterThan(0);
      expect(character.stats.maxHp).toBe(character.stats.hp);
      expect(character.appearance.glyph).toBe('⚔️');
    }
  });

  it('should create a character with custom settings', () => {
    const character = characterManager.createCharacter(
      'Gandalf',
      'mage',
      {
        selectedGlyph: '🔮',
        selectedColor: '0xFF0000',
        customName: 'Gandalf the Grey'
      }
    );
    
    expect(character).not.toBeNull();
    
    if (character) {
      expect(character.name).toBe('Gandalf the Grey');
      expect(character.className).toBe('mage');
      expect(character.appearance.glyph).toBe('🔮');
      expect(character.appearance.color).toBe(0xFF0000);
    }
  });

  it('should generate different stats for different classes', () => {
    const warrior = characterManager.createCharacter('Warrior1', 'warrior');
    characterManager.resetCharacter();
    const mage = characterManager.createCharacter('Mage1', 'mage');
    
    expect(warrior).not.toBeNull();
    expect(mage).not.toBeNull();
    
    if (warrior && mage) {
      // Warriors should generally have higher AC and HP
      expect(warrior.stats.ac).toBeGreaterThan(mage.stats.ac);
      // These are probabilistic, but warriors have higher HP dice
      expect(warrior.stats.maxHp || 0).toBeGreaterThanOrEqual(mage.stats.maxHp || 0);
    }
  });

  it('should get and set current character', () => {
    expect(characterManager.getCurrentCharacter()).toBeNull();
    
    const character = characterManager.createCharacter('Test', 'rogue');
    expect(characterManager.getCurrentCharacter()).toBe(character);
  });

  it('should update character appearance', () => {
    const character = characterManager.createCharacter('Test', 'warrior');
    expect(character).not.toBeNull();
    
    const success = characterManager.updateAppearance('🛡️', '0x00FF00');
    expect(success).toBe(true);
    
    const updatedCharacter = characterManager.getCurrentCharacter();
    expect(updatedCharacter?.appearance.glyph).toBe('🛡️');
    expect(updatedCharacter?.appearance.color).toBe(0x00FF00);
  });

  it('should reject invalid glyphs for character class', () => {
    characterManager.createCharacter('Test', 'warrior');
    
    const success = characterManager.updateAppearance('🔮'); // Mage glyph for warrior
    expect(success).toBe(false);
  });

  it('should level up character', () => {
    const character = characterManager.createCharacter('Test', 'warrior');
    const initialLevel = character?.level;
    const initialHP = character?.stats.maxHp;
    
    const success = characterManager.levelUp();
    expect(success).toBe(true);
    
    const updatedCharacter = characterManager.getCurrentCharacter();
    expect(updatedCharacter?.level).toBe((initialLevel || 0) + 1);
    expect(updatedCharacter?.stats.maxHp).toBeGreaterThanOrEqual(initialHP || 0);
  });

  it('should add experience and level up when threshold reached', () => {
    characterManager.createCharacter('Test', 'mage');
    const initialLevel = characterManager.getCurrentCharacter()?.level;
    
    const leveledUp = characterManager.addExperience(1000);
    expect(leveledUp).toBe(true);
    
    const updatedCharacter = characterManager.getCurrentCharacter();
    expect(updatedCharacter?.level).toBe((initialLevel || 0) + 1);
    expect(updatedCharacter?.experience).toBe(1000);
  });

  it('should get available glyphs for current character', () => {
    characterManager.createCharacter('Test', 'warrior');
    
    const glyphs = characterManager.getAvailableGlyphs();
    expect(glyphs).toContain('⚔️');
    expect(glyphs).toContain('🛡️');
    expect(glyphs).toContain('🗡️');
  });

  it('should save and load character data', () => {
    const originalCharacter = characterManager.createCharacter('SaveTest', 'cleric');
    expect(originalCharacter).not.toBeNull();
    
    const savedData = characterManager.saveCharacter();
    expect(savedData).not.toBeNull();
    
    characterManager.resetCharacter();
    expect(characterManager.getCurrentCharacter()).toBeNull();
    
    const loadSuccess = characterManager.loadCharacter(savedData!);
    expect(loadSuccess).toBe(true);
    
    const loadedCharacter = characterManager.getCurrentCharacter();
    expect(loadedCharacter?.name).toBe('SaveTest');
    expect(loadedCharacter?.className).toBe('cleric');
  });
});