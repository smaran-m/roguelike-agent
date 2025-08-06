# Roguelike Agent 🎮

An emoji-based roguelike game built with TypeScript and PixiJS, featuring D&D 5e-inspired combat mechanics, line of sight system, and smooth animations.

## 📝 Documentation Maintenance

**For Contributors**: When modifying the codebase, please keep this README synchronized:

- **Test count** (currently 154): Update when adding/removing tests
- **Component architecture**: Add new systems to the appropriate sections
- **Project structure**: Reflect actual directory organization under src/
- **Available scripts**: Keep in sync with package.json
- **Dependencies**: Update tech stack versions when upgrading

**Quick sync check**: Search for "154" across documentation files to update test counts.

## Features

### 🎯 Core Gameplay
- **Emoji-based graphics** - Unicode emojis for characters and environment
- **Turn-based combat** - D&D 5e-inspired mechanics with dice rolling
- **Line of sight** - Realistic FOV with ray casting and visibility tracking
- **Smooth animations** - Fluid movement and combat feedback
- **Character progression** - Full RPG stats system

### ⚔️ Combat System
- d20-based attack rolls with ability modifiers
- Armor Class (AC) defense system
- Critical hits on natural 20s with double damage
- Dice notation support (e.g., "2d6+3")
- Melee range checking and positioning

### 👁️ Vision System
- Real-time field of view calculation
- Explored vs currently visible areas
- Light-blocking walls and obstacles
- Configurable sight radius

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/roguelike-agent.git
cd roguelike-agent
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The game will automatically open in your browser at `http://localhost:3000`.

### Development Workflow

**Important**: Always run the development server (`npm run dev`) before running tests to ensure the game is functioning correctly through manual testing.

1. **Manual Testing First**: Start with `npm run dev` to test functionality manually
2. **Automated Testing**: Run `npm run test` after manual verification
3. **Type Checking**: Use `npm run typecheck` to ensure TypeScript compliance
4. **Production Build**: Run `npm run build` for production deployment

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run test suite with Vitest
- `npm run test:ui` - Run tests with UI interface

## Controls

- **Arrow Keys** or **WASD** - Move player
- **Spacebar** - Attack nearby enemies
- **Mouse** - Interact with UI elements

## Architecture

### Core Components

**Core Systems** (`src/core/`):
- **Game** (`src/core/Game.ts`) - Main game coordinator and orchestration (221 lines, 40% reduction from refactoring)
- **Renderer** (`src/core/Renderer.ts`) - PixiJS-based rendering with emoji support, animations, and camera integration
- **TileMap** (`src/core/TileMap.ts`) - Tile-based world generation, collision detection, and visibility tracking
- **LineOfSight** (`src/core/LineOfSight.ts`) - FOV calculation and visibility management

**Specialized Systems** (`src/systems/`):
- **Input System** (`src/systems/input/InputHandler.ts`) - Centralized keyboard event management with callback architecture (49 lines)
- **Movement System** (`src/systems/movement/MovementSystem.ts`) - Movement logic, collision detection, and grid snapping (125 lines)
- **Combat System** (`src/systems/combat/CombatSystem.ts`) - D&D 5e-inspired combat mechanics with damage types
- **Combat Manager** (`src/systems/combat/CombatManager.ts`) - Combat orchestration and visual effects coordination (90 lines)
- **Animation System** (`src/systems/animation/AnimationSystem.ts`) - Dedicated visual effects and animation management
- **Camera System** (`src/systems/camera/CameraSystem.ts`) - Viewport management, entity following, coordinate conversion
- **Font System** (`src/systems/font/FontSystem.ts`) - Centralized font management for emoji and ASCII rendering
- **Dice System** (`src/systems/dice/DiceSystem.ts`) - D&D-style dice rolling mechanics ("2d6+3" notation)

**Management Layer** (`src/managers/`):
- **GameStateManager** (`src/managers/GameStateManager.ts`) - Entity lifecycle and game loop management (140 lines)
- **CharacterManager** (`src/managers/CharacterManager.ts`) - Singleton character progression and class system
- **ResourceManager** (`src/managers/ResourceManager.ts`) - Multi-resource system supporting HP, mana, and theme-specific resources

**Data Loaders** (`src/loaders/`):
- **EnemyLoader** (`src/loaders/EnemyLoader.ts`) - Enemy data loading and validation from JSON
- **ItemLoader** (`src/loaders/ItemLoader.ts`) - Item data loading and validation from JSON with damage types
- **WorldConfigLoader** (`src/loaders/WorldConfigLoader.ts`) - World theme and configuration management system

**Entity Utilities** (`src/entities/`):
- **CreateEntity** (`src/entities/CreateEntity.ts`) - Centralized entity creation utilities for consistency

