# Roguelike Agent

An emoji-based roguelike game built with TypeScript and PixiJS, inspired by games like D&D, Caves of Qud and NetHack. This was originally meant as a test for claude code that quickly grew into an engine. Things are in a rough state with not all features implemented yet for a complete game loop.

## Features

- **Emoji-based graphics**: Unicode emojis for characters and environments
- **Turn-based combat**: D&D 5e-inspired mechanics with damage types and resistances
- **Line of sight**: Realistic FOV with ray casting
- **Smooth animations**: Fluid movement and combat feedback
- **Character progression**: RPG stats with multi-resource management
- **JSON Resources**: Load items, game mechanics, sounds, worlds directly from JSON files
- **Procedural audio**: Asset-free sound generation with spatial audio

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
   Open `http://localhost:3000` in your browser.

### Development Workflow
1. **Manual Testing**: Run `npm run dev` to test functionality.
2. **Automated Testing**: Use `npm run test` for the test suite.
3. **Type Checking**: Run `npm run typecheck` for TypeScript compliance.
4. **Production Build**: Use `npm run build` for deployment.

### Available Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run typecheck`: TypeScript type checking
- `npm run test`: Run test suite

## Architecture

### Core Components
- **Game**: Main game coordinator
- **Renderer**: PixiJS-based rendering with emoji support
- **TileMap**: World generation and collision detection
- **LineOfSight**: FOV calculation and visibility
- **EventBus**: High-performance event system

### Specialized Systems
- **Input System**: Keyboard event management
- **Combat System**: D&D 5e-inspired mechanics
- **Animation System**: Visual effects and animations
- **Pathfinding System**: A\* algorithm with caching
- **Audio System**: Procedural sound generation

### Management Layer
- **GameStateManager**: Entity lifecycle and game loop
- **CharacterManager**: Character progression
- **ResourceManager**: Multi-resource management

### UI Components
- **Character Sheets**: RPG stats and resource display
- **Reusable Components**: Modular UI elements

## Testing
- **326 tests** with 100% pass rate
- **Functional testing**: Validates game logic
- **Deterministic testing**: Seeded randomness for reproducibility
- **Performance validation**: Pathfinding, audio, and rendering

Run tests with:
```bash
npm run test
```

## Contributing
1. Fork the repository and create a feature branch.
2. Write tests for new functionality.
3. Ensure all tests pass and code follows architecture patterns.
4. Submit a pull request.

## License
This project is open source under the MIT License.

---
*Happy dungeon crawling! 🏰⚔️🎵*