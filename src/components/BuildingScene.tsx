import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { DaySnapshot, getFloorStatus, getFloorAvgProgress, FloorData } from '../data/constructionData'

// ---------- 常量 ----------
const FLOOR_W = 6
const FLOOR_H = 1.05
const FLOOR_D = 4
const GAP = 0.08
const FLOOR_COLORS: Record<string, string> = {
  completed: '#4ade80',
  'in-progress': '#fbbf24',
  pending: '#64748b',
}

// ---------- 飞行动画 ----------
function createFlyToAnimation(
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>,
  controlsRef: React.MutableRefObject<any>
) {
  let active = false
  let animationId: number | null = null

  const flyTo = (floorIndex: number) => {
    if (!cameraRef.current) return
    const camera = cameraRef.current
    const y = floorIndex * (FLOOR_H + GAP) + FLOOR_H / 2 + 1.5
    const targetPos = new THREE.Vector3(5, y, 8)
    const targetLook = new THREE.Vector3(0, y - 0.5, 0)

    active = true

    const animate = () => {
      if (!active || !cameraRef.current) return
      const cam = cameraRef.current

      cam.position.lerp(targetPos, 0.04)

      if (controlsRef.current && controlsRef.current.target) {
        controlsRef.current.target.lerp(targetLook, 0.04)
        controlsRef.current.update()
      }

      const d = cam.position.distanceTo(targetPos)
      if (d < 0.05) {
        active = false
        return
      }

      animationId = requestAnimationFrame(animate)
    }

    if (animationId) cancelAnimationFrame(animationId)
    animate()
  }

  const dispose = () => {
    active = false
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  return { flyTo, dispose }
}

// ---------- 单层楼模型 ----------
interface FloorMeshProps {
  floor: FloorData
  index: number
  snapshot: DaySnapshot
  hovered: number | null
  highlighted: boolean
  dimmed: boolean
  setHovered: (v: number | null) => void
  setTooltipData: (v: { x: number; y: number; floor: FloorData } | null) => void
  flyTo: (idx: number) => void
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>
}

function FloorMesh({ floor, index, snapshot, hovered, highlighted, dimmed, setHovered, setTooltipData, flyTo, cameraRef }: FloorMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const status = getFloorStatus(floor)
  const color = FLOOR_COLORS[status]
  const isHovered = hovered === index
  const y = index * (FLOOR_H + GAP) + FLOOR_H / 2

  useFrame(() => {
    if (!meshRef.current) return
    const target = isHovered || highlighted ? 1.06 : 1
    meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, target, 0.1)
    meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, target, 0.1)
  })

  const handlePointerOver = useCallback((e: THREE.Event & { clientX?: number; clientY?: number }) => {
    setHovered(index)
    if (e.clientX !== undefined && e.clientY !== undefined) {
      setTooltipData({ x: e.clientX, y: e.clientY, floor })
    }
  }, [index, floor, setHovered, setTooltipData])

  const handlePointerOut = useCallback(() => {
    setHovered(null)
    setTooltipData(null)
  }, [setHovered, setTooltipData])

  const handleClick = useCallback(() => {
    flyTo(index)
  }, [index, flyTo])

  // 生成楼层的装饰条
  const barGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(FLOOR_W + 0.12, 0.06, FLOOR_D + 0.12)
    return geo
  }, [])

  return (
    <group position={[0, y, 0]}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[FLOOR_W, FLOOR_H, FLOOR_D]} />
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.1}
          transparent
          opacity={highlighted ? 1 : isHovered ? 0.95 : dimmed ? 0.25 : 0.85}
          emissive={highlighted ? color : '#000000'}
          emissiveIntensity={highlighted ? 0.3 : 0}
        />
      </mesh>
      {/* 顶部装饰条 */}
      <mesh position={[0, FLOOR_H / 2 + 0.03, 0]} geometry={barGeo}>
        <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0.0} />
      </mesh>
      {/* 窗户效果 */}
      {Array.from({ length: 3 }).map((_, wi) => (
        <React.Fragment key={wi}>
          <mesh position={[-1.5 + wi * 1.5, 0, FLOOR_D / 2 + 0.01]}>
            <planeGeometry args={[0.6, 0.5]} />
            <meshStandardMaterial
              color={status === 'completed' ? '#bae6fd' : status === 'in-progress' ? '#fef3c7' : '#334155'}
              emissive={status === 'completed' ? '#38bdf8' : status === 'in-progress' ? '#fbbf24' : '#000000'}
              emissiveIntensity={0.15}
              transparent
              opacity={0.7}
            />
          </mesh>
          <mesh position={[-1.5 + wi * 1.5, 0, -FLOOR_D / 2 - 0.01]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.6, 0.5]} />
            <meshStandardMaterial
              color={status === 'completed' ? '#bae6fd' : status === 'in-progress' ? '#fef3c7' : '#334155'}
              emissive={status === 'completed' ? '#38bdf8' : status === 'in-progress' ? '#fbbf24' : '#000000'}
              emissiveIntensity={0.15}
              transparent
              opacity={0.7}
            />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  )
}

