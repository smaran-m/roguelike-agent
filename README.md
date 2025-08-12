# Roguelike Agent

A text-based roguelike game built with TypeScript and PixiJS, inspired by games like D&D, Caves of Qud and Cataclysm: Dark Days Ahead. This was originally meant as a test for claude code that quickly grew into an engine. Things are in a rough state with not all features implemented yet for a complete game loop, see roadmap for more.

## Features

- **Text-based graphics**: Entities are emojis, levels are text characters
- **Dice combat system**: D&D 5e-inspired mechanics with damage types and resistances
- **Line of sight**: Realistic LOS with ray casting
- **Smooth animations**: Fluid movement and combat feedback
- **Character progression**: RPG stats with multi-resource management
- **JSON Resources**: Load items, game mechanics, sounds, worlds directly from JSON files
- **Procedural audio**: Asset-free sound generation with spatial audio
- **Event Bus**: Systems can communicate with each other through the event bus

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

## Roadmap
- Physics and properties for entities
- Player systems
- Context-based action system
- Rules engine
- Turn based combat
- Level generation system
- Enemy AI


## Contributing
1. Fork the repository and create a feature branch.
2. Write tests for new functionality.
3. Ensure all tests pass and code follows architecture patterns.
4. Submit a pull request.

## License
This project is open source under the MIT License.