"use client"

import { useState, useRef, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import * as THREE from "three"
import { useSpring, animated } from "@react-spring/three"

// Game constants
const ROWS = 9
const COLS = 6
const CELL_SIZE = 1
const ORB_RADIUS = 0.15
const ANIMATION_DURATION = 500 // ms

// Player colors
const PLAYER_COLORS = {
  1: "#ef4444", // Red
  2: "#22c55e", // Green
}

// Game state types
type Player = 1 | 2
type Cell = {
  count: number
  player: Player | null
  criticalMass: number
}

type AnimatingOrb = {
  id: string
  fromPosition: [number, number, number]
  toPosition: [number, number, number]
  fromColor: string
  toColor: string
  startTime: number
  duration: number
  completed: boolean
}

type GameState = {
  board: Cell[][]
  currentPlayer: Player
  gameStatus: "playing" | "won"
  winner: Player | null
  animating: boolean
  moveCount: number
  animatingOrbs: AnimatingOrb[]
  lastExplosion: { row: number; col: number } | null
}

// Calculate critical mass for a cell position
const getCriticalMass = (row: number, col: number): number => {
  const isCorner = (row === 0 || row === ROWS - 1) && (col === 0 || col === COLS - 1)
  const isEdge = row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1

  if (isCorner) return 2
  if (isEdge) return 3
  return 4
}

// Initialize empty board
const createInitialBoard = (): Cell[][] => {
  return Array(ROWS)
    .fill(null)
    .map((_, row) =>
      Array(COLS)
        .fill(null)
        .map((_, col) => ({
          count: 0,
          player: null,
          criticalMass: getCriticalMass(row, col),
        })),
    )
}

// Get adjacent cell positions
const getAdjacentCells = (row: number, col: number): [number, number][] => {
  const adjacent: [number, number][] = []
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  for (const [dr, dc] of directions) {
    const newRow = row + dr
    const newCol = col + dc
    if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
      adjacent.push([newRow, newCol])
    }
  }
  return adjacent
}

