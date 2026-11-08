import { useEffect, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const PROPAGATION_DURATION = 400

interface FlyingOrbProps {
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  color: string
  startTime: number
}

export default function FlyingOrb({
  fromRow,
  fromCol,
  toRow,
  toCol,
  color,
  startTime,
}: FlyingOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(
      () => setVisible(false),
      PROPAGATION_DURATION + 200
    )
    return () => clearTimeout(timer)
  }, [])

  useFrame(() => {
    if (!meshRef.current || !visible) return

    const elapsed = (Date.now() - startTime) / 1000
    const progress = Math.min(elapsed / (PROPAGATION_DURATION / 1000), 1)

    if (progress >= 1) {
      setVisible(false)
      return
    }

    const eased = 1 - Math.pow(1 - progress, 3)
    meshRef.current.position.x = THREE.MathUtils.lerp(fromCol, toCol, eased)
    meshRef.current.position.z = THREE.MathUtils.lerp(fromRow, toRow, eased)
    meshRef.current.position.y = 0.3 + Math.sin(progress * Math.PI) * 0.5
    meshRef.current.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.2)
    meshRef.current.rotation.x = progress * Math.PI * 4
    meshRef.current.rotation.z = progress * Math.PI * 2
  })

  if (!visible) return null

  return (
    <mesh ref={meshRef} position={[fromCol, 0.3, fromRow]} castShadow>
      <sphereGeometry args={[0.18, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        metalness={0.6}
        roughness={0.2}
      />
    </mesh>
  )
}