// ---------- 地面 ----------
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#0f172a" roughness={1} metalness={0} />
    </mesh>
  )
}

// ---------- 网格 ----------
function GridFloor() {
  return (
    <gridHelper
      args={[40, 40, '#1e293b', '#1e293b']}
      position={[0, -0.04, 0]}
    />
  )
}

// ---------- 场景主体 ----------
interface SceneProps {
  snapshot: DaySnapshot
  hovered: number | null
  setHovered: (v: number | null) => void
  setTooltipData: (v: { x: number; y: number; floor: FloorData } | null) => void
  focusFloor: number | null
  highlightFloorIndices: number[]
}

function Scene({ snapshot, hovered, setHovered, setTooltipData, focusFloor, highlightFloorIndices }: SceneProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<any>(null)
  const flyToRef = useRef<((idx: number) => void) | null>(null)
  const hasHighlight = highlightFloorIndices.length > 0

  const handleCreated = useCallback((state: { camera: THREE.Camera }) => {
    cameraRef.current = state.camera as THREE.PerspectiveCamera
  }, [])

  useEffect(() => {
    const { flyTo, dispose } = createFlyToAnimation(cameraRef, controlsRef)
    flyToRef.current = flyTo
    return dispose
  }, [])

  // 当 focusFloor 变化时触发飞行
  useEffect(() => {
    if (focusFloor !== null && flyToRef.current) {
      flyToRef.current(focusFloor)
    }
  }, [focusFloor])

  const handleFloorClick = useCallback((index: number) => {
    if (flyToRef.current) {
      flyToRef.current(index)
    }
  }, [])

  return (
    <Canvas
      camera={{ position: [12, 12, 14], fov: 45 }}
      onCreated={handleCreated}
      style={{ background: 'transparent' }}
    >
      <color attach="background" args={['#0a0e1a']} />
      <fog attach="fog" args={['#0a0e1a', 25, 50]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 15, 8]} intensity={0.9} color="#e2e8f0" castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#38bdf8" />
      <pointLight position={[0, 20, 0]} intensity={0.2} color="#38bdf8" />

      <Ground />
      <GridFloor />

      {snapshot.floors.map((floor, i) => (
        <FloorMesh
          key={floor.id}
          floor={floor}
          index={i}
          snapshot={snapshot}
          hovered={hovered}
          highlighted={highlightFloorIndices.includes(i)}
          dimmed={hasHighlight && !highlightFloorIndices.includes(i)}
          setHovered={setHovered}
          setTooltipData={setTooltipData}
          flyTo={handleFloorClick}
          cameraRef={cameraRef}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={true}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 4, 0]}
      />

      <Environment preset="city" />
    </Canvas>
  )
}

export default Scene
