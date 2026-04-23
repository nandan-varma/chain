export const ROWS = 9
export const COLS = 6

export const PLAYER_COLORS = {
  1: "#ef4444",
  2: "#22c55e",
} as const

export const PLAYER_NAMES = {
  1: "Red",
  2: "Green",
} as const

export type Player = 1 | 2
export type GameStatus = "waiting" | "playing" | "won" | "exploding"

export interface Cell {
  count: number
  player: Player | null
  criticalMass: number
}

export interface ExplosionRound {
  round: number
  explosions: Array<{
    row: number
    col: number
    orbsToDistribute: number
    targetCells: Array<{ row: number; col: number }>
  }>
}

export interface GameState {
  board: Cell[][]
  currentPlayer: Player
  gameStatus: GameStatus
  winner: Player | null
  moveCount: number
  hostConnected: boolean
  joinerConnected: boolean
  createdBy: "host" | "joiner" | null
  explosionRounds?: ExplosionRound[]
  processingExplosion?: boolean
}

export interface GameMove {
  row: number
  col: number
  player: Player
  timestamp: number
}

export interface AnimatingOrb {
  id: string
  fromPosition: [number, number, number]
  toPosition: [number, number, number]
  fromColor: string
  toColor: string
  startTime: number
  duration: number
  completed: boolean
}