export default function ChainReactionGame() {
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    currentPlayer: 1,
    gameStatus: "playing",
    winner: null,
    animating: false,
    moveCount: 0,
    animatingOrbs: [],
    lastExplosion: null,
  })

  // Use ref to track if a move is currently being processed to prevent race conditions
  const processingMoveRef = useRef(false)
  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      processingMoveRef.current = false
    }
  }, [])
  
  // Clean up completed animations
  useEffect(() => {
    if (gameState.animatingOrbs.length > 0 && isMountedRef.current) {
      const now = Date.now()
      const completedOrbs = gameState.animatingOrbs.filter((orb) => {
        const isExpired = now > orb.startTime + orb.duration + 100 // Add small buffer
        return isExpired || orb.completed
      })

      if (completedOrbs.length > 0) {
        setGameState((prev) => {
          const remainingOrbs = prev.animatingOrbs.filter((orb) => !completedOrbs.includes(orb))
          const shouldStillAnimate = remainingOrbs.length > 0
          
          return {
            ...prev,
            animatingOrbs: remainingOrbs,
            animating: shouldStillAnimate,
          }
        })
      }
    }
  }, [gameState.animatingOrbs])

  // Reset processing flag when all animations complete
  useEffect(() => {
    if (!gameState.animating && gameState.animatingOrbs.length === 0 && processingMoveRef.current) {
      console.log("All animations complete, resetting processing flag")
      processingMoveRef.current = false
    }
  }, [gameState.animating, gameState.animatingOrbs.length])

  // Safety timeout to prevent being stuck in animating state forever
  useEffect(() => {
    if (gameState.animating) {
      const timeout = setTimeout(() => {
        if (isMountedRef.current) {
          console.log("Safety timeout triggered - resetting animation state")
          setGameState((prev) => ({
            ...prev,
            animating: false,
            animatingOrbs: [],
          }))
          processingMoveRef.current = false
        }
      }, 3000) // 3 second safety timeout

      return () => clearTimeout(timeout)
    }
  }, [gameState.animating])

  const resetGame = () => {
    processingMoveRef.current = false
    if (isMountedRef.current) {
      setGameState({
        board: createInitialBoard(),
        currentPlayer: 1,
        gameStatus: "playing",
        winner: null,
        animating: false,
        moveCount: 0,
        animatingOrbs: [],
        lastExplosion: null,
      })
    }
  }

  const checkVictory = (board: Cell[][], moveCount: number): Player | null => {
    // Don't check for victory until both players have made at least one move
    if (moveCount < 2) return null

    let player1HasOrbs = false
    let player2HasOrbs = false
    let totalOrbs = 0

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Ensure cell exists before accessing
        if (board[row] && board[row][col] && board[row][col].count > 0) {
          totalOrbs += board[row][col].count
          if (board[row][col].player === 1) player1HasOrbs = true
          if (board[row][col].player === 2) player2HasOrbs = true
        }
      }
    }

    // Only declare victory if there are orbs on the board and only one player has them
    if (totalOrbs > 0) {
      if (!player1HasOrbs && player2HasOrbs) return 2
      if (!player2HasOrbs && player1HasOrbs) return 1
    }

    return null
  }

  // Create an animated orb for movement
  const createAnimatingOrb = (
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    fromColor: string,
    toColor: string,
    index = 0,
    duration: number = ANIMATION_DURATION,
  ): AnimatingOrb => {
    return {
      id: `${Date.now()}-${Math.random()}`,
      fromPosition: [fromCol, 0.2 + index * 0.3, fromRow],
      toPosition: [toCol, 0.2 + index * 0.3, toRow],
      fromColor,
      toColor,
      startTime: Date.now(),
      duration,
      completed: false,
    }
  }

  const processExplosions = (board: Cell[][], player: Player): {
    finalBoard: Cell[][];
    animatingOrbs: AnimatingOrb[];
    lastExplosion: { row: number; col: number } | null;
  } => {
    // Create a deep copy of the board to avoid mutation issues
    const newBoard = board.map((row) =>
      row.map((cell) => ({
        count: cell.count,
        player: cell.player,
        criticalMass: cell.criticalMass,
      })),
    )

    let hasExplosions = true
    let iterationCount = 0
    let allAnimatingOrbs: AnimatingOrb[] = []
    let lastExplosionPos: { row: number; col: number } | null = null
    let animationDelay = 0

    while (hasExplosions && iterationCount < 100) {
      iterationCount++
      hasExplosions = false
      const explosions: [number, number][] = []

      // Find all cells that need to explode with bounds checking
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          // Ensure the cell exists before accessing its properties
          if (newBoard[row] && newBoard[row][col] && newBoard[row][col].count >= newBoard[row][col].criticalMass) {
            explosions.push([row, col])
            hasExplosions = true
          }
        }
      }

      if (explosions.length > 0) {
        // Add delay for each explosion wave to create visual cascade
        animationDelay += ANIMATION_DURATION * 0.3

        // Process all explosions simultaneously
        for (const [row, col] of explosions) {
          // Double-check bounds before processing
          if (row >= 0 && row < ROWS && col >= 0 && col < COLS && newBoard[row] && newBoard[row][col]) {
            const cell = newBoard[row][col]
            const orbsToDistribute = cell.criticalMass
            const cellColor = cell.player ? PLAYER_COLORS[cell.player] : "#ffffff"

            // Track last explosion for visual effects
            lastExplosionPos = { row, col }

            // Remove orbs from exploding cell
            cell.count -= orbsToDistribute
            if (cell.count <= 0) {
              cell.count = 0
              cell.player = null
            }

            // Distribute orbs to adjacent cells with animation
            const adjacent = getAdjacentCells(row, col)
            for (const [adjRow, adjCol] of adjacent) {
              // Ensure adjacent cell exists and is within bounds
              if (
                adjRow >= 0 &&
                adjRow < ROWS &&
                adjCol >= 0 &&
                adjCol < COLS &&
                newBoard[adjRow] &&
                newBoard[adjRow][adjCol]
              ) {
                const adjCell = newBoard[adjRow][adjCol]
                const targetColor = PLAYER_COLORS[player]

                // Create animating orb with staggered timing
                const animatingOrb = createAnimatingOrb(
                  row,
                  col,
                  adjRow,
                  adjCol,
                  cellColor,
                  targetColor,
                  0,
                  ANIMATION_DURATION,
                )

                // Add delay to create cascade effect
                animatingOrb.startTime += animationDelay

                allAnimatingOrbs.push(animatingOrb)

                // Update the adjacent cell immediately
                adjCell.count += 1
                adjCell.player = player
              }
            }
          }
        }
      }
    }

    return {
      finalBoard: newBoard,
      animatingOrbs: allAnimatingOrbs,
      lastExplosion: lastExplosionPos,
    }
  }

  const makeMove = async (row: number, col: number) => {
    // Add bounds checking
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      console.warn(`Invalid move: row ${row}, col ${col} out of bounds`)
      return
    }

    if (!isMountedRef.current || gameState.animating || gameState.gameStatus === "won" || processingMoveRef.current) {
      return
    }

    // Ensure the cell exists
    if (!gameState.board[row] || !gameState.board[row][col]) {
      console.warn(`Invalid cell at row ${row}, col ${col}`)
      return
    }

    const cell = gameState.board[row][col]

    // Check if move is legal
    if (cell.count > 0 && cell.player !== gameState.currentPlayer) {
      return
    }

    // Set processing flag to prevent race conditions
    processingMoveRef.current = true

    try {
      // Clear any existing animations first
      setGameState((prev) => ({
        ...prev,
        animating: true,
        animatingOrbs: [], // Clear all existing animations
      }))

      // Create a safe copy of the board
      const newBoard = gameState.board.map((r) =>
        r.map((c) => ({
          count: c.count,
          player: c.player,
          criticalMass: c.criticalMass,
        })),
      )

      const currentPlayer = gameState.currentPlayer
      const targetColor = PLAYER_COLORS[currentPlayer]

      // Place orb immediately on the board copy
      newBoard[row][col].count += 1
      newBoard[row][col].player = currentPlayer

      // Create drop animation
      const dropInOrb: AnimatingOrb = {
        id: `drop-${Date.now()}-${Math.random()}`,
        fromPosition: [col, 3, row],
        toPosition: [col, 0.2 + (cell.count) * 0.3, row], // Use original count for position
        fromColor: targetColor,
        toColor: targetColor,
        startTime: Date.now(),
        duration: ANIMATION_DURATION,
        completed: false,
      }

      // Add drop animation
      if (isMountedRef.current) {
        setGameState((prev) => ({
          ...prev,
          animatingOrbs: [dropInOrb],
        }))
      }

      // Wait for drop animation to complete
      await new Promise<void>((resolve) => {
        setTimeout(resolve, ANIMATION_DURATION + 50)
      })

      // Only continue if component is still mounted
      if (!isMountedRef.current) {
        processingMoveRef.current = false
        return
      }

      // Process explosions synchronously
      const explosionResult = processExplosions(newBoard, currentPlayer)
      
      // Check for victory
      const newMoveCount = gameState.moveCount + 1
      const winner = checkVictory(explosionResult.finalBoard, newMoveCount)
      
      // Determine next player
      const nextPlayer: Player = winner ? currentPlayer : (currentPlayer === 1 ? 2 : 1)

      // Apply all changes atomically
      if (isMountedRef.current) {
        setGameState((prev) => ({
          ...prev,
          board: explosionResult.finalBoard,
          currentPlayer: nextPlayer,
          gameStatus: winner ? "won" : "playing",
          winner,
          animating: explosionResult.animatingOrbs.length > 0,
          moveCount: newMoveCount,
          animatingOrbs: explosionResult.animatingOrbs, // Only explosion orbs, drop orb is done
          lastExplosion: explosionResult.lastExplosion,
        }))
      }

      // The processing flag will be reset by the useEffect when animations complete

    } catch (error) {
      console.error("Error in makeMove:", error)
      // Reset animation state and processing flag if there's an error
      processingMoveRef.current = false
      if (isMountedRef.current) {
        setGameState((prev) => ({ 
          ...prev, 
          animating: false, 
          animatingOrbs: [],
          lastExplosion: null 
        }))
      }
    }
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      {/* UI Header */}
      <div className="p-4 bg-gray-800 text-white">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Chain Reaction 3D</h1>
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: PLAYER_COLORS[gameState.currentPlayer] }}
                  />
                  <span className="text-white">
                    {gameState.gameStatus === "won"
                      ? `Player ${gameState.winner} Wins!`
                      : `Player ${gameState.currentPlayer}'s Turn`}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button onClick={resetGame} variant="outline">
            Reset Game
          </Button>
        </div>
      </div>

      {/* 3D Game Board */}
      <div className="flex-1">
        <Canvas camera={{ position: [8, 8, 8], fov: 60 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />

          <GameBoard gameState={gameState} onCellClick={makeMove} />

          <OrbitControls enablePan={false} minDistance={8} maxDistance={15} maxPolarAngle={Math.PI / 2.2} />
        </Canvas>
      </div>
    </div>
  )
}

