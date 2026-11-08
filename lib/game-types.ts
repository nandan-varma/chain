export const ROWS = 9
export const COLS = 6

export const PLAYER_COLORS: Record<Player, string> = {
  1: "#ef4444",
  2: "#22c55e",
}

export const PLAYER_NAMES: Record<Player, string> = {
  1: "Red",
  2: "Green",
}

export const INITIAL_BOARD_CONFIG = {
  rows: ROWS,
  cols: COLS,
} as const

export type Player = 1 | 2
export type GameStatus = "waiting" | "playing" | "won"

export type Cell = {
  count: number
  player: Player | null
  criticalMass: number
}

export type GameState = {
  board: Cell[][]
  currentPlayer: Player
  gameStatus: GameStatus
  winner: Player | null
  moveCount: number
  hostConnected: boolean
  joinerConnected: boolean
  createdBy: "host" | "joiner" | null
}

export type Explosion = {
  row: number
  col: number
  orbsToDistribute: number
  targetCells: readonly { row: number; col: number }[]
}

export type MoveResult = {
  board: Cell[][]
  hasExplosion: boolean
  explosions: Explosion[]
}

export type VictoryResult = {
  winner: Player | null
  gameStatus: GameStatus
}
