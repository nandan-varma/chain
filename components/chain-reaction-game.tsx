"use client"

import { memo, ReactNode, useEffect, useRef, useState } from "react"
import { Text } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { EXPLOSION_DELAY_MS } from "@/lib/game-logic"
import {
  COLS,
  PLAYER_COLORS,
  ROWS,
  type Cell,
  type ExplosionRound,
  type GameState,
  type Player,
} from "@/lib/game-types"
import { Button } from "@/components/ui/button"

const CELL_SIZE = 1
const ORB_RADIUS = 0.15
const ANIMATION_DURATION = 300

function ResponsiveCanvas({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    if (containerRef.current) {
      updateDimensions()
    }

    window.addEventListener("resize", updateDimensions)
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    return () => {
      window.removeEventListener("resize", updateDimensions)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 12, 0], fov: 50 }}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {children}
      </Canvas>
    </div>
  )
}

type Props = {
  gameState: GameState
  onCellClick: (row: number, col: number) => void
  onReset: () => void
  onLeave: () => void
  myPlayer: Player
}

export default memo(function ChainReactionGame({
  gameState,
  onCellClick,
  onReset,
  onLeave,
  myPlayer,
}: Props) {
  const isMyTurn =
    gameState.currentPlayer === myPlayer && gameState.gameStatus === "playing"
  const isGameOver = gameState.gameStatus === "won"

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
        <ResponsiveCanvas>
          <ambientLight intensity={0.6} />
          <directionalLight position={[0, 10, 0]} intensity={1} castShadow />
          <GameBoard
            board={gameState.board}
            onCellClick={onCellClick}
            isMyTurn={isMyTurn}
            currentPlayer={gameState.currentPlayer}
          />
        </ResponsiveCanvas>
      </main>
    </div>
  )
})

function GameBoard({
  board,
  onCellClick,
  isMyTurn,
  currentPlayer,
}: {
  board: Cell[][]
  onCellClick: (row: number, col: number) => void
  isMyTurn: boolean
  currentPlayer: Player
}) {
  return (
    <group position={[-COLS / 2 + 0.5, 0, -ROWS / 2 + 0.5]}>
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <CellComponent
            key={`${rowIndex}-${colIndex}`}
            row={rowIndex}
            col={colIndex}
            cell={cell}
            onClick={onCellClick}
            isMyTurn={isMyTurn}
            currentPlayer={currentPlayer}
          />
        ))
      )}
    </group>
  )
}

function CellComponent({
  row,
  col,
  cell,
  onClick,
  isMyTurn,
  currentPlayer,
}: {
  row: number
  col: number
  cell: Cell
  onClick: (row: number, col: number) => void
  isMyTurn: boolean
  currentPlayer: Player
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)
  const [exploding, setExploding] = useState(false)

  const shouldHighlight = isMyTurn
  const isNearCritical = cell.count > 0 && cell.count === cell.criticalMass - 1
  const isCritical = cell.count >= cell.criticalMass
  const pulseRef = useRef(0)

  useFrame((state) => {
    if (!meshRef.current) return

    const material = meshRef.current.material as THREE.MeshStandardMaterial

    if (isCritical) {
      setExploding(true)
      pulseRef.current = (pulseRef.current + 0.05) % (Math.PI * 2)
      const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5

      material.emissiveIntensity = pulse * 0.8

      const scale = 1 + Math.sin(pulseRef.current * 2) * 0.1
      meshRef.current.scale.setScalar(scale)
    } else if (isNearCritical) {
      pulseRef.current = (pulseRef.current + 0.02) % (Math.PI * 2)
      const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5
      material.emissiveIntensity = pulse * 0.3
      meshRef.current.scale.setScalar(1)
    } else {
      material.emissiveIntensity = 0
      meshRef.current.scale.setScalar(1)
    }
  })

  const cellColor = isCritical
    ? PLAYER_COLORS[currentPlayer]
    : hovered && shouldHighlight
      ? PLAYER_COLORS[currentPlayer]
      : "#374151"

  return (
    <group position={[col, 0, row]}>
      <mesh
        ref={meshRef}
        userData={{ row, col }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={() => isMyTurn && onClick(row, col)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CELL_SIZE * 0.9, 0.1, CELL_SIZE * 0.9]} />
        <meshStandardMaterial
          color={cellColor}
          transparent
          opacity={hovered && shouldHighlight ? 0.7 : 1}
          emissive={
            isCritical
              ? PLAYER_COLORS[currentPlayer]
              : isNearCritical
                ? "#ffffff"
                : "#000000"
          }
          emissiveIntensity={isCritical ? 0.5 : isNearCritical ? 0.2 : 0}
        />
      </mesh>

      <Text
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.15}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
      >
        {cell.criticalMass}
      </Text>

      {Array.from({ length: cell.count }, (_, index) => (
        <OrbComponent
          key={index}
          position={[0, 0.2 + index * 0.3, 0]}
          color={cell.player ? PLAYER_COLORS[cell.player] : "#ffffff"}
          index={index}
        />
      ))}
    </group>
  )
}

interface PropagatingOrbProps {
  fromCell: { row: number; col: number }
  toCell: { row: number; col: number }
  color: string
  delay: number
}

function PropagatingOrb({
  fromCell,
  toCell,
  color,
  delay,
}: PropagatingOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startTime = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useFrame((state) => {
    if (!meshRef.current || !visible) return

    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime
    }

    const elapsed = (state.clock.elapsedTime - startTime.current) * 1000
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1)

    if (progress >= 1) {
      setVisible(false)
      return
    }

    const easeProgress = 1 - Math.pow(1 - progress, 3)

    meshRef.current.position.x = THREE.MathUtils.lerp(
      fromCell.col,
      toCell.col,
      easeProgress
    )
    meshRef.current.position.z = THREE.MathUtils.lerp(
      fromCell.row,
      toCell.row,
      easeProgress
    )
    meshRef.current.position.y = 0.3 + Math.sin(progress * Math.PI) * 0.5

    const scale = 1 + Math.sin(progress * Math.PI) * 0.3
    meshRef.current.scale.setScalar(scale)
  })

  if (!visible) return null

  return (
    <mesh ref={meshRef} position={[fromCell.col, 0.3, fromCell.row]} castShadow>
      <sphereGeometry args={[ORB_RADIUS * 1.2, 12, 12]} />
      <meshStandardMaterial
        color={color}
        metalness={0.5}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

function OrbComponent({
  position,
  color,
  index,
}: {
  position: [number, number, number]
  color: string
  index: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.05
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5 + index
    }
  })

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[ORB_RADIUS, 16, 16]} />
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.4}
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  )
}
