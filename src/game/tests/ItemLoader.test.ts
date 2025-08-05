import { describe, it, expect } from 'vitest';
import { ItemLoader } from '../../utils/ItemLoader';
import { ItemSystem } from '../Item';
import { ItemCategory } from '../../types';

describe('ItemLoader', () => {
  it('should load item definitions from JSON', () => {
    const longsword = ItemLoader.getItemDefinition('longsword');
    expect(longsword).toBeTruthy();
    expect(longsword?.name).toBe('Longsword');
    expect(longsword?.type).toBe('weapon');
    expect(longsword?.damage).toBe('1d8');
    expect(longsword?.weight).toBe(3);
  });

  it('should return null for non-existent items', () => {
    const nonExistent = ItemLoader.getItemDefinition('nonexistent_item');
    expect(nonExistent).toBeNull();
  });

  it('should get available item categories', () => {
    const categories = ItemLoader.getAvailableCategories();
    expect(categories).toContain('weapons');
    expect(categories).toContain('armor');
    expect(categories).toContain('consumables');
    expect(categories).toContain('tools');
  });

  it('should get all available item keys', () => {
    const keys = ItemLoader.getAvailableItemKeys();
    expect(keys).toContain('longsword');
    expect(keys).toContain('healing_potion');
    expect(keys).toContain('leather_armor');
    expect(keys.length).toBeGreaterThan(10);
  });

  it('should create Item instances from definitions', () => {
    const sword = ItemLoader.getItem('longsword');
    expect(sword).toBeTruthy();
    expect(sword?.name).toBe('Longsword');
    expect(sword?.type).toBe('weapon');
    expect(sword?.damage).toBe('1d8');
    expect(sword?.color).toBe(0xC0C0C0);
    expect(sword?.isEmoji).toBe(true);
  });

  it('should get items by type', () => {
    const weapons = ItemLoader.getItemsByType(ItemCategory.WEAPON);
    const weaponKeys = Object.keys(weapons);
    expect(weaponKeys).toContain('longsword');
    expect(weaponKeys).toContain('dagger');
    expect(weaponKeys.length).toBeGreaterThan(3);
  });

  it('should get items by rarity', () => {
    const commonItems = ItemLoader.getItemsByRarity('common');
    const commonKeys = Object.keys(commonItems);
    expect(commonKeys).toContain('longsword');
    expect(commonKeys.length).toBeGreaterThan(5);
  });

  it('should validate item data', () => {
    const validation = ItemLoader.validateItemData();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should parse colors correctly', () => {
    expect(ItemLoader.parseColor('0xFF0000')).toBe(0xFF0000);
    expect(ItemLoader.parseColor('0x00FF00')).toBe(0x00FF00);
  });

  it('should get random items by type', () => {
    const randomWeaponKey = ItemLoader.getRandomItemByType(ItemCategory.WEAPON);
    expect(randomWeaponKey).toBeTruthy();
    
    const randomWeapon = ItemLoader.getItem(randomWeaponKey!);
    expect(randomWeapon?.type).toBe(ItemCategory.WEAPON);
  });
});

describe('ItemSystem', () => {
  it('should create items using ItemLoader', () => {
    const sword = ItemSystem.createItem('longsword');
    expect(sword).toBeTruthy();
    expect(sword?.name).toBe('Longsword');
    expect(sword?.type).toBe('weapon');
  });

  it('should create type-specific items', () => {
    const weapon = ItemSystem.createWeapon('dagger');
    expect(weapon).toBeTruthy();
    expect(weapon?.type).toBe('weapon');

    const armor = ItemSystem.createArmor('leather_armor');
    expect(armor).toBeTruthy();
    expect(armor?.type).toBe('armor');

    const potion = ItemSystem.createConsumable('healing_potion');
    expect(potion).toBeTruthy();
    expect(potion?.type).toBe('consumable');
  });

  it('should get starting weapons for character classes', () => {
    const longsword = ItemSystem.getStartingWeapon('longsword');
    expect(longsword).toBeTruthy();
    expect(longsword?.name).toBe('Longsword');
    expect(longsword?.id).toBe('starting_longsword');

    const staff = ItemSystem.getStartingWeapon('staff');
    expect(staff).toBeTruthy();
    expect(staff?.name).toBe('Quarterstaff');
  });

  it('should handle invalid weapon names with fallback', () => {
    const fallback = ItemSystem.getStartingWeapon('invalid_weapon');
    expect(fallback).toBeTruthy();
    expect(fallback?.name).toBe('Dagger'); // Should fallback to dagger
  });

  it('should initialize successfully', () => {
    const result = ItemSystem.initialize();
    expect(result).toBe(true);
  });

  it('should provide utility methods', () => {
    expect(ItemSystem.hasItem('longsword')).toBe(true);
    expect(ItemSystem.hasItem('nonexistent')).toBe(false);

    const weaponKeys = ItemSystem.getItemsByType(ItemCategory.WEAPON);
    expect(weaponKeys).toContain('longsword');

    const commonKeys = ItemSystem.getItemsByRarity('common');
    expect(commonKeys).toContain('longsword');
  });
});