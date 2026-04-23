import {
  COLS,
  PLAYER_COLORS,
  ROWS,
  type AnimatingOrb,
  type Cell,
  type GameState,
  type Player,
} from "./game-types"

export const ANIMATION_DURATION = 500
export const MAX_EXPLOSION_ITERATIONS = 100
export const ORB_SPAWN_DELAY_MS = 50
export const EXPLOSION_DELAY_MS = 300

export interface ExplosionRound {
  round: number
  explosions: Array<{
    row: number
    col: number
    orbsToDistribute: number
    targetCells: Array<{ row: number; col: number }>
  }>
}

export function getCriticalMass(row: number, col: number): number {
  const isCorner =
    (row === 0 || row === ROWS - 1) && (col === 0 || col === COLS - 1)
  const isEdge = row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1
  if (isCorner) return 2
  if (isEdge) return 3
  return 4
}

export function createInitialBoard(): Cell[][] {
  return Array(ROWS)
    .fill(null)
    .map((_, row) =>
      Array(COLS)
        .fill(null)
        .map((_, col) => ({
          count: 0,
          player: null,
          criticalMass: getCriticalMass(row, col),
        }))
    )
}

export function getAdjacentCells(row: number, col: number): [number, number][] {
  const adjacent: [number, number][] = []
  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  for (const [dr, dc] of directions) {
    const newRow = row + dr
    const newCol = col + dc
    if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
      adjacent.push([newRow, newCol])
    }
  }
  return adjacent
}

export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })))
}

export function calculateExplosionRounds(
  board: Cell[][],
  player: Player
): ExplosionRound[] {
  const rounds: ExplosionRound[] = []
  let workingBoard = cloneBoard(board)
  let roundNumber = 0

  while (roundNumber < MAX_EXPLOSION_ITERATIONS) {
    roundNumber++
    const explosions: ExplosionRound["explosions"] = []

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = workingBoard[r][c]
        if (cell.count >= cell.criticalMass) {
          const orbsToDistribute = cell.criticalMass
          const adjacent = getAdjacentCells(r, c)

          explosions.push({
            row: r,
            col: c,
            orbsToDistribute,
            targetCells: adjacent.map(([adjRow, adjCol]) => ({
              row: adjRow,
              col: adjCol,
            })),
          })

          cell.count -= orbsToDistribute
          if (cell.count <= 0) {
            cell.count = 0
            cell.player = null
          }
        }
      }
    }

    if (explosions.length === 0) break

    for (const exp of explosions) {
      for (const target of exp.targetCells) {
        const adjCell = workingBoard[target.row][target.col]

        if (adjCell.player === null || adjCell.player === player) {
          adjCell.player = player
          adjCell.count += 1
        } else {
          adjCell.player = player
          adjCell.count += 1
        }
      }
    }

    rounds.push({ round: roundNumber, explosions })
  }

  return rounds
}

export function applyMove(
  board: Cell[][],
  row: number,
  col: number,
  player: Player
): { board: Cell[][]; hasExplosion: boolean; rounds: ExplosionRound[] } {
  const newBoard = cloneBoard(board)
  const cell = newBoard[row][col]

  if (cell.count === 0) {
    cell.count = 1
    cell.player = player
  } else if (cell.player === player) {
    cell.count += 1
  } else {
    cell.player = player
    cell.count += 1
  }

  const rounds = calculateExplosionRounds(newBoard, player)
  const hasExplosion = rounds.length > 0

  return { board: newBoard, hasExplosion, rounds }
}

export function processExplosions(
  board: Cell[][],
  player: Player
): { board: Cell[][]; animatingOrbs: AnimatingOrb[] } {
  let newBoard = cloneBoard(board)
  const animatingOrbs: AnimatingOrb[] = []
  let hasExplosions = true
  let iterationCount = 0
  let lastExplosion: { row: number; col: number } | null = null

  while (hasExplosions && iterationCount < MAX_EXPLOSION_ITERATIONS) {
    iterationCount++
    hasExplosions = false
    const explosions: [number, number][] = []

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (newBoard[r][c].count >= newBoard[r][c].criticalMass) {
          explosions.push([r, c])
          hasExplosions = true
        }
      }
    }

    if (explosions.length > 0) {
      for (const [r, c] of explosions) {
        const cell = newBoard[r][c]
        const orbsToDistribute = cell.criticalMass
        const cellColor = cell.player ? PLAYER_COLORS[cell.player] : "#ffffff"
        const targetColor = PLAYER_COLORS[player]
        lastExplosion = { row: r, col: c }

        cell.count -= orbsToDistribute
        if (cell.count <= 0) {
          cell.count = 0
          cell.player = null
        }

        const adjacent = getAdjacentCells(r, c)
        for (const [adjRow, adjCol] of adjacent) {
          const adjCell = newBoard[adjRow][adjCol]
          const fromColor = adjCell.player
            ? PLAYER_COLORS[adjCell.player]
            : "#ffffff"

          animatingOrbs.push({
            id: `${Date.now()}-${Math.random()}`,
            fromPosition: [c, 0.3, r],
            toPosition: [adjCol, 0.3, adjRow],
            fromColor,
            toColor: targetColor,
            startTime: Date.now() + animatingOrbs.length * ORB_SPAWN_DELAY_MS,
            duration: ANIMATION_DURATION,
            completed: false,
          })

          if (adjCell.player === null || adjCell.player === player) {
            adjCell.player = player
            adjCell.count += 1
          } else {
            adjCell.player = player
            adjCell.count += 1
          }
        }
      }
    }
  }

  return { board: newBoard, animatingOrbs }
}

export function checkVictory(
  board: Cell[][],
  moveCount: number
): { winner: Player | null; gameStatus: "playing" | "won" } {
  if (moveCount < 2) {
    return { winner: null, gameStatus: "playing" }
  }

  let player1HasOrbs = false
  let player2HasOrbs = false

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].count > 0) {
        if (board[r][c].player === 1) player1HasOrbs = true
        if (board[r][c].player === 2) player2HasOrbs = true
      }
    }
  }

  if (!player1HasOrbs && player2HasOrbs) {
    return { winner: 2, gameStatus: "won" }
  }
  if (!player2HasOrbs && player1HasOrbs) {
    return { winner: 1, gameStatus: "won" }
  }

  return { winner: null, gameStatus: "playing" }
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 1,
    gameStatus: "waiting",
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
