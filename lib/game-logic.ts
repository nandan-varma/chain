import {
  COLS,
  ROWS,
  type Cell,
  type Explosion,
  type GameState,
  type GameStatus,
  type MoveResult,
  type Player,
  type VictoryResult,
} from "./game-types"

export function getCriticalMass(row: number, col: number): number {
  const isCorner =
    (row === 0 || row === ROWS - 1) && (col === 0 || col === COLS - 1)
  const isEdge = row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1
  if (isCorner) return 2
  if (isEdge) return 3
  return 4
}

export function createInitialBoard(): Cell[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      count: 0,
      player: null as Player | null,
      criticalMass: getCriticalMass(r, c),
    }))
  )
}

export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })))
}

export function getNeighbors(r: number, c: number): [number, number][] {
  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  return dirs
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) as [
    number,
    number,
  ][]
}

export function applyMove(
  board: Cell[][],
  row: number,
  col: number,
  player: Player
): MoveResult {
  const newBoard = cloneBoard(board)
  const cell = newBoard[row][col]

  // Place or add orb
  if (cell.count === 0) {
    cell.count = 1
    cell.player = player
  } else if (cell.player === player) {
    cell.count += 1
  } else {
    // Opponent cell - becomes yours + 1
    cell.player = player
    cell.count += 1
  }

  // Process chain reactions
  const explosions = processChainReactions(newBoard, player)

  return { board: newBoard, hasExplosion: explosions.length > 0, explosions }
}

function processChainReactions(board: Cell[][], player: Player): Explosion[] {
  const allExplosions: Explosion[] = []
  let changed = true
  let pass = 0

  while (changed && pass < 50) {
    changed = false
    pass++
    const round: Explosion[] = []

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c]
        if (cell.count >= cell.criticalMass) {
          changed = true
          const neighbors = getNeighbors(r, c)

          // Store explosion before modifying
          round.push({
            row: r,
            col: c,
            orbsToDistribute: cell.criticalMass,
            targetCells: neighbors.map(([nr, nc]) => ({ row: nr, col: nc })),
          })

          // Remove orbs from exploding cell
          cell.count -= cell.criticalMass
          if (cell.count <= 0) {
            cell.count = 0
            cell.player = null
          }

          // Add orbs to neighbors
          for (const [nr, nc] of neighbors) {
            const neighbor = board[nr][nc]
            neighbor.player = player
            neighbor.count += 1
          }
        }
      }
    }

    if (round.length > 0) {
      allExplosions.push(...round)
    }
  }

  return allExplosions
}

export function checkVictory(
  board: Cell[][],
  moveCount: number
): VictoryResult {
  if (moveCount < 2)
    return { winner: null, gameStatus: "playing" as GameStatus }

  let p1 = false,
    p2 = false
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].count > 0) {
        if (board[r][c].player === 1) p1 = true
        if (board[r][c].player === 2) p2 = true
      }
    }
  }

  if (!p1 && p2) return { winner: 2, gameStatus: "won" as GameStatus }
  if (!p2 && p1) return { winner: 1, gameStatus: "won" as GameStatus }
  return { winner: null, gameStatus: "playing" as GameStatus }
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 1,
    gameStatus: "waiting" as GameStatus,
    winner: null,
    moveCount: 0,
    hostConnected: false,
    joinerConnected: false,
    createdBy: null,
  }
}

export function getNextPlayer(current: Player): Player {
  return current === 1 ? 2 : 1
}
