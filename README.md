# Roguelike Agent 🎮

An emoji-based roguelike game built with TypeScript and PixiJS, featuring D&D 5e-inspired combat mechanics, line of sight system, and smooth animations.

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

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking

## Controls

- **Arrow Keys** or **WASD** - Move player
- **Spacebar** - Attack nearby enemies
- **Mouse** - Interact with UI elements

## Architecture

### Core Components

- **Game** (`src/game/Game.ts`) - Main game loop and state management
- **Renderer** (`src/game/Renderer.ts`) - PixiJS-based rendering with camera system
- **TileMap** (`src/game/TileMap.ts`) - World generation and collision detection
- **CombatSystem** (`src/game/CombatSystem.ts`) - D&D-style combat mechanics
- **LineOfSight** (`src/game/LineOfSight.ts`) - FOV and visibility calculations

### Tech Stack

- **TypeScript** - Type-safe development
- **PixiJS** - Hardware-accelerated 2D rendering
- **Vite** - Fast development and build tooling
- **MobX** - Reactive state management
- **GSAP** - High-performance animations

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
├── game/           # Core game systems
│   ├── Game.ts         # Main game coordinator
│   ├── Renderer.ts     # PixiJS rendering
│   ├── TileMap.ts      # World representation
│   ├── CombatSystem.ts # Combat mechanics
│   └── LineOfSight.ts  # Vision system
├── types/          # TypeScript interfaces
│   └── index.ts        # Shared type definitions
└── main.ts         # Application entry point
```

### Adding New Features

1. **New Entity Types**: Extend the `Entity` interface in `src/types/index.ts`
2. **Combat Abilities**: Add methods to `CombatSystem` class
3. **Visual Effects**: Implement in `Renderer` with GSAP animations
4. **World Features**: Modify `TileMap` generation algorithms

### Code Style
- TypeScript strict mode enabled
- ES modules throughout
- Consistent emoji usage for game elements
- Performance-focused rendering with object pooling

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with proper TypeScript types
4. Test locally with `npm run dev`
5. Run type checking: `npm run typecheck`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by classic roguelike games like NetHack and Angband
- Uses D&D 5e mechanics under Open Game License
- Emoji graphics from Unicode Consortium
- Built with modern web technologies for accessibility

---

*Happy dungeon crawling! 🏰⚔️*