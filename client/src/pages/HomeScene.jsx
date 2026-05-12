import { Suspense, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, Environment, PerspectiveCamera, Clouds, Cloud, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import FloatingIsland from '../components/FloatingIsland'
import SmallIsland from '../components/SmallIsland'
import FlockOfBirds from '../components/FlockOfBirds'
import FloatingDebris from '../components/FloatingDebris'
import ShootingStars from '../components/ShootingStars'
import MagicDrip from '../components/MagicDrip'
import MovingCloud from '../components/MovingCloud'
import { initAudio, setAudioVolume, stopAudio } from '../utils/audioSynth'

export default function HomeScene() {
  const navigate = useNavigate()
  const [hasEntered, setHasEntered] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    
    // Listen for portal crystal clicks
    const handlePortalClick = () => setShowPicker(true)
    window.addEventListener('portal-click', handlePortalClick)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('portal-click', handlePortalClick)
      stopAudio()
    }
  }, [])

  // Final locked-in coordinates based on your specifications
  const modelPosition = [-1.1, -1.5, 0.7]
  const modelScale = [8.0, 7.0, 11.0]
  const modelRotation = [-0.13, -1.25, -0.02]
  const cameraZ = 26
  const cameraFov = 60

  const handleEnter = () => {
    setHasEntered(true)
    // Initialize audio system
    initAudio()
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    setAudioVolume(isMuted ? 1.0 : 0.0)
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <Canvas dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          {/* Default camera with the exact distance and FOV you requested */}
          <PerspectiveCamera makeDefault position={[0, 3, cameraZ]} fov={cameraFov} />
          
          <Sky 
            distance={450000} 
            sunPosition={[5, 1, 8]} 
            inclination={0} 
            azimuth={0.25} 
          />
          <Environment preset="sunset" />
          
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1.5}
          />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color="#b0c4de" />

          {/* --- REALISM ELEMENTS --- */}
          
          {/* Magical sparkles floating around the base of the island */}
          <Sparkles count={isMobile ? 100 : 400} scale={30} size={2} speed={0.4} opacity={0.2} color="#aaddff" position={[0, -2, 0]} />

          {/* Random fast-moving light streaks in the background */}
          <ShootingStars />
          
          {/* Moving background clouds */}
          <Clouds material={THREE.MeshBasicMaterial}>
            {/* Background clouds */}
            <Cloud segments={isMobile ? 10 : 20} bounds={[10, 2, 2]} volume={10} color="#eeddff" position={[-20, 10, -30]} speed={0.2} opacity={0.25} />
            <Cloud segments={isMobile ? 10 : 20} bounds={[10, 2, 2]} volume={10} color="#ffeedd" position={[20, 15, -40]} speed={0.2} opacity={0.25} />
            <Cloud segments={isMobile ? 10 : 20} bounds={[10, 2, 2]} volume={10} color="#ddf0ff" position={[0, 12, -25]} speed={0.2} opacity={0.25} />
            
            {/* Foreground clouds moving in front of the island and passing through (disabled on mobile for performance) */}
            {!isMobile && (
              <>
                {/* Foreground clouds (in front of the island) */}
                <MovingCloud moveSpeed={1.5} xRange={[-35, 35]} segments={30} bounds={[15, 3, 3]} volume={15} color="#ffffff" position={[-35, 5, 12]} speed={0.3} opacity={0.2} />
                <MovingCloud moveSpeed={-1.2} xRange={[-35, 35]} segments={25} bounds={[12, 2, 2]} volume={12} color="#f0f8ff" position={[35, 2, 16]} speed={0.25} opacity={0.15} />
                
                {/* Clouds passing THROUGH the island */}
                <MovingCloud moveSpeed={1.0} xRange={[-30, 30]} segments={20} bounds={[10, 3, 4]} volume={12} color="#e6e6fa" position={[-30, -0.5, 2]} speed={0.35} opacity={0.25} />
                <MovingCloud moveSpeed={-1.4} xRange={[-30, 30]} segments={20} bounds={[10, 2, 4]} volume={10} color="#ffffff" position={[30, 3.5, 0]} speed={0.4} opacity={0.2} />
              </>
            )}
          </Clouds>

          {/* Animated Birds */}
          {/* Flock circling the buildings on the island */}
          <FlockOfBirds 
            count={25} 
            isAudioEnabled={hasEntered} 
            radius={12} 
            height={10} 
            heightVariance={5}
            centerOffset={modelPosition}
            speed={0.15}
          />
          
          {/* Flock flying right in front of the user's view */}
          <FlockOfBirds 
            count={15} 
            isAudioEnabled={false} 
            radius={25} 
            height={0} 
            heightVariance={10}
            centerOffset={[0, 0, 15]}
            speed={0.3}
          />

          {/* ------------------------ */}

          {/* Core Scene Elements */}
          <FloatingIsland position={modelPosition} scale={modelScale} rotation={modelRotation} />
          
          {/* ── 5 Small Surrounding Islands ── */}
          {/* Far Left  — North-West, high up */}
          <SmallIsland
            position={[-28, 8, -12]}
            scale={[2.8, 2.8, 2.8]}
            rotation={[0, 1.1, 0]}
            floatOffset={0}
            floatSpeed={0.7}
          />
          {/* Far Right — North-East, mid height */}
          <SmallIsland
            position={[30, 2, -18]}
            scale={[2.2, 2.2, 2.2]}
            rotation={[0.1, -0.6, 0]}
            floatOffset={1.8}
            floatSpeed={1.0}
          />
          {/* Front Left — South-West, lower */}
          <SmallIsland
            position={[-22, -10, 14]}
            scale={[3.2, 3.2, 3.2]}
            rotation={[0, 0.4, -0.05]}
            floatOffset={3.2}
            floatSpeed={0.85}
          />
          {/* Front Right — South-East, mid-low */}
          <SmallIsland
            position={[24, -6, 16]}
            scale={[2.5, 2.5, 2.5]}
            rotation={[-0.05, -0.9, 0]}
            floatOffset={4.7}
            floatSpeed={0.95}
          />
          {/* Far Back Center — directly behind, elevated */}
          <SmallIsland
            position={[3, 14, -30]}
            scale={[3.5, 3.5, 3.5]}
            rotation={[0.1, 0.2, 0.05]}
            floatOffset={2.4}
            floatSpeed={0.65}
          />
          
        </Suspense>

        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={2} 
          maxDistance={50} 
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
      
      {/* Start Screen / Overlay */}
      {!hasEntered ? (
        <div 
          onClick={handleEnter}
          style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)',
            cursor: 'pointer', zIndex: 9999, transition: 'opacity 0.5s ease-out' 
          }}
        >
          <h1 style={{ color: 'white', marginBottom: '20px', fontSize: '3rem', fontFamily: 'sans-serif', letterSpacing: '2px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Antigravity Island</h1>
          <div style={{ padding: '15px 30px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '30px', color: 'white', fontSize: '1.2rem', fontFamily: 'sans-serif' }}>
            Click anywhere to enter experience
          </div>
        </div>
      ) : (
        <>
          <div className="overlay" style={{ pointerEvents: 'none' }}>Drag to Rotate • Click the Blue Building to Enter</div>
          <button 
            className="audio-toggle" 
            onClick={toggleMute}
          >
            {isMuted ? '🔇 Unmute Audio' : '🔊 Mute Audio'}
          </button>
        </>
      )}

      {/* Companion Picker Modal */}
      {showPicker && (
        <div 
          onClick={() => setShowPicker(false)}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            zIndex: 10000, animation: 'fadeIn 0.3s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
              padding: '40px 50px', borderRadius: '24px',
              background: 'rgba(20, 24, 40, 0.85)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              maxWidth: '420px', width: '90%'
            }}
          >
            <h2 style={{ color: 'white', fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: '1.4rem', letterSpacing: '1px', marginBottom: '5px' }}>
              Choose Your Companion
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', textAlign: 'center', marginBottom: '10px' }}>
              Who would you like to talk to?
            </p>
            <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
              {/* Siya Card */}
              <div 
                onClick={() => { setShowPicker(false); navigate('/chat'); }}
                style={{
                  flex: 1, padding: '24px 16px', borderRadius: '18px', textAlign: 'center',
                  background: 'rgba(0, 170, 255, 0.08)', border: '1px solid rgba(0, 170, 255, 0.2)',
                  cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'Inter, sans-serif'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 170, 255, 0.15)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,170,255,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 170, 255, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✨</div>
                <div style={{ color: '#00aaff', fontSize: '1.3rem', fontWeight: 600, marginBottom: '6px' }}>Siya</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Gesture-based companion</div>
              </div>
              {/* SAI Card */}
              <div 
                onClick={() => { setShowPicker(false); navigate('/sai/chat'); }}
                style={{
                  flex: 1, padding: '24px 16px', borderRadius: '18px', textAlign: 'center',
                  background: 'rgba(124, 92, 252, 0.08)', border: '1px solid rgba(124, 92, 252, 0.2)',
                  cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'Inter, sans-serif'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124, 92, 252, 0.15)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(124,92,252,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(124, 92, 252, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🧠</div>
                <div style={{ color: '#7c5cfc', fontSize: '1.3rem', fontWeight: 600, marginBottom: '6px' }}>SAI</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>AI companion with memory</div>
              </div>
            </div>
            <button 
              onClick={() => setShowPicker(false)}
              style={{
                marginTop: '5px', background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.85rem',
                fontFamily: 'Inter, sans-serif', padding: '8px 20px', borderRadius: '10px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}</div>
    </>
  )
}