**Core Utilities** (`src/utils/`):
- **ErrorHandler** (`src/utils/ErrorHandler.ts`) - Comprehensive error handling framework with typed error codes (126 lines)
- **Logger** (`src/utils/Logger.ts`) - Professional logging system with configurable levels (117 lines)

### UI Components

- **Character Sheets** (`src/ui/CharacterSheet.ts`) - Character status display and progression UI
- **Components** (`src/ui/components/`) - Reusable UI elements and resource displays

### Detailed Architecture

For comprehensive technical documentation including system interconnections, position management, rendering pipeline, and data flow patterns, see [docs/architecture.md](docs/architecture.md).

### Tech Stack

- **TypeScript** - Type-safe development with strict mode
- **PixiJS** - Hardware-accelerated 2D rendering
- **Vite** - Fast development and build tooling
- **MobX** - Reactive state management
- **GSAP** - High-performance animations
- **Vitest** - Modern testing framework with 154 comprehensive tests

## Game Systems

### Character Stats
Each entity has full D&D 5e-style attributes:
- **Abilities**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- **Combat**: Hit Points, Armor Class, Proficiency Bonus
- **Progression**: Level system

### Combat Mechanics
- **Attack Rolls**: d20 + ability modifier + proficiency bonus
- **Damage Types**: Physical, elemental, magical (varies by world theme)
- **Damage Resistance**: Configurable resistance/vulnerability system
- **Critical Hits**: Multiple critical hit rules (double damage, max+roll, double dice)
- **Range**: Melee attacks require adjacent positioning
- **Multi-Resource System**: HP, mana, stamina, and theme-specific resources

### World Generation
- Procedurally generated dungeon layouts
- Wall and floor tile placement
- Enemy spawn locations
- Multi-theme world system (Fantasy, Cyberpunk, Steampunk, Horror)
- Theme-specific damage types and resistance systems
- Configurable resource systems per world theme

## Development

### Project Structure
```
src/
├── core/                    # Core game systems
│   ├── Game.ts                 # Main game coordinator (221 lines)
│   ├── Renderer.ts             # PixiJS rendering with emoji support
│   ├── TileMap.ts              # World generation and collision detection
│   └── LineOfSight.ts          # FOV calculation and visibility
├── systems/                 # Specialized systems
│   ├── input/
│   │   └── InputHandler.ts     # Keyboard event management (49 lines)
│   ├── movement/
│   │   └── MovementSystem.ts   # Movement logic and collision (125 lines)
│   ├── combat/
│   │   ├── CombatSystem.ts     # D&D 5e combat mechanics
│   │   └── CombatManager.ts    # Combat orchestration (90 lines)
│   ├── animation/
│   │   └── AnimationSystem.ts  # Visual effects and animations
│   ├── camera/
│   │   └── CameraSystem.ts     # Viewport and camera management
│   ├── font/
│   │   └── FontSystem.ts       # Centralized font management
│   └── dice/
│       └── DiceSystem.ts       # D&D-style dice rolling mechanics
├── managers/                # Management layer
│   ├── GameStateManager.ts     # Entity lifecycle (140 lines)
│   ├── CharacterManager.ts     # Character progression system
│   └── ResourceManager.ts      # Multi-resource management
├── loaders/                 # Data loading systems
│   ├── EnemyLoader.ts          # Enemy data loading and validation
│   ├── ItemLoader.ts           # Item data with damage types
│   └── WorldConfigLoader.ts    # World theme configuration
├── entities/                # Entity utilities
│   └── CreateEntity.ts         # Centralized entity creation
├── ui/                      # User interface
│   ├── CharacterSheet.ts       # Character status display
│   └── components/             # Reusable UI components
│       └── ResourceDisplay.ts  # Multi-resource display
├── utils/                   # Core utilities
│   ├── ErrorHandler.ts         # Error handling framework (126 lines)
│   └── Logger.ts               # Logging system (117 lines)
├── data/                    # JSON configuration
│   ├── characterClasses.json   # Character class definitions
│   ├── enemies.json            # Standard enemy definitions
│   ├── items.json              # Item definitions with damage types
│   ├── worlds.json             # World theme configurations
│   ├── cyberpunk-enemies.json  # Cyberpunk-themed enemies
│   └── cyberpunk-items.json    # Cyberpunk-themed items
├── types/                   # TypeScript interfaces
│   └── index.ts                # Shared type definitions
└── main.ts                  # Application entry point
```

