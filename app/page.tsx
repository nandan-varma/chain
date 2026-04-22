"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createGame } from "@/lib/game-hooks"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreateGame = async () => {
    setLoading(true)
    try {
      const gameId = await createGame()
      router.push(`/chain/${gameId}?player=host`)
    } catch (error) {
      console.error("Failed to create game:", error)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-4xl font-bold text-slate-900">Chain Reaction</h1>
        <p className="text-slate-600">
          A two-player strategy game. Place orbs on the board - when a cell
          reaches critical mass, it explodes and spreads orbs to neighboring
          cells. Eliminate all opponent orbs to win!
        </p>

        <div className="flex flex-col gap-3 items-center pt-4">
          <Button
            onClick={handleCreateGame}
            disabled={loading}
            size="lg"
            className="min-w-48"
          >
            {loading ? "Creating..." : "Create Game"}
          </Button>
          <p className="text-sm text-slate-500">
            Share the link to play with a friend
          </p>
        </div>

        <div className="mt-8 p-4 bg-slate-100 rounded-lg text-left text-sm text-slate-600">
          <p className="font-medium text-slate-700 mb-2">How to play:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Corner cells explode at 2 orbs</li>
            <li>Edge cells explode at 3 orbs</li>
            <li>Center cells explode at 4 orbs</li>
            <li>When a cell explodes, it sends orbs to all 4 neighbors</li>
            <li>First player to clear all opponent orbs wins!</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
