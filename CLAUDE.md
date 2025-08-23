# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📝 Documentation Maintenance Notes

**IMPORTANT**: When making changes to the codebase, please update the following sections in this file:

- **Test count** (currently 342): Update when adding/removing test files
- **Component list**: Add new systems, managers, or utilities as they're created
- **Architecture section**: Update when system responsibilities change
- **Available scripts**: Sync with package.json when scripts are modified
- **Dependencies**: Update version numbers when upgrading packages

**Auto-sync locations**: 
- Test count: Search for "342" and update across all documentation
- Scripts: Match package.json scripts section exactly
- File structure: Reflect actual src/ directory organization

## Development Commands

### Building and Running
- `npm run dev` - Start development server (Vite) on port 3000 with auto-open
- `npm run build` - Build production version (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking without emitting files
- `npm run test` - Run comprehensive test suite (342 tests) with Vitest
- `npm run test:ui` - Run tests with UI interface for development

### Development Workflow
The project uses Vite for development with hot module replacement. The game automatically opens in the browser at http://localhost:3000 when running `npm run dev`.

**Critical Development Process**:
1. **Always run `npm run dev` BEFORE running tests** - Manual verification should come first
2. Tests should be considered an additional validation step after manual functionality checks
3. Development workflow: `npm run dev` → manual testing → `npm run test` → `npm run typecheck`
4. This ensures that features work correctly in the actual game environment before automated testing

### Debug Logging Control
The project includes a comprehensive verbose logging system to control console output:

**Verbose Flag Usage**:
- **Default Mode**: WARN level logging (quiet) - only warnings and errors appear in console
- **F12 Hotkey**: Press F12 during gameplay to toggle verbose mode on/off with visual indicator
- **Environment Variable**: Set `VITE_DEBUG_VERBOSE=true` in `.env` file for default verbose mode
- **Programmatic Control**: Use `Logger.setVerboseMode(true/false)` in code
- **Persistent Setting**: Verbose preference is saved to localStorage across sessions

**Console Output Levels**:
- **Quiet Mode (default)**: Only WARN and ERROR messages shown
- **Verbose Mode**: All DEBUG, INFO, WARN, and ERROR messages shown
- **High-frequency logging** (movement, audio events, rendering) only appears in verbose mode

## Architecture Overview

This is an emoji-based roguelike game built with TypeScript, PixiJS for rendering, featuring D&D-style combat mechanics, line of sight system, and smooth animations. The architecture follows a layered approach:

**For comprehensive technical architecture documentation**, see [docs/architecture.md](docs/architecture.md) which covers:
- System interconnections and data flow
- Position management (logical vs rendering positions)
- Rendering pipeline and camera system
- Animation system architecture
- Memory management and performance optimizations

### Modular Architecture Structure

**Core Components** (`src/core/`):
- **Game** (`src/core/Game.ts`) - Main game coordinator with mixed architecture patterns (364 lines)
- **DefaultRenderer** (`src/core/renderers/DefaultRenderer.ts`) - Hybrid PixiJS + HTML renderer: PixiJS for game area, HTML for UI panels
- **TileMap** (`src/core/TileMap.ts`) - Tile-based world generation, collision detection, and visibility tracking
- **LineOfSight** (`src/core/LineOfSight.ts`) - FOV calculation and visibility management
- **EventBus System** (`src/core/events/`) - High-performance event system with ring buffer, aggregation, and object pooling
  - **Currently Connected**: Player movement, UI updates, audio system, pathfinding cache invalidation
  - **Needs Connection**: Combat visual effects, animation triggers, complete renderer decoupling

**Specialized Systems** (`src/systems/`):
- **Input System** (`src/systems/input/InputHandler.ts`) - Centralized keyboard event management with callback architecture and F12 debug toggle (107 lines)
- **Movement System** (`src/systems/movement/MovementSystem.ts`) - Movement logic, collision detection, and grid snapping (125 lines)
- **Combat System** (`src/systems/combat/CombatSystem.ts`) - D&D 5e-inspired combat mechanics with damage types
- **Combat Manager** (`src/systems/combat/CombatManager.ts`) - Combat orchestration and visual effects coordination (90 lines)
- **Animation System** (`src/systems/animation/AnimationSystem.ts`) - Dedicated visual effects and animation management
- **Camera System** (`src/systems/camera/CameraSystem.ts`) - Viewport management, entity following, coordinate conversion
- **Font System** (`src/systems/font/FontSystem.ts`) - Centralized font management for emoji and ASCII rendering
- **Dice System** (`src/systems/dice/DiceSystem.ts`) - D&D-style dice rolling mechanics ("2d6+3" notation)
- **Pathfinding System** (`src/systems/pathfinding/PathfindingSystem.ts`) - A* pathfinding with LRU caching and EventBus integration
- **Audio System** (`src/systems/audio/AudioSystem.ts`) - Procedural Web Audio API sound generation with spatial audio and music composition

**Management Layer** (`src/managers/`):
- **GameStateManager** (`src/managers/GameStateManager.ts`) - Entity lifecycle and game loop management (184 lines)
- **CharacterManager** (`src/managers/CharacterManager.ts`) - Singleton character progression with world-specific character class loading
- **ResourceManager** (`src/managers/ResourceManager.ts`) - Multi-resource system supporting HP, mana, and theme-specific resources

**Data Loaders** (`src/loaders/`):
- **EnemyLoader** (`src/loaders/EnemyLoader.ts`) - Enemy data loading and validation from JSON
- **ItemLoader** (`src/loaders/ItemLoader.ts`) - Item data loading and validation from JSON with damage types
- **WorldConfigLoader** (`src/loaders/WorldConfigLoader.ts`) - World theme and configuration management system with UI display support

**Entity Utilities** (`src/entities/`):
- **CreateEntity** (`src/entities/CreateEntity.ts`) - Centralized entity creation utilities for consistency

**UI Components** (`src/ui/`):
- **Character Sheets** (`src/ui/components/CharacterSheet.ts`) - PixiJS-based character sheet (exists but unused)
- **HTML UI System** (`src/core/renderers/HTMLUIRenderer.ts`) - Actual working UI via styled HTML panels
- **Start Screen System** (`src/ui/start/`) - World selection and game initialization UI
- **Components** (`src/ui/components/`) - Reusable UI elements and resource displays
- **Note**: Two UI systems exist - PixiJS components (unused) and HTML system (active)

**Core Utilities** (`src/utils/`):
- **ErrorHandler** (`src/utils/ErrorHandler.ts`) - Comprehensive error handling framework with typed error codes (126 lines)
- **Logger** (`src/utils/Logger.ts`) - Professional logging system with verbose flag control, environment variable support, and localStorage persistence (199 lines)

**Type Definitions** (`src/types/index.ts`) - Shared interfaces for Tile, Entity, Combat, and world configuration

**Data Files** (`src/data/`) - JSON configuration for character classes, enemy definitions, items, world themes, and audio
  - `characterClasses.json` - Fantasy character class definitions
  - `cyberpunk-characterClasses.json` - Cyberpunk-specific character classes
  - `enemies.json` - Standard enemy definitions
  - `items.json` - Item definitions with damage types
  - `worlds.json` - World theme configurations (Fantasy, Cyberpunk)
  - `cyberpunk-enemies.json` - Cyberpunk-themed enemies
  - `cyberpunk-items.json` - Cyberpunk-themed items
  - `audio/sound-definitions.json` - Procedural sound parameters for combat, UI, movement
  - `audio/music-patterns.json` - Algorithmic music composition patterns and progressions

### Key Components

**Game Class**: Central coordinator featuring mixed architecture patterns:
- **EventBus Integration**: Player movement, UI updates use EventBus for decoupling
- **Direct Method Calls**: Combat, rendering use traditional coupling patterns
- **System Coordination**: Constructor parameter injection (not true dependency injection)
- **Hybrid Communication**: Some systems use EventBus, others use direct calls
- Game loop orchestration through GameStateManager
- **Note**: Architecture is transitional - some systems fully EventBus-integrated, others still coupled

**InputHandler Class**: Keyboard event management featuring:
- Callback-based architecture for system decoupling
- Movement key tracking (arrow keys/WASD)
- Attack input handling (spacebar)
- F12 debug verbose mode toggle with visual indicator
- Clean event listener management with proper cleanup

**MovementSystem Class**: Movement logic with:
- Grid-based movement with collision detection
- Position validation and boundary checking
- Movement state management
- Integration with TileMap for walkability checking

**CombatManager Class**: Combat orchestration with partial integration:
- **EventBus Integration**: Enemy death events, combat messaging
- **Missing Integration**: Most visual effects are commented out/disabled
- **Direct Coupling**: Still uses direct renderer calls for immediate feedback
- Attack range validation and positioning
- **Note**: Visual effects system exists but not connected - needs EventBus integration

**GameStateManager Class**: Entity lifecycle management with:
- Safe entity spawning with position validation
- World-aware entity creation (players and enemies based on current world)
- Entity array management and updates
- Game initialization and setup
- Entity removal and cleanup

**DefaultRenderer Class**: Hybrid rendering system featuring:
- **PixiJS Game Area**: Central game viewport with tiles and entities
- **HTML UI Panels**: Character sheet, combat log using styled HTML (not terminal emulation)
- **HTMLUIRenderer Component**: Manages 3-panel layout (character | game | combat log)
- Emoji rendering in PixiJS with proper font support (Noto Emoji)
- Entity text object caching for performance
- Integration with CameraSystem for game area viewport management
- **Note**: PixiJS CharacterSheet component exists but unused - HTML system handles UI

**CameraSystem Class**: Viewport and camera management featuring:
- Camera following and viewport management
- World-to-screen coordinate conversion
- Camera movement thresholds and bounds checking
- Animation system integration for smooth camera updates

**FontSystem Class**: Centralized font management featuring:
- Automatic emoji vs ASCII font detection and switching
- Consistent font styling across UI elements
- Font configuration for tiles, entities, and UI text
- Support for Noto Emoji and Noto Sans Mono fonts

**DiceSystem Class**: D&D-style dice mechanics featuring:
- Dice notation parsing ("2d6+3", "1d20", etc.)
- Random number generation with deterministic testing support
- Dice roll result tracking with individual roll details
- Support for modifiers and complex dice expressions

**AudioSystem Class**: Procedural Web Audio API sound generation featuring:
- EventBus-driven reactive audio for game events (combat, movement, UI)
- Procedural sound synthesis using oscillators, envelopes, and effects
- ADSR envelope shaping with attack, decay, sustain, and release phases
- Spatial audio with HRTF positioning for 3D sound placement
- Performance-optimized with oscillator pooling and binary heap algorithms
- Algorithmic music composition with chord progressions and pattern generation
- localStorage settings persistence with volume controls and accessibility options

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

**Procedural Audio System**:
- Asset-free audio generation using Web Audio API procedural synthesis
- EventBus integration for reactive game-event-driven sound effects
- ADSR envelope synthesis for dynamic attack, decay, sustain, and release phases
- Oscillator-based sound generation: simple tones, chord synthesis, noise generation, frequency sweeps
- Spatial audio with HRTF positioning for immersive 3D sound placement
- Performance optimization through oscillator pooling and LRU caching
- Algorithmic music composition with chord progressions and musical pattern generation
- Accessibility features: visual indicators, volume controls, and chiptune mode toggle

**Entity System**:
- Full D&D-style character stats (6 abilities, HP, AC, level)
- Multi-resource entities with configurable resource types per world theme
- Player and enemy entities with different stat blocks
- Item-based damage types and resistance systems
- Unique entity IDs and visual representation
- Support for both emoji and ASCII character rendering

**Pathfinding System**:
- A* algorithm implementation with binary heap optimization for O(log n) performance
- LRU cache with EventBus integration for automatic invalidation when world changes
- Diagonal movement support with corner-cutting prevention
- Configurable heuristics (Manhattan, Euclidean, Octile distance)
- Performance metrics tracking and sub-5ms target completion times
- Line-of-sight utilities and distance calculation methods
- Handles 1000+ path requests efficiently with intelligent caching

### Emoji System
The game uses Unicode emojis as glyphs for both tiles and entities. The rendering system automatically switches between `Noto Emoji` font for emojis and `Noto Sans Mono` for ASCII characters based on the `isEmoji` flag.

### Animation System
Animation system exists with GSAP integration but **partial implementation**:
- Smooth movement animations using requestAnimationFrame with linear interpolation
- Camera follows player movement smoothly
- **Note**: Visual effects (shake, floating damage, combat animations) exist but most are disabled in CombatManager
- **Needs Integration**: Full EventBus connection for combat visual effects

## Technical Notes

- Uses ES modules (`"type": "module"` in package.json)
- Targets modern browsers with `esnext` build target
- Dependencies: PixiJS 7.4+, MobX 6.12+, MobX State Tree 5.4+, GSAP 3.12+
- TypeScript configuration includes both main and Node.js configs
- Comprehensive test framework with Vitest and jsdom environment
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
- **3-Panel HTML Layout**: Character sheet (300px) | Game area (PixiJS) | Combat log (400px)
- **HTML-based Character Panel**: Left panel with styled HTML for character stats and resources
- **Multi-Resource Display**: HTML text displays for HP, mana, and theme-specific resources
- **ASCII Resource Bars**: Text-based bars using `[##########]` format with theme-appropriate colors
- **Dynamic Resource Layout**: Adapts to active world theme's resource configuration
- **Responsive Centering**: Full game UI centered in viewport with dark theme styling
- **Consistent Styling**: Courier New font, dark backgrounds, colored borders throughout

## Recent Development
Latest features added (as of recent commits):
- **Start Screen System**: Complete world selection UI with keyboard navigation and smooth transitions
- **World-Specific Character Classes**: Dynamic character class loading based on selected world (e.g., cyberpunk-characterClasses.json)
- **Enhanced World Configuration**: UI display support and improved world management system
- **Game Initialization Flow**: Restructured main.ts to handle world selection before game creation
- **Multi-Container UI**: Separated start screen and game containers for better UX
- **Major Architectural Refactor**: Complete codebase restructuring with modular directory organization
- **System Extraction**: Extracted CameraSystem, FontSystem, and DiceSystem for better separation of concerns
- **Directory Restructuring**: Organized code into logical modules (core, systems, managers, loaders, entities, ui)
- **Test Organization**: Moved all tests to root `tests/` directory with structured organization
- **Multi-World System**: Fantasy and Cyberpunk world themes with unique mechanics (Steampunk/Horror referenced but not implemented)
- **Advanced Resource Management**: Multi-resource system supporting HP, mana, heat, sanity, corruption, etc.
- **Enhanced Combat System**: Damage types, resistance/vulnerability system, theme-specific mechanics
- **Item System**: JSON-based item loading with damage types and world-specific variants
- **World Configuration**: Dynamic world loading with theme-specific rules and resources
- **UI Resource Display**: Character sheet integration with new resource system
- **Entity Creation System**: Centralized entity creation utilities for consistency
- **Pathfinding System**: A* algorithm with binary heap optimization, LRU caching, and EventBus integration for intelligent path invalidation
- **Procedural Audio System**: Complete Web Audio API-based sound generation with ADSR synthesis, spatial audio, and algorithmic music composition
- **Comprehensive Testing**: 291 tests covering all core systems including EventBus, pathfinding, and procedural audio with deterministic seeded randomness
- **Error Handling Framework**: Professional error management with GameError class and typed error codes
- **Logging Infrastructure**: Configurable logging system with multiple levels, verbose flag control, environment variable support, and F12 toggle hotkey
- **Input System**: Centralized keyboard management with callback-based architecture
- **Movement System**: Dedicated movement logic with collision detection and grid snapping
- **Combat Management**: Combat orchestration with visual effects coordination
- **State Management**: Entity lifecycle management with safe spawning
- **Camera System**: Extracted viewport and camera management with coordinate conversion
- **Font Management**: Centralized font system for consistent emoji and ASCII rendering
- **Dice Mechanics**: Extracted D&D-style dice rolling system with notation support
- Line of sight system with ray casting FOV
- Scrolling camera that follows player movement
- UI updates and improvements
- D&D 5e-style combat system with dice mechanics

## Testing Infrastructure

- **Test Framework**: Vitest with jsdom environment for browser simulation
- **Test Coverage**: 342 comprehensive tests across 24 test files covering EventBus, pathfinding, procedural audio, and start screen systems
- **Deterministic Testing**: Seeded randomness for combat system validation
- **Mock Integration**: PixiJS mocking for renderer testing without graphics dependencies
- **Edge Case Coverage**: Boundary conditions, error scenarios, and invalid input handling
- **D&D Mechanics Validation**: Dice rolling, attack calculations, and damage resolution testing
- **Modular Test Structure**: Tests organized by system/component in root `tests/` directory

Test files organized by system:
- **Core Tests** (`tests/core/`):
  - `Renderer.test.ts` - Rendering system with PixiJS mocks (19 tests)
  - `TileMap.test.ts` - Map generation and collision detection (14 tests)
  - `LineOfSight.test.ts` - FOV algorithms and visibility (12 tests)
- **EventBus Tests** (`tests/core/events/`):
  - `EventBus.test.ts` - Ring buffer event system with performance tests (13 tests)
  - `EventAggregator.test.ts` - Event batching and aggregation logic (7 tests)  
  - `EventPool.test.ts` - Object pooling and memory optimization (12 tests)
- **System Tests** (`tests/systems/`):
  - `CombatSystem.test.ts` - D&D mechanics with seeded randomness (22 tests)
  - `CombatManager.test.ts` - Combat orchestration (11 tests)
  - `MovementSystem.test.ts` - Movement logic and collision detection (8 tests)
  - `InputHandler.test.ts` - Input handling and callbacks (5 tests)
- **Pathfinding Tests** (`tests/systems/pathfinding/`):
  - `PathfindingSystem.test.ts` - A* algorithm and system integration (20 tests)
  - `BinaryHeap.test.ts` - Min-heap priority queue with performance tests (11 tests)
  - `PathCache.test.ts` - LRU cache with EventBus invalidation (11 tests)
- **Audio Tests** (`tests/systems/audio/`):
  - `AudioSettings.test.ts` - Audio configuration and localStorage persistence (23 tests)
  - `WaveformGenerator.test.ts` - Musical note calculations and sound synthesis (20 tests)
  - `OscillatorPool.test.ts` - Performance optimization and resource pooling (20 tests)
- **Manager Tests** (`tests/managers/`):
  - `CharacterManager.test.ts` - Character management and progression (14 tests)
  - `GameStateManager.test.ts` - Entity lifecycle management (9 tests)
- **Loader Tests** (`tests/loaders/`):
  - `ItemLoader.test.ts` - Item system data loading and validation (16 tests)
  - `EnemyLoader.test.ts` - Enemy data loading and validation (8 tests)
  - `WorldConfigLoader.test.ts` - World configuration loading and validation (11 tests)
- **UI Tests** (`tests/ui/components/`):
  - `ResourceDisplay.test.ts` - Resource system UI display testing (5 tests)
- **Start Screen Tests** (`tests/ui/start/`):
  - `StartScreen.test.ts` - Start screen initialization and world selection flow (8 tests)
  - `WorldPicker.test.ts` - World picker component with keyboard navigation (16 tests)

## Architecture Patterns

- **Modular Directory Structure**: Clean separation of concerns with organized directories (core, systems, managers, loaders, entities, ui)
- **System Extraction**: Extracted specialized systems (Camera, Font, Dice) from monolithic classes for better maintainability
- **Mixed Architecture**: Constructor parameter injection (not true dependency injection)
- **Callback Architecture**: InputHandler uses callbacks to decouple input from game logic
- **Single Responsibility**: Each system has a focused, well-defined purpose
- **Transitional EventBus Integration**: Some systems fully integrated, others still use direct coupling
- **Error Handling**: Centralized error management with context and error codes
- **Logging**: Structured logging with configurable levels and filtering
- **Comprehensive Testing**: Organized by system including EventBus, start screen UI, and world selection with deterministic behavior

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
- Use the Logger.ts system for debugging and information logging with appropriate log levels (DEBUG for verbose info, WARN/ERROR for important messages)
- Enable verbose logging during development: Set `VITE_DEBUG_VERBOSE=true` in `.env` or press F12 in-game
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