import { useCallback, useEffect, useRef, useState } from "react"
import {
  get,
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  set,
  update,
} from "firebase/database"

import { database } from "./firebase"
import {
  applyMove,
  checkVictory,
  createInitialGameState,
  getNextPlayer,
} from "./game-logic"
import type { GameState, Player } from "./game-types"

const GAME_REF_PREFIX = "chain"

function generateSecureGameId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

export async function createGame(): Promise<string> {
  const gameId = generateSecureGameId()
  const initialState = createInitialGameState()
  await set(ref(database, `${GAME_REF_PREFIX}/${gameId}`), {
    ...initialState,
    gameStatus: "waiting",
    hostConnected: true,
    joinerConnected: false,
    createdBy: "host",
    createdAt: Date.now(),
  })
  return gameId
}

export async function joinGame(gameId: string): Promise<boolean> {
  const gameRef = ref(database, `${GAME_REF_PREFIX}/${gameId}`)
  const snapshot = await get(gameRef)
  if (!snapshot.exists()) return false
  const data = snapshot.val()
  if (data.createdBy === "joiner") return false
  await update(gameRef, {
    createdBy: "joiner",
    joinerConnected: true,
    gameStatus: "playing",
  })
  return true
}

export function useGameListener(gameId: string, playerType: "host" | "joiner") {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gameId) return
    const gameRef = ref(database, `${GAME_REF_PREFIX}/${gameId}`)
    const disconnect = onDisconnect(gameRef)
    disconnect.update({
      [playerType === "host" ? "hostConnected" : "joinerConnected"]: false,
    })

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setError("Game not found")
        setLoading(false)
        return
      }
      setGameState({
        board: data.board || [],
        currentPlayer: data.currentPlayer || 1,
        gameStatus: data.gameStatus || "waiting",
        winner: data.winner || null,
        moveCount: data.moveCount || 0,
        hostConnected: data.hostConnected ?? false,
        joinerConnected: data.joinerConnected ?? false,
        createdBy: data.createdBy || null,
      })
      setLoading(false)
    })
    return () => {
      unsubscribe()
      disconnect.cancel()
    }
  }, [gameId, playerType])

  return { gameState, loading, error }
}

export function useGameActions(
  gameId: string,
  playerType: "host" | "joiner",
  gameState: GameState | null
) {
  const pendingRef = useRef(false)

  const makeMove = useCallback(
    async (row: number, col: number) => {
      if (pendingRef.current || !gameState) return
      if (gameState.gameStatus !== "playing") return
      const myPlayer: Player = playerType === "host" ? 1 : 2
      if (gameState.currentPlayer !== myPlayer) return

      pendingRef.current = true
      const gameRef = ref(database, `${GAME_REF_PREFIX}/${gameId}`)

      try {
        await runTransaction(gameRef, (current) => {
          if (!current) return
          if (current.gameStatus !== "playing") return current
          if (current.currentPlayer !== myPlayer) return current

          const { board: newBoard } = applyMove(
            current.board,
            row,
            col,
            myPlayer
          )
          const nextPlayer = getNextPlayer(myPlayer)
          const { winner, gameStatus } = checkVictory(
            newBoard,
            (current.moveCount || 0) + 1
          )

          return {
            ...current,
            board: newBoard,
            currentPlayer: nextPlayer,
            gameStatus,
            winner,
            moveCount: (current.moveCount || 0) + 1,
          }
        })
      } catch (err) {
        console.error("Move failed:", err)
      } finally {
        pendingRef.current = false
      }
    },
    [gameId, gameState, playerType]
  )

  const resetGame = useCallback(async () => {
    const gameRef = ref(database, `${GAME_REF_PREFIX}/${gameId}`)
    await update(gameRef, createInitialGameState())
  }, [gameId])

  const leaveGame = useCallback(async () => {
    const gameRef = ref(database, `${GAME_REF_PREFIX}/${gameId}`)
    await update(gameRef, {
      [playerType === "host" ? "hostConnected" : "joinerConnected"]: false,
    })
  }, [gameId, playerType])

  return { makeMove, resetGame, leaveGame }
}
