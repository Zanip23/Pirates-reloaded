# Black Tide Trader

A retro 2D top-down pirate trading game built with Phaser 3. Inspired by classic C64/Amiga games.

## Installation

```bash
npm install
```

## Start (dev server)

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Build for production

```bash
npm run build
npm run preview
```

## Controls

### Desktop
- **WASD** or **Arrow Keys** — move ship
- **Mouse** — click buttons, interact with UI

### Mobile / Touchscreen
- **Tap on the ocean** — ship sails to that point
- **Arrow buttons** (bottom-left) — direct movement
- **Tap DOCK button** — enter a port when nearby

## Gameplay

1. Sail your ship across the open ocean between 6 ports
2. Buy cheap goods at ports that produce them
3. Sell for profit at ports that need them
4. Survive random encounters: pirate attacks, storms, driftwood, merchants
5. Use gold to upgrade your ship at the Shipyard
6. Hire crew and boost morale at the Tavern
7. Progress to tougher routes for bigger rewards

## Key Trade Routes
- **Rum**: Buy cheap in Port Haven, sell in Kingsport
- **Spices**: Buy in Isla Verde, sell in Blackwater Cay
- **Wood**: Buy in Redreef, sell in San Cordoba
- **Iron**: Buy in Kingsport, sell in Port Haven
- **Cloth**: Buy in San Cordoba, sell in Redreef
- **Tobacco**: Buy in Blackwater Cay, sell in Isla Verde

## Saving
The game auto-saves to `localStorage` whenever you dock or after combat. Use "Continue" on the title screen to resume.

## Known Limitations
- No audio (clean omission — no broken placeholders)
- No external image assets — all graphics are procedurally drawn with Phaser Graphics API
- Map is fixed, not procedurally generated
- No roaming NPC ships — events are random pop-ups during travel

## Possible Next Features
- Animated NPC ships patrolling the ocean
- Fog of war / explored map tracking
- Ship name customisation at start
- More goods, ports, and trade routes
- Simple quest / mission system
- Named crew members with traits
- Sound effects via Web Audio API
- Dynamic weather with visual effects
