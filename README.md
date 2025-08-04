# Roguelike Agent 🎮

An emoji-based roguelike game built with TypeScript and PixiJS, featuring D&D 5e-inspired combat mechanics, line of sight system, and smooth animations.

## 📝 Documentation Maintenance

**For Contributors**: When modifying the codebase, please keep this README synchronized:

- **Test count** (currently 114+): Update when adding/removing tests
- **Component architecture**: Add new systems to the appropriate sections
- **Project structure**: Reflect actual directory organization under src/
- **Available scripts**: Keep in sync with package.json
- **Dependencies**: Update tech stack versions when upgrading

**Quick sync check**: Search for "114+" across documentation files to update test counts.

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

- **Game** (`src/game/Game.ts`) - Main game coordinator and orchestration
- **InputHandler** (`src/game/InputHandler.ts`) - Keyboard event management and input processing
- **MovementSystem** (`src/game/MovementSystem.ts`) - Movement logic and collision detection
- **CombatManager** (`src/game/CombatManager.ts`) - Combat orchestration and visual effects
- **GameStateManager** (`src/game/GameStateManager.ts`) - Entity lifecycle and game loop management
- **Renderer** (`src/game/Renderer.ts`) - PixiJS-based rendering with camera system
- **TileMap** (`src/game/TileMap.ts`) - World generation and collision detection
- **CombatSystem** (`src/game/CombatSystem.ts`) - D&D-style combat mechanics
- **LineOfSight** (`src/game/LineOfSight.ts`) - FOV and visibility calculations
- **AnimationSystem** (`src/game/AnimationSystem.ts`) - Dedicated visual effects and animation management

### Support Systems

- **CharacterManager** (`src/managers/CharacterManager.ts`) - Singleton character progression and class system
- **EnemyLoader** (`src/utils/EnemyLoader.ts`) - Enemy data loading and validation from JSON
- **ErrorHandler** (`src/utils/ErrorHandler.ts`) - Comprehensive error handling framework
- **Logger** (`src/utils/Logger.ts`) - Configurable logging system with multiple levels

### UI Components

- **CharacterSheet** (`src/ui/CharacterSheet.ts`) - Player character display panel
- **CharacterPortrait** (`src/ui/CharacterPortrait.ts`) - Dynamic health-based portraits

### Detailed Architecture

For comprehensive technical documentation including system interconnections, position management, rendering pipeline, and data flow patterns, see [docs/architecture.md](docs/architecture.md).

### Tech Stack

- **TypeScript** - Type-safe development with strict mode
- **PixiJS** - Hardware-accelerated 2D rendering
- **Vite** - Fast development and build tooling
- **MobX** - Reactive state management
- **GSAP** - High-performance animations
- **Vitest** - Modern testing framework with 114+ comprehensive tests

## Game Systems

### Character Stats
Each entity has full D&D 5e-style attributes:
- **Abilities**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- **Combat**: Hit Points, Armor Class, Proficiency Bonus
- **Progression**: Level system

### Combat Mechanics
- **Attack Rolls**: d20 + ability modifier + proficiency bonus
- **Damage**: Weapon dice + ability modifier
- **Critical Hits**: Natural 20s deal double damage
- **Range**: Melee attacks require adjacent positioning

### World Generation
- Procedurally generated dungeon layouts
- Wall and floor tile placement
- Enemy spawn locations
- Configurable themes and tilesets

## Development

### Project Structure
```
src/
├── game/                    # Core game systems
│   ├── Game.ts                 # Main game coordinator (221 lines)
│   ├── InputHandler.ts         # Keyboard event management (49 lines)
│   ├── MovementSystem.ts       # Movement and collision logic (125 lines)
│   ├── CombatManager.ts        # Combat orchestration (90 lines)
│   ├── GameStateManager.ts     # Entity lifecycle management (140 lines)
│   ├── AnimationSystem.ts      # Visual effects and animation management
│   ├── Renderer.ts             # PixiJS rendering with camera
│   ├── TileMap.ts              # World generation and collision
│   ├── CombatSystem.ts         # D&D-style combat mechanics
│   ├── LineOfSight.ts          # FOV and visibility calculations
│   ├── CreateEntity.ts         # Entity creation utilities
│   └── tests/                  # Comprehensive test suite (114+ tests)
│       ├── CombatSystem.test.ts    # D&D mechanics with seeded randomness
│       ├── LineOfSight.test.ts     # FOV algorithms
│       ├── TileMap.test.ts         # Map generation
│       ├── Renderer.test.ts        # Rendering system
│       ├── CharacterManager.test.ts # Character management
│       ├── GameStateManager.test.ts # Entity management
│       ├── CombatManager.test.ts   # Combat orchestration
│       ├── MovementSystem.test.ts  # Movement logic
│       ├── EnemyLoader.test.ts     # Enemy data loading
│       └── InputHandler.test.ts    # Input handling
├── managers/                # Game management systems
│   └── CharacterManager.ts     # Character progression and classes
├── ui/                      # User interface components
│   ├── CharacterSheet.ts       # Character display panel
│   └── CharacterPortrait.ts    # Dynamic health-based portraits
├── utils/                   # Support utilities
│   ├── EnemyLoader.ts          # Enemy data loading and validation
│   ├── ErrorHandler.ts         # Comprehensive error handling (126 lines)
│   └── Logger.ts               # Professional logging system (117 lines)
├── data/                    # JSON configuration files
│   ├── characterClasses.json   # Character class definitions
│   └── enemies.json            # Enemy type definitions
├── demo/                    # Demo and example code
│   ├── characterDemo.ts        # Character system demo
│   └── enemyDemo.ts            # Enemy system demo
├── types/                   # TypeScript interfaces
│   └── index.ts                # Shared type definitions
└── main.ts                  # Application entry point
```

### Adding New Features

1. **New Entity Types**: Extend the `Entity` interface in `src/types/index.ts`
2. **Combat Abilities**: Add methods to `CombatSystem` class and update `CombatManager`
3. **Visual Effects**: Implement in `Renderer` with GSAP animations
4. **World Features**: Modify `TileMap` generation algorithms
5. **Input Handling**: Add new key bindings in `InputHandler` with callback system
6. **Movement Mechanics**: Extend `MovementSystem` for new movement types
7. **Game State**: Manage entity lifecycle through `GameStateManager`

### Testing

The project includes comprehensive testing with Vitest:
- **114+ tests** covering all core systems
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