function GameBoard({
  gameState,
  onCellClick,
}: {
  gameState: GameState
  onCellClick: (row: number, col: number) => void
}) {
  const { raycaster, camera, gl } = useThree()
  const boardRef = useRef<THREE.Group>(null)
  const clickProcessingRef = useRef(false)

  // Improved click handler with better race condition protection
  const handleClick = (event: any) => {
    if (gameState.animating || gameState.gameStatus === "won" || clickProcessingRef.current) return

    clickProcessingRef.current = true

    // Calculate normalized device coordinates
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera)

    // Find all intersections
    const allChildren: THREE.Object3D[] = []
    boardRef.current?.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.isCellMesh) {
        allChildren.push(child)
      }
    })

    const intersects = raycaster.intersectObjects(allChildren, false)

    if (intersects.length > 0) {
      const userData = intersects[0].object.userData
      if (userData.row !== undefined && userData.col !== undefined) {
        onCellClick(userData.row, userData.col)
      }
    }

    // Reset click processing flag after a short delay
    setTimeout(() => {
      clickProcessingRef.current = false
    }, 100)
  }

  // Use a more reliable event attachment method
  useEffect(() => {
    const domElement = gl.domElement
    domElement.addEventListener("click", handleClick)
    return () => {
      domElement.removeEventListener("click", handleClick)
    }
  }, [gameState.animating, gameState.gameStatus, gl.domElement])

  return (
    <group ref={boardRef}>
      {/* Board base */}
      <mesh position={[(COLS - 1) / 2, -0.1, (ROWS - 1) / 2]} receiveShadow>
        <boxGeometry args={[COLS + 0.5, 0.2, ROWS + 0.5]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Grid cells and orbs */}
      {gameState.board.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <CellComponent
            key={`${rowIndex}-${colIndex}`}
            row={rowIndex}
            col={colIndex}
            cell={cell}
            gameState={gameState}
            onCellClick={onCellClick}
          />
        )),
      )}

      {/* Animating orbs */}
      {gameState.animatingOrbs.map((orb) => (
        <AnimatedOrbComponent key={orb.id} orb={orb} />
      ))}

      {/* Explosion effects */}
      {gameState.lastExplosion && (
        <ExplosionEffect
          position={[gameState.lastExplosion.col, 0.3, gameState.lastExplosion.row]}
          color={PLAYER_COLORS[gameState.currentPlayer]}
        />
      )}
    </group>
  )
}

