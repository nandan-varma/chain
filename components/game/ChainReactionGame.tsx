import { memo, useEffect, useRef, useState } from "react"

import { PLAYER_COLORS } from "@/lib/game-types"
import type { GameState, Player } from "@/lib/game-types"
import { Button } from "@/components/ui/button"

import GameBoard from "./GameBoard"

interface ChainReactionGameProps {
  gameState: GameState
  onCellClick: (row: number, col: number) => void
  onReset: () => void
  onLeave: () => void
  myPlayer: Player
}

interface OrbData {
  id: string
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  color: string
  startTime: number
}

const ANIM_DURATION = 350

export default memo(function ChainReactionGame({
  gameState,
  onCellClick,
  onReset,
  onLeave,
  myPlayer,
}: ChainReactionGameProps) {
  const isMyTurn =
    gameState.currentPlayer === myPlayer && gameState.gameStatus === "playing"
  const isGameOver = gameState.gameStatus === "won"

  const [prevBoard, setPrevBoard] = useState<GameState["board"] | null>(null)
  const [orbs, setOrbs] = useState<OrbData[]>([])
  const lastTimeRef = useRef(0)

  useEffect(() => {
    if (!prevBoard || prevBoard === gameState.board) {
      setPrevBoard(gameState.board)
      return
    }

    const now = Date.now()
    if (now - lastTimeRef.current < 50) return
    lastTimeRef.current = now

    const newOrbs: OrbData[] = []
    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]

    for (let r = 0; r < gameState.board.length; r++) {
      for (let c = 0; c < gameState.board[0].length; c++) {
        const prev = prevBoard[r]?.[c]
        const curr = gameState.board[r]?.[c]

        if (!prev || !curr) continue

        const exploded = prev.count >= prev.criticalMass
        const nowEmptyOrLess = curr.count < prev.count

        if (exploded && nowEmptyOrLess) {
          const color = curr.player ? PLAYER_COLORS[curr.player] : "#ffffff"

          for (const [dr, dc] of dirs) {
            const tr = r + dr,
              tc = c + dc
            if (tr >= 0 && tr < 9 && tc >= 0 && tc < 6) {
              newOrbs.push({
                id: `orb-${now}-${r}-${c}-${tr}-${tc}`,
                fromRow: r,
                fromCol: c,
                toRow: tr,
                toCol: tc,
                color,
                startTime: now,
              })
            }
          }
        }
      }
    }

    if (newOrbs.length > 0) {
      setOrbs((prev) => [...prev, ...newOrbs])
      setTimeout(() => {
        setOrbs((prev) =>
          prev.filter((o) => !newOrbs.find((n) => n.id === o.id))
        )
      }, ANIM_DURATION + 150)
    }

    setPrevBoard(gameState.board)
  }, [gameState.board, prevBoard])

  const activeOrbs = orbs.filter(
    (o) => Date.now() - o.startTime < ANIM_DURATION + 100
  )

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <header className="p-4 flex items-center justify-between bg-slate-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Chain Reaction</h1>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: PLAYER_COLORS[myPlayer], color: "white" }}
          >
            You are {myPlayer === 1 ? "Red" : "Green"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {gameState.gameStatus === "playing" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Turn:</span>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: PLAYER_COLORS[gameState.currentPlayer],
                  color: "white",
                  opacity: isMyTurn ? 1 : 0.5,
                }}
              >
                {isMyTurn ? "Your turn" : "Opponent's turn"}
              </span>
            </div>
          )}
          {isGameOver && gameState.winner && (
            <span
              className="px-4 py-2 rounded-full text-sm font-bold"
              style={{
                backgroundColor: PLAYER_COLORS[gameState.winner],
                color: "white",
              }}
            >
              {gameState.winner === myPlayer ? "You Win!" : "You Lose!"}
            </span>
          )}
          <Button onClick={onReset} variant="outline" size="sm">
            New Game
          </Button>
          <Button onClick={onLeave} variant="ghost" size="sm">
            Leave
          </Button>
        </div>
      </header>
      <main className="flex-1 p-0">
        <GameBoard
          gameState={gameState}
          onCellClick={onCellClick}
          isMyTurn={isMyTurn}
          flyingOrbs={activeOrbs}
        />
      </main>
    </div>
  )
})