**Test Structure** (`tests/`):
```
tests/
├── core/                    # Core system tests
│   ├── Renderer.test.ts        # Rendering with PixiJS mocks (19 tests)
│   ├── TileMap.test.ts         # Map generation (14 tests)
│   └── LineOfSight.test.ts     # FOV algorithms (12 tests)
├── systems/                 # System tests
│   ├── CombatSystem.test.ts    # D&D mechanics (22 tests)
│   ├── CombatManager.test.ts   # Combat orchestration (11 tests)
│   ├── MovementSystem.test.ts  # Movement logic (8 tests)
│   └── InputHandler.test.ts    # Input handling (5 tests)
├── managers/                # Manager tests
│   ├── CharacterManager.test.ts # Character management (14 tests)
│   └── GameStateManager.test.ts # Entity lifecycle (9 tests)
├── loaders/                 # Data loader tests
│   ├── ItemLoader.test.ts      # Item system (16 tests)
│   ├── EnemyLoader.test.ts     # Enemy data (8 tests)
│   └── WorldConfigLoader.test.ts # World config (11 tests)
└── ui/components/           # UI component tests
    └── ResourceDisplay.test.ts # Resource UI (5 tests)
```

### Adding New Features

1. **New Entity Types**: Extend the `Entity` interface in `src/types/index.ts`
2. **Combat Abilities**: Add methods to `CombatSystem` class in `src/systems/combat/` and update `CombatManager`
3. **Visual Effects**: Implement in `Renderer` (`src/core/`) or `AnimationSystem` (`src/systems/animation/`) with GSAP animations
4. **World Features**: Modify `TileMap` generation algorithms in `src/core/`
5. **Input Handling**: Add new key bindings in `InputHandler` (`src/systems/input/`) with callback system
6. **Movement Mechanics**: Extend `MovementSystem` (`src/systems/movement/`) for new movement types
7. **Game State**: Manage entity lifecycle through `GameStateManager` (`src/managers/`)

### Testing

The project includes comprehensive testing with Vitest:
- **154 tests** covering all core systems
- **Seeded randomness** for deterministic testing
- **Mock PixiJS** integration for renderer testing
- **D&D mechanics validation** with dice rolling simulation
- **Error handling** and edge case coverage

Run tests with:
```bash
npm run test          # Run all tests
npm run test:ui       # Run tests with UI interface
```

### Code Style
- TypeScript strict mode enabled with comprehensive type safety
- ES modules throughout with dependency injection pattern
- Consistent emoji usage for game elements
- Performance-focused rendering with object pooling
- Modular architecture with single responsibility principle
- Comprehensive error handling with typed error codes
- Professional logging system with configurable levels
- Test-driven development with high coverage

## Recent Development

Latest features added (as of recent commits):
- **Multi-World System**: Fantasy, Cyberpunk, Steampunk, and Horror world themes with unique mechanics
- **Advanced Resource Management**: Multi-resource system supporting HP, mana, heat, sanity, corruption, etc.
- **Enhanced Combat System**: Damage types, resistance/vulnerability system, theme-specific mechanics
- **Item System**: JSON-based item loading with damage types and world-specific variants
- **World Configuration**: Dynamic world loading with theme-specific rules and resources
- **UI Resource Display**: Character sheet integration with new resource system
- **Entity Creation System**: Centralized entity creation utilities for consistency
- **Comprehensive Testing**: 154 tests covering all core systems with 100% pass rate and deterministic seeded randomness
- **Error Handling Framework**: Professional error management with GameError class and typed error codes
- **Logging Infrastructure**: Configurable logging system with multiple levels and context
- **Major Architectural Refactor**: Complete codebase restructuring with modular directory organization
- **System Extraction**: Extracted CameraSystem, FontSystem, and DiceSystem for better separation of concerns
- **Directory Restructuring**: Organized code into logical modules (core, systems, managers, loaders, entities, ui)
- **Test Organization**: Moved all tests to root `tests/` directory with structured organization
- **Input System**: Centralized keyboard management with callback-based architecture
- **Movement System**: Dedicated movement logic with collision detection and grid snapping
- **Combat Management**: Combat orchestration with visual effects coordination
- **State Management**: Entity lifecycle management with safe spawning
- **Camera System**: Extracted viewport and camera management with coordinate conversion
- **Font Management**: Centralized font system for consistent emoji and ASCII rendering
- **Dice Mechanics**: Extracted D&D-style dice rolling system with notation support
- Line of sight system with ray casting FOV
- Scrolling camera that follows player movement

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with proper TypeScript types
4. Write tests for new functionality
5. Test locally with `npm run dev`
6. Run the full test suite: `npm run test`
7. Run type checking: `npm run typecheck`
8. Ensure all tests pass and code follows style guidelines
9. Submit a pull request

### Quality Assurance

- All code must pass TypeScript strict mode compilation
- New features require corresponding tests
- Tests must be deterministic with seeded randomness where applicable
- Error handling should use the `GameError` framework
- Logging should use the centralized `Logger` system

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Inspired by classic roguelike games like NetHack and Angband
- Uses D&D 5e mechanics under Open Game License
- Emoji graphics from Unicode Consortium
- Built with modern web technologies for accessibility

---

*Happy dungeon crawling! 🏰⚔️*