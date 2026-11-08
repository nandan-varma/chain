import { memo, ReactNode, useEffect, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

import {
  COLS,
  ROWS,
  type Cell,
  type GameState,
  type Player,
} from "@/lib/game-types"

const ANIM_DURATION = 350

interface OrbData {
  id: string
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  color: string
  startTime: number
}

interface GameBoardProps {
  gameState: GameState
  onCellClick: (row: number, col: number) => void
  isMyTurn: boolean
  flyingOrbs?: OrbData[]
}

function ResponsiveCanvas({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  useEffect(() => {
    const update = () => {
      if (containerRef.current)
        setDims({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        })
    }
    if (containerRef.current) update()
    const observer = new ResizeObserver(update)
    window.addEventListener("resize", update)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => {
      window.removeEventListener("resize", update)
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 12, 0], fov: 50 }}
        style={{ width: dims.w, height: dims.h }}
      >
        {children}
      </Canvas>
    </div>
  )
}

function Cell({
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
  onClick: (r: number, c: number) => void
  isMyTurn: boolean
  currentPlayer: Player
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)
  const isCritical = cell.count >= cell.criticalMass
  const isNearCritical = cell.count > 0 && cell.count === cell.criticalMass - 1
  const pulseRef = useRef(0)

  useFrame(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    if (isCritical) {
      pulseRef.current = (pulseRef.current + 0.08) % (Math.PI * 2)
      mat.emissiveIntensity = Math.sin(pulseRef.current) * 0.6 + 0.4
      meshRef.current.scale.setScalar(1 + Math.sin(pulseRef.current * 2) * 0.12)
    } else if (isNearCritical) {
      pulseRef.current = (pulseRef.current + 0.04) % (Math.PI * 2)
      mat.emissiveIntensity = Math.sin(pulseRef.current) * 0.3 + 0.2
      meshRef.current.scale.setScalar(1 + Math.sin(pulseRef.current) * 0.04)
    } else {
      pulseRef.current = 0
      mat.emissiveIntensity = 0
      meshRef.current.scale.setScalar(1)
    }
  })

  const colors: Record<Player, string> = { 1: "#ef4444", 2: "#22c55e" }
  const cellColor =
    isCritical || (hovered && isMyTurn) ? colors[currentPlayer] : "#374151"

  return (
    <group position={[col, 0, row]}>
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={() => isMyTurn && onClick(row, col)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.9, 0.1, 0.9]} />
        <meshStandardMaterial
          color={cellColor}
          transparent
          opacity={hovered && isMyTurn ? 0.7 : 1}
          emissive={
            isCritical
              ? colors[currentPlayer]
              : isNearCritical
                ? "#fff"
                : "#000"
          }
          emissiveIntensity={isCritical ? 0.5 : isNearCritical ? 0.2 : 0}
        />
      </mesh>
      <CellText value={cell.criticalMass} />
      {Array.from({ length: cell.count }, (_, i) => (
        <Orb
          key={i}
          index={i}
          color={cell.player ? colors[cell.player] : "#fff"}
        />
      ))}
    </group>
  )
}

function CellText({ value }: { value: number }) {
  const { Text } = require("@react-three/drei")
  return (
    <Text
      position={[0, 0.06, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={0.15}
      color="#9ca3af"
      anchorX="center"
      anchorY="middle"
    >
      {value}
    </Text>
  )
}

function Orb({ index, color }: { index: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        0.2 + index * 0.3 + Math.sin(s.clock.elapsedTime * 3 + index) * 0.06
      meshRef.current.rotation.y = s.clock.elapsedTime + index
    }
  })
  return (
    <mesh ref={meshRef} position={[0, 0.2 + index * 0.3, 0]} castShadow>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial
        color={color}
        metalness={0.4}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.15}
      />
    </mesh>
  )
}

function FlyingOrb({
  fromRow,
  fromCol,
  toRow,
  toCol,
  color,
  startTime,
}: OrbData) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), ANIM_DURATION + 100)
    return () => clearTimeout(t)
  }, [])

  useFrame(() => {
    if (!meshRef.current || !visible) return
    const elapsed = (Date.now() - startTime) / 1000
    const progress = Math.min(elapsed / (ANIM_DURATION / 1000), 1)
    if (progress >= 1) {
      setVisible(false)
      return
    }
    const ease = 1 - Math.pow(1 - progress, 3)
    meshRef.current.position.x = THREE.MathUtils.lerp(fromCol, toCol, ease)
    meshRef.current.position.z = THREE.MathUtils.lerp(fromRow, toRow, ease)
    meshRef.current.position.y = 0.3 + Math.sin(progress * Math.PI) * 0.5
    meshRef.current.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.2)
    meshRef.current.rotation.x = progress * Math.PI * 3
  })

  if (!visible) return null
  return (
    <mesh ref={meshRef} position={[fromCol, 0.3, fromRow]} castShadow>
      <sphereGeometry args={[0.16, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        metalness={0.5}
        roughness={0.2}
      />
    </mesh>
  )
}

export default memo(function GameBoard({
  gameState,
  onCellClick,
  isMyTurn,
  flyingOrbs = [],
}: GameBoardProps) {
  return (
    <ResponsiveCanvas>
      <ambientLight intensity={0.6} />
      <directionalLight position={[0, 10, 0]} intensity={1} castShadow />
      <group position={[-COLS / 2 + 0.5, 0, -ROWS / 2 + 0.5]}>
        {gameState.board.map((row, r) =>
          row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              row={r}
              col={c}
              cell={cell}
              onClick={onCellClick}
              isMyTurn={isMyTurn}
              currentPlayer={gameState.currentPlayer}
            />
          ))
        )}
        {flyingOrbs.map((orb) => (
          <FlyingOrb key={orb.id} {...orb} />
        ))}
      </group>
    </ResponsiveCanvas>
  )
})
