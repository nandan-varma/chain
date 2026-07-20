# Chain Reaction

A turn-based strategy game where you place orbs in cells and trigger chain explosions across the board — rebuilt in 3D for the web, up to 3 players, with real-time state synced via Firebase.

## Features

- 3D rendered board using Three.js and React Three Fiber
- Up to 3 players in the same game
- Chain-reaction explosion mechanics with cell capacity based on board position (corner/edge/center)
- Real-time game state sync via Firebase

## Getting started

```bash
pnpm install
pnpm dev
```

## Built with

- [Next.js](https://nextjs.org)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Three.js](https://threejs.org) — 3D board rendering
- [Firebase](https://firebase.google.com) — realtime multiplayer state
- TypeScript
