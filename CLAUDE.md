# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Running
- `npm run dev` - Start development server (Vite) on port 3000 with auto-open
- `npm run build` - Build production version (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking without emitting files

### Development Workflow
The project uses Vite for development with hot module replacement. The game automatically opens in the browser at http://localhost:3000 when running `npm run dev`.

## Architecture Overview

This is an emoji-based roguelike game built with TypeScript, PixiJS for rendering, featuring D&D-style combat mechanics, line of sight system, and smooth animations. The architecture follows a layered approach:

### Core Structure
- **Game Layer** (`src/game/Game.ts`) - Main game logic, input handling, entity management, combat orchestration
- **Rendering Layer** (`src/game/Renderer.ts`) - PixiJS-based rendering with emoji support, animations, and camera system
- **World Layer** (`src/game/TileMap.ts`) - Tile-based world generation, collision detection, and visibility tracking
- **Combat System** (`src/game/CombatSystem.ts`) - D&D 5e-inspired combat mechanics with dice rolling
- **Line of Sight** (`src/game/LineOfSight.ts`) - FOV calculation and visibility management
- **Type Definitions** (`src/types/index.ts`) - Shared interfaces for Tile, Entity, Combat, and WorldSchema

### Key Components

**Game Class**: Central coordinator that manages:
- Player input (arrow keys/WASD) 
- Entity movement with collision detection
- Combat turn management and attack resolution
- Animation triggers for smooth movement
- Game state updates and camera following

**Renderer Class**: PixiJS-based renderer featuring:
- Emoji rendering with proper font support (Noto Emoji)
- Layered rendering (tiles + entities)
- Move animations (150ms duration)
- Shake effects for collisions
- Entity text object caching for performance
- Scrolling camera system that follows the player

**TileMap Class**: World representation with:
- 2D tile array with walkability and light blocking data
- Simple procedural generation (borders + random walls)
- Collision checking for movement validation
- Visibility tracking system (explored/visible states)
- FOV integration for realistic sight mechanics

**CombatSystem Class**: D&D 5e-inspired combat featuring:
- d20-based attack rolls with ability modifiers
- Armor Class (AC) vs attack roll mechanics
- Critical hits (natural 20s) with double damage
- Dice rolling system (supports notation like "2d6+3")
- Character stats (Strength, Dexterity, Constitution, etc.)
- Default player and enemy stat blocks

**LineOfSight Class**: Visibility system with:
- Ray casting algorithm for realistic FOV
- Bresenham's line algorithm for line-of-sight checks
- Configurable visibility radius
- Light blocking tile support
- Explored vs currently visible tile states

### Game Systems

**Combat Mechanics**:
- Turn-based D&D-style combat
- Melee attacks with range checking (1 grid square)
- Attack rolls: d20 + ability modifier + proficiency bonus
- Damage rolls with critical hit doubling
- Character death at 0 HP

**Visibility System**:
- Real-time FOV calculation using ray casting
- Tiles marked as explored (permanent) vs visible (current)
- Light-blocking walls and obstacles
- Configurable sight radius (default 8 tiles)

**Entity System**:
- Full D&D-style character stats (6 abilities, HP, AC, level)
- Player and enemy entities with different stat blocks
- Unique entity IDs and visual representation
- Support for both emoji and ASCII character rendering

### Emoji System
The game uses Unicode emojis as glyphs for both tiles and entities. The rendering system automatically switches between `Noto Emoji` font for emojis and `Noto Sans Mono` for ASCII characters based on the `isEmoji` flag.

### Animation System
Smooth movement animations are implemented using requestAnimationFrame with linear interpolation. Collision feedback is provided through entity shake animations. Camera follows player movement smoothly.

## Technical Notes

- Uses ES modules (`"type": "module"` in package.json)
- Targets modern browsers with `esnext` build target
- Dependencies: PixiJS 7.4+, MobX 6.12+, MobX State Tree 5.4+, GSAP 3.12+
- TypeScript configuration includes both main and Node.js configs
- No test framework currently configured

## Recent Development
Latest features added (as of recent commits):
- Line of sight system with ray casting FOV
- Scrolling camera that follows player movement
- UI updates and improvements
- D&D 5e-style combat system with dice mechanics
- Movement system with collision detection