# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📝 Documentation Maintenance Notes

**IMPORTANT**: When making changes to the codebase, please update the following sections in this file:

- **Test count** (currently 114+): Update when adding/removing test files
- **Component list**: Add new systems, managers, or utilities as they're created
- **Architecture section**: Update when system responsibilities change
- **Available scripts**: Sync with package.json when scripts are modified
- **Dependencies**: Update version numbers when upgrading packages

**Auto-sync locations**: 
- Test count: Search for "114+" and update across all documentation
- Scripts: Match package.json scripts section exactly
- File structure: Reflect actual src/ directory organization

## Development Commands

### Building and Running
- `npm run dev` - Start development server (Vite) on port 3000 with auto-open
- `npm run build` - Build production version (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking without emitting files
- `npm run test` - Run comprehensive test suite (65+ tests) with Vitest
- `npm run test:ui` - Run tests with UI interface for development

### Development Workflow
The project uses Vite for development with hot module replacement. The game automatically opens in the browser at http://localhost:3000 when running `npm run dev`.

**Critical Development Process**:
1. **Always run `npm run dev` BEFORE running tests** - Manual verification should come first
2. Tests should be considered an additional validation step after manual functionality checks
3. Development workflow: `npm run dev` → manual testing → `npm run test` → `npm run typecheck`
4. This ensures that features work correctly in the actual game environment before automated testing

## Architecture Overview

This is an emoji-based roguelike game built with TypeScript, PixiJS for rendering, featuring D&D-style combat mechanics, line of sight system, and smooth animations. The architecture follows a layered approach:

**For comprehensive technical architecture documentation**, see [docs/architecture.md](docs/architecture.md) which covers:
- System interconnections and data flow
- Position management (logical vs rendering positions)
- Rendering pipeline and camera system
- Animation system architecture
- Memory management and performance optimizations

### Core Structure
- **Game Layer** (`src/game/Game.ts`) - Main game coordinator and orchestration (221 lines, 40% reduction from refactoring)
- **Input Layer** (`src/game/InputHandler.ts`) - Centralized keyboard event management with callback architecture (49 lines)
- **Movement Layer** (`src/game/MovementSystem.ts`) - Movement logic, collision detection, and grid snapping (125 lines)
- **Combat Management** (`src/game/CombatManager.ts`) - Combat orchestration and visual effects coordination (90 lines)
- **State Management** (`src/game/GameStateManager.ts`) - Entity lifecycle and game loop management (140 lines)
- **Rendering Layer** (`src/game/Renderer.ts`) - PixiJS-based rendering with emoji support, animations, and camera system
- **World Layer** (`src/game/TileMap.ts`) - Tile-based world generation, collision detection, and visibility tracking
- **Combat System** (`src/game/CombatSystem.ts`) - D&D 5e-inspired combat mechanics with dice rolling and damage types
- **Line of Sight** (`src/game/LineOfSight.ts`) - FOV calculation and visibility management
- **Entity Creation** (`src/game/CreateEntity.ts`) - Centralized entity creation utilities for consistency
- **Error Handling** (`src/utils/ErrorHandler.ts`) - Comprehensive error handling framework with typed error codes (126 lines)
- **Logging System** (`src/utils/Logger.ts`) - Professional logging system with configurable levels (117 lines)
- **Type Definitions** (`src/types/index.ts`) - Shared interfaces for Tile, Entity, Combat, and WorldSchema
- **Character Management** (`src/managers/CharacterManager.ts`) - Singleton character progression and class system
- **Enemy System** (`src/utils/EnemyLoader.ts`) - Enemy data loading and validation from JSON
- **Item System** (`src/utils/ItemLoader.ts`) - Item data loading and validation from JSON with damage types
- **Resource Management** (`src/utils/ResourceManager.ts`) - Multi-resource system supporting HP, mana, and theme-specific resources
- **World Configuration** (`src/utils/WorldConfigLoader.ts`) - World theme and configuration management system
- **UI Components** (`src/ui/`) - Character sheets, portraits, and UI elements
- **Animation System** (`src/game/AnimationSystem.ts`) - Dedicated visual effects and animation management
- **Data Files** (`src/data/`) - JSON configuration for character classes, enemy definitions, items, and world themes
  - `characterClasses.json` - Character class definitions
  - `enemies.json` - Standard enemy definitions
  - `items.json` - Item definitions with damage types
  - `worlds.json` - World theme configurations (Fantasy, Cyberpunk, Steampunk, Horror)
  - `cyberpunk-enemies.json` - Cyberpunk-themed enemies
  - `cyberpunk-items.json` - Cyberpunk-themed items

### Key Components

**Game Class**: Central coordinator that manages:
- System coordination through dependency injection
- Game loop orchestration and timing
- Integration between input, movement, combat, and rendering systems
- Camera following and viewport management
- High-level game state coordination

**InputHandler Class**: Keyboard event management featuring:
- Callback-based architecture for system decoupling
- Movement key tracking (arrow keys/WASD)
- Attack input handling (spacebar)
- Clean event listener management with proper cleanup

**MovementSystem Class**: Movement logic with:
- Grid-based movement with collision detection
- Position validation and boundary checking
- Movement state management
- Integration with TileMap for walkability checking

**CombatManager Class**: Combat orchestration featuring:
- Integration between CombatSystem and Renderer
- Visual effects coordination (damage numbers, animations)
- Attack range validation and positioning
- Combat result processing and feedback

**GameStateManager Class**: Entity lifecycle management with:
- Safe entity spawning with position validation
- Entity array management and updates
- Game initialization and setup
- Entity removal and cleanup

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
- Turn-based D&D-style combat with theme-specific variations
- Melee attacks with range checking (1 grid square)
- Attack rolls: d20 + ability modifier + proficiency bonus
- Damage types: Physical, elemental, magical (varies by world theme)
- Damage resistance/vulnerability system with configurable multipliers
- Multiple critical hit rules: double damage, max+roll, double dice
- Multi-resource system: HP, mana, theme-specific resources (heat, sanity, corruption, etc.)
- Character death at 0 HP

**Visibility System**:
- Real-time FOV calculation using ray casting
- Tiles marked as explored (permanent) vs visible (current)
- Light-blocking walls and obstacles
- Configurable sight radius (default 8 tiles)

**Entity System**:
- Full D&D-style character stats (6 abilities, HP, AC, level)
- Multi-resource entities with configurable resource types per world theme
- Player and enemy entities with different stat blocks
- Item-based damage types and resistance systems
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
- Comprehensive test framework with Vitest and jsdom environment (114+ tests)
- Modular architecture with dependency injection and single responsibility principle
- Professional error handling with typed error codes and context
- Configurable logging system with multiple levels (DEBUG, INFO, WARN, ERROR)
- Deterministic testing with seeded randomness for combat mechanics

## UI Design Standards

The project uses consistent dark theme styling throughout:

### Typography Standards
- **Primary Font**: `Noto Sans Mono, monospace` for all text elements (consistent project-wide)
- **Emoji Font**: `Noto Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif` for emoji rendering
- **Font Sizes**: Standardized sizes from 10px (small) to 48px (large emoji)

### Color Palette
- **Dark Backgrounds**: `0x000000` (panels and overlays)
- **Borders**: `0x444444` for panel separators
- **Text Hierarchy**: White primary (`0xFFFFFF`), light gray secondary (`0xCCCCCC`), muted (`0x888888`)
- **Resource Colors**: Configurable per world theme (HP: red, Mana: blue, Heat: orange, Sanity: purple, etc.)
- **Status Colors**: Health progression (green → yellow → orange → red)
- **Special Colors**: Gold for levels/XP (`0xFFD700`), sky blue for AC highlight (`0x87CEEB`)

### UI Layout
- **Character Panel**: Left-side panel (200x600px) with right border line
- **Multi-Resource Display**: Text-based resource bars for HP, mana, and theme-specific resources
- **ASCII Resource Bars**: Text-based bars using `[##########]` format with theme-appropriate colors
- **Dynamic Resource Layout**: Adapts to active world theme's resource configuration
- **Bottom Corner UI**: Controls (bottom left), position coordinates (bottom right)
- **Spacing**: Consistent 10px padding throughout UI elements

## Recent Development
Latest features added (as of recent commits):
- **Multi-World System**: Fantasy, Cyberpunk, Steampunk, and Horror world themes with unique mechanics
- **Advanced Resource Management**: Multi-resource system supporting HP, mana, heat, sanity, corruption, etc.
- **Enhanced Combat System**: Damage types, resistance/vulnerability system, theme-specific mechanics
- **Item System**: JSON-based item loading with damage types and world-specific variants
- **World Configuration**: Dynamic world loading with theme-specific rules and resources
- **UI Resource Display**: Character sheet integration with new resource system
- **Entity Creation System**: Centralized entity creation utilities for consistency
- **Architectural Refactoring**: Extracted 4 major systems from monolithic Game class (40% code reduction)
- **Comprehensive Testing**: 114+ tests covering all core systems with deterministic seeded randomness
- **Error Handling Framework**: Professional error management with GameError class and typed error codes
- **Logging Infrastructure**: Configurable logging system with multiple levels and context
- **Input System**: Centralized keyboard management with callback-based architecture
- **Movement System**: Dedicated movement logic with collision detection and grid snapping
- **Combat Management**: Combat orchestration with visual effects coordination
- **State Management**: Entity lifecycle management with safe spawning
- Line of sight system with ray casting FOV
- Scrolling camera that follows player movement
- UI updates and improvements
- D&D 5e-style combat system with dice mechanics

## Testing Infrastructure

- **Test Framework**: Vitest with jsdom environment for browser simulation
- **Test Coverage**: 114+ comprehensive tests across 10 test files
- **Deterministic Testing**: Seeded randomness for combat system validation
- **Mock Integration**: PixiJS mocking for renderer testing without graphics dependencies
- **Edge Case Coverage**: Boundary conditions, error scenarios, and invalid input handling
- **D&D Mechanics Validation**: Dice rolling, attack calculations, and damage resolution testing

Test files:
- `CombatSystem.test.ts` - D&D mechanics with seeded randomness (16 tests)
- `LineOfSight.test.ts` - FOV algorithms and visibility (12 tests)
- `TileMap.test.ts` - Map generation and collision detection (14 tests) 
- `Renderer.test.ts` - Rendering system with PixiJS mocks (19 tests)
- `CharacterManager.test.ts` - Character management and progression (14 tests)
- `GameStateManager.test.ts` - Entity lifecycle management (9 tests)
- `CombatManager.test.ts` - Combat orchestration (9 tests)
- `MovementSystem.test.ts` - Movement logic and collision detection (8 tests)
- `EnemyLoader.test.ts` - Enemy data loading and validation (8 tests)
- `InputHandler.test.ts` - Input handling and callbacks (5 tests)
- `ResourceDisplay.test.ts` - Resource system UI display testing
- `WorldConfigLoader.test.ts` - World configuration loading and validation
- `ItemLoader.test.ts` - Item system data loading and validation

## Architecture Patterns

- **Dependency Injection**: Systems receive dependencies through constructor injection
- **Callback Architecture**: InputHandler uses callbacks to decouple input from game logic
- **Single Responsibility**: Each system has a focused, well-defined purpose
- **Error Handling**: Centralized error management with context and error codes
- **Logging**: Structured logging with configurable levels and filtering
- **Testing**: Comprehensive test coverage with deterministic behavior

## Development Commands for Claude

### Running Tests
- Use `npm run test` to run the full test suite before making changes
- Use `npm run test:ui` during development for immediate feedback with visual interface
- Tests use seeded randomness - maintain deterministic behavior in combat tests
- All tests should pass before considering work complete

### Code Quality
- Run `npm run typecheck` to ensure TypeScript compliance
- Follow established patterns: dependency injection, callback architecture, error handling
- Use the ErrorHandler.ts framework for error management
- Use the Logger.ts system for debugging and information logging
- Maintain test coverage when adding new features

## Quality Assurance Notes

Based on recent test audits:
- 6/8 test files provide excellent functionality validation
- CombatSystem.test.ts and TileMap.test.ts are exemplary with proper seeded randomness
- Renderer.test.ts and InputHandler.test.ts have been identified as having structural issues
- When working on rendering or input systems, prioritize functional testing over mocking
- Maintain the principle: tests should validate actual behavior, not implementation details

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.