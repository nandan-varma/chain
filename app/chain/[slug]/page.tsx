"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import {
  createGame,
  joinGame,
  useGameActions,
  useGameListener,
} from "@/lib/game-hooks"
import { type GameState } from "@/lib/game-types"
import { Button } from "@/components/ui/button"
import ChainReactionGame from "@/components/chain-reaction-game"

export default function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null)

  const gameId = resolvedSlug
  const playerType = searchParams.get("player") as "host" | "joiner" | null
  const myPlayer: 1 | 2 = playerType === "host" ? 1 : 2

  useEffect(() => {
    params.then((p) => setResolvedSlug(p.slug))
  }, [params])

  const { gameState, loading, error } = useGameListener(
    gameId || "",
    playerType || "host"
  )
  const { makeMove, resetGame, leaveGame } = useGameActions(
    gameId || "",
    playerType || "host",
    gameState
  )

  useEffect(() => {
    if (!gameState || !playerType || playerType !== "joiner" || loading) return
    if (
      gameState.gameStatus === "waiting" &&
      gameState.createdBy !== "joiner"
    ) {
      joinGame(gameId!).catch(console.error)
    }
  }, [gameState, playerType, loading, gameId])

  if (!gameId || !playerType) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">Invalid game link</p>
        <Button onClick={() => router.push("/")}>Go Home</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        <p className="text-slate-600">Loading game...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => router.push("/")}>Go Home</Button>
      </div>
    )
  }

  if (gameState.gameStatus === "waiting" && playerType === "host") {
    return <WaitingScreen gameId={gameId} />
  }

  return (
    <ChainReactionGame
      gameState={gameState}
      onCellClick={makeMove}
      onReset={resetGame}
      onLeave={leaveGame}
      myPlayer={myPlayer}
    />
  )
}

function WaitingScreen({ gameId }: { gameId: string }) {
  const [copied, setCopied] = useState(false)
  const gameUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/chain/${gameId}?player=joiner`
      : ""

  const handleCopy = async () => {
    await navigator.clipboard.writeText(gameUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-2xl font-bold text-slate-900">
            Waiting for opponent...
          </h1>
        </div>

        <p className="text-slate-600">Share this link with your friend:</p>

        <div className="flex items-center gap-2 max-w-md">
          <input
            readOnly
            value={gameUrl}
            className="flex-1 px-3 py-2 border rounded-md bg-slate-50 text-sm"
          />
          <Button onClick={handleCopy} variant="outline">
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4">
          <span className="w-4 h-4 rounded-full bg-red-500" />
          <span className="text-slate-700 font-medium">
            You are Red (Player 1)
          </span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button variant="ghost" onClick={() => (window.location.href = "/")}>
          Go Back
        </Button>
      </div>
    </div>
  )
}
