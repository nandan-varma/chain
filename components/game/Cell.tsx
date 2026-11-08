import { useMemo, useRef, useState } from "react"
import { Text } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { PLAYER_COLORS } from "@/lib/game-types"

const CELL_SIZE = 1

interface CellProps {
  row: number
  col: number
  cell: { count: number; player: 1 | 2 | null; criticalMass: number }
  onClick: (row: number, col: number) => void
  isMyTurn: boolean
  currentPlayer: 1 | 2
}

export default function Cell({
  row,
  col,
  cell,
  onClick,
  isMyTurn,
  currentPlayer,
}: CellProps) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)
  const isCritical = useMemo(
    () => cell.count >= cell.criticalMass,
    [cell.count, cell.criticalMass]
  )
  const isNearCritical = useMemo(
    () => cell.count > 0 && cell.count === cell.criticalMass - 1,
    [cell.count, cell.criticalMass]
  )
  const pulseRef = useRef(0)

  useFrame(() => {
    if (!meshRef.current) return
    const material = meshRef.current.material as THREE.MeshStandardMaterial

    if (isCritical) {
      pulseRef.current = (pulseRef.current + 0.08) % (Math.PI * 2)
      const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5
      material.emissiveIntensity = pulse * 0.8
      material.emissive.set(PLAYER_COLORS[currentPlayer])
      meshRef.current.scale.setScalar(1 + Math.sin(pulseRef.current * 2) * 0.15)
    } else if (isNearCritical) {
      pulseRef.current = (pulseRef.current + 0.04) % (Math.PI * 2)
      const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5
      material.emissiveIntensity = pulse * 0.4
      material.emissive.set("#ffffff")
      meshRef.current.scale.setScalar(1 + Math.sin(pulseRef.current) * 0.05)
    } else {
      pulseRef.current = 0
      material.emissiveIntensity = 0
      meshRef.current.scale.setScalar(1)
    }
  })

  const cellColor = isCritical
    ? PLAYER_COLORS[currentPlayer]
    : hovered && isMyTurn
      ? PLAYER_COLORS[currentPlayer]
      : "#374151"

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
        <boxGeometry args={[CELL_SIZE * 0.9, 0.1, CELL_SIZE * 0.9]} />
        <meshStandardMaterial
          color={cellColor}
          transparent
          opacity={hovered && isMyTurn ? 0.7 : 1}
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
      {Array.from({ length: cell.count }, (_, i) => (
        <Orb
          key={i}
          position={[0, 0.2 + i * 0.3, 0]}
          color={cell.player ? PLAYER_COLORS[cell.player] : "#ffffff"}
          index={i}
        />
      ))}
    </group>
  )
}

function Orb({
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
        position[1] + Math.sin(state.clock.elapsedTime * 3 + index * 0.5) * 0.08
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.8 + index
    }
  })

  return (
    <mesh ref={meshRef} position={position} castShadow>
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