function CellComponent({
  row,
  col,
  cell,
  gameState,
  onCellClick,
}: {
  row: number
  col: number
  cell: Cell
  gameState: GameState
  onCellClick: (row: number, col: number) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const cellClickProcessingRef = useRef(false)

  const isLegalMove = cell.count === 0 || cell.player === gameState.currentPlayer
  const shouldHighlight = gameState.gameStatus === "playing" && !gameState.animating && isLegalMove

  // Add direct click handler to each cell with race condition protection
  const handleCellClick = (e: any) => {
    e.stopPropagation()
    
    if (cellClickProcessingRef.current || gameState.animating || gameState.gameStatus !== "playing") {
      return
    }

    cellClickProcessingRef.current = true
    onCellClick(row, col)
    
    // Reset processing flag after a delay
    setTimeout(() => {
      cellClickProcessingRef.current = false
    }, 100)
  }

  // Highlight effect for cells that are about to explode
  const isNearCritical = cell.count > 0 && cell.count === cell.criticalMass - 1
  const pulseRef = useRef(0)

  useFrame((state) => {
    if (meshRef.current && isNearCritical) {
      pulseRef.current = (pulseRef.current + 0.02) % (Math.PI * 2)
      const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = pulse * 0.2
    }
  })

  return (
    <group position={[col, 0, row]}>
      {/* Cell base */}
      <mesh
        ref={meshRef}
        userData={{ row, col, isCellMesh: true }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={handleCellClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CELL_SIZE * 0.9, 0.1, CELL_SIZE * 0.9]} />
        <meshStandardMaterial
          color={hovered && shouldHighlight ? PLAYER_COLORS[gameState.currentPlayer] : "#374151"}
          transparent
          opacity={hovered && shouldHighlight ? 0.7 : 1}
          emissive={isNearCritical ? (cell.player ? PLAYER_COLORS[cell.player] : "#ffffff") : "#000000"}
          emissiveIntensity={isNearCritical ? 0.2 : 0}
        />
      </mesh>

      {/* Critical mass indicator */}
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

      {/* Static orbs (not animating) */}
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
      // Floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.05
      // Gentle rotation
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5 + index
    }
  })

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[ORB_RADIUS, 16, 16]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} emissive={color} emissiveIntensity={0.1} />
    </mesh>
  )
}

function AnimatedOrbComponent({ orb }: { orb: AnimatingOrb }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return

    // Calculate progress based on time with bounds checking
    const elapsed = Date.now() - orb.startTime
    const progress = Math.min(1, Math.max(0, elapsed / orb.duration))

    // Interpolate position
    const x = orb.fromPosition[0] + (orb.toPosition[0] - orb.fromPosition[0]) * progress
    const y = orb.fromPosition[1] + (orb.toPosition[1] - orb.fromPosition[1]) * progress
    const z = orb.fromPosition[2] + (orb.toPosition[2] - orb.fromPosition[2]) * progress

    meshRef.current.position.set(x, y, z)

    // Interpolate color if needed (for now just use target color)
    materialRef.current.color.set(progress < 1 ? orb.fromColor : orb.toColor)
    materialRef.current.emissive.set(progress < 1 ? orb.fromColor : orb.toColor)

    // Mark as completed when animation finishes
    if (progress >= 1 && !orb.completed) {
      orb.completed = true
    }
  })

  return (
    <mesh ref={meshRef} position={orb.fromPosition} castShadow>
      <sphereGeometry args={[ORB_RADIUS, 16, 16]} />
      <meshStandardMaterial
        ref={materialRef}
        color={orb.fromColor}
        metalness={0.3}
        roughness={0.4}
        emissive={orb.fromColor}
        emissiveIntensity={0.2}
      />
    </mesh>
  )
}

function ExplosionEffect({ position, color }: { position: [number, number, number]; color: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Mesh[]>([])
  const startTime = useRef(Date.now())
  const duration = 500 // ms

  // Create particles on mount
  useEffect(() => {
    if (groupRef.current) {
      // Create 12 particles
      for (let i = 0; i < 12; i++) {
        const particle = new THREE.Mesh(
          new THREE.SphereGeometry(ORB_RADIUS * 0.5, 8, 8),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 1,
          }),
        )
        groupRef.current.add(particle)
        particlesRef.current.push(particle)
      }
    }

    return () => {
      particlesRef.current = []
    }
  }, [color])

  // Animate particles
  useFrame(() => {
    const elapsed = Date.now() - startTime.current
    const progress = Math.min(1, elapsed / duration)

    particlesRef.current.forEach((particle, i) => {
      // Calculate direction based on particle index
      const angle = (i / particlesRef.current.length) * Math.PI * 2
      const radius = 1.5 * progress

      // Position particles in an expanding circle
      particle.position.x = Math.cos(angle) * radius
      particle.position.z = Math.sin(angle) * radius
      particle.position.y = 0.3 + Math.sin(progress * Math.PI) * 0.5

      // Fade out as they expand
      if (particle.material instanceof THREE.MeshStandardMaterial) {
        particle.material.opacity = 1 - progress
        particle.material.emissiveIntensity = 0.5 * (1 - progress)
      }

      // Scale down slightly
      const scale = 1 - progress * 0.5
      particle.scale.set(scale, scale, scale)
    })
  })

  return <group ref={groupRef} position={position} />
}
