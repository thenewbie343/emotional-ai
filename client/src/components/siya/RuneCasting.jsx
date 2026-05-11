import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// The 3D effect part
export function RuneTornado({ activeType }) {
  const particlesRef = useRef()
  const count = 300
  
  const positions = useRef(new Float32Array(count * 3))
  const phases = useRef(new Float32Array(count))
  const [color, setColor] = useState("#a55eea") // Default purple
  
  useEffect(() => {
    for (let i = 0; i < count; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 5
      positions.current[i * 3 + 1] = Math.random() * 8 - 4
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 5
      phases.current[i] = Math.random() * Math.PI * 2
    }
  }, [])

  useEffect(() => {
    if (activeType === 'circle') setColor("#00ffff") // Cyan dome
    else if (activeType === 'zigzag') setColor("#ffaa00") // Gold shower
    else setColor("#a55eea") // Purple tornado
  }, [activeType])

  useFrame((state) => {
    if (!activeType) return
    const time = state.clock.getElapsedTime()
    if (particlesRef.current) {
      const posArray = particlesRef.current.geometry.attributes.position.array
      
      for (let i = 0; i < count; i++) {
        if (activeType === 'circle') {
          // Dome logic
          const r = 3
          const a1 = time + phases.current[i]
          const a2 = phases.current[i] * 2
          posArray[i * 3] = Math.cos(a1) * Math.sin(a2) * r
          posArray[i * 3 + 1] = Math.abs(Math.cos(a2)) * r - 1
          posArray[i * 3 + 2] = Math.sin(a1) * Math.sin(a2) * r
        } 
        else if (activeType === 'zigzag') {
          // Shower logic
          posArray[i * 3 + 1] -= 0.1
          if (posArray[i * 3 + 1] < -2) {
            posArray[i * 3 + 1] = 8
            posArray[i * 3] = (Math.random() - 0.5) * 10
            posArray[i * 3 + 2] = (Math.random() - 0.5) * 10
          }
        }
        else {
          // Tornado vortex math
          const y = posArray[i * 3 + 1]
          const radius = 1.0 + (y + 4) * 0.3 
          const angle = time * 5 + phases.current[i]
          posArray[i * 3] = Math.cos(angle) * radius
          posArray[i * 3 + 2] = Math.sin(angle) * radius
          posArray[i * 3 + 1] += 0.05
          if (posArray[i * 3 + 1] > 6) posArray[i * 3 + 1] = -2
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  if (!activeType) return null

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={activeType === 'zigzag' ? 0.2 : 0.15}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// The 2D drawing overlay (UI)
export function RuneCanvas({ onSpellCast, isDrawModeActive }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const ctxRef = useRef(null)
  const pathLength = useRef(0)
  
  // Track bounding box to detect shape
  const bounds = useRef({ minX: 9999, maxX: 0, minY: 9999, maxY: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#ffffff' // Professional white glow instead of purple
    ctx.lineWidth = 3
    ctx.shadowBlur = 10
    ctx.shadowColor = '#ffffff'
    ctxRef.current = ctx

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.shadowBlur = 10
      ctx.shadowColor = '#ffffff'
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }

  const startDrawing = (e) => {
    if (!isDrawModeActive) return
    e.preventDefault() 
    const coords = getCoordinates(e)
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(coords.x, coords.y)
    setIsDrawing(true)
    pathLength.current = 0
    bounds.current = { minX: coords.x, maxX: coords.x, minY: coords.y, maxY: coords.y }
  }

  const draw = (e) => {
    if (!isDrawing || !isDrawModeActive) return
    e.preventDefault()
    const coords = getCoordinates(e)
    ctxRef.current.lineTo(coords.x, coords.y)
    ctxRef.current.stroke()
    pathLength.current += 1
    
    // Update bounds
    if (coords.x < bounds.current.minX) bounds.current.minX = coords.x
    if (coords.x > bounds.current.maxX) bounds.current.maxX = coords.x
    if (coords.y < bounds.current.minY) bounds.current.minY = coords.y
    if (coords.y > bounds.current.maxY) bounds.current.maxY = coords.y
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    ctxRef.current.closePath()
    setIsDrawing(false)
    
    if (pathLength.current > 15) {
      // Analyze shape based on bounding box proportions
      const width = bounds.current.maxX - bounds.current.minX
      const height = bounds.current.maxY - bounds.current.minY
      const ratio = width / height
      
      let spellType = 'tornado'
      if (ratio > 0.8 && ratio < 1.2 && pathLength.current > 40) spellType = 'circle'
      else if (ratio > 1.5) spellType = 'zigzag'
      
      onSpellCast(spellType)
    }
    
    setTimeout(() => {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }, 500)
  }

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseOut={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      onTouchCancel={stopDrawing}
      style={{
        position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
        pointerEvents: isDrawModeActive ? 'auto' : 'none', 
        zIndex: isDrawModeActive ? 50 : 0, 
        background: 'transparent'
      }}
    />
  )
}
