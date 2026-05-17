import { Suspense, useState, useEffect, useRef } from 'react'
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
import { ParasiteIslandModifier } from '../components/ParasiteLayer'
import { initAudio, setAudioVolume, stopAudio } from '../utils/audioSynth'

export default function HomeScene() {
  const navigate = useNavigate()
  const [hasEntered, setHasEntered] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showPicker, setShowPicker] = useState(false)
  const portalRef = useRef()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    const handlePortalClick = () => setShowPicker(true)
    window.addEventListener('portal-click', handlePortalClick)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('portal-click', handlePortalClick)
      stopAudio()
    }
  }, [])

  const modelPosition = [-1.1, -1.5, 0.7]
  const modelScale = [8.0, 7.0, 11.0]
  const modelRotation = [-0.13, -1.25, -0.02]
  const cameraZ = 26
  const cameraFov = 60

  const handleEnter = () => {
    setHasEntered(true)
    initAudio()
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    setAudioVolume(isMuted ? 1.0 : 0.0)
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <Canvas dpr={1} performance={{ min: 0.5 }}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 3, cameraZ]} fov={cameraFov} />
            <Sky distance={450000} sunPosition={[5, 1, 8]} inclination={0} azimuth={0.25} />
            <Environment preset="sunset" />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <pointLight position={[-5, 5, -5]} intensity={0.5} color="#b0c4de" />

            <Sparkles count={isMobile ? 50 : 150} scale={30} size={2} speed={0.4} opacity={0.2} color="#aaddff" position={[0, -2, 0]} />
            <ShootingStars />

            <Clouds material={THREE.MeshBasicMaterial}>
              <Cloud segments={isMobile ? 5 : 12} bounds={[10, 2, 2]} volume={10} color="#eeddff" position={[-20, 10, -30]} speed={0.2} opacity={0.25} />
              <Cloud segments={isMobile ? 5 : 12} bounds={[10, 2, 2]} volume={10} color="#ffeedd" position={[20, 15, -40]} speed={0.2} opacity={0.25} />
              {!isMobile && (
                <>
                  <MovingCloud moveSpeed={1.5} xRange={[-35, 35]} segments={15} bounds={[15, 3, 3]} volume={15} color="#ffffff" position={[-35, 5, 12]} speed={0.3} opacity={0.2} />
                  <MovingCloud moveSpeed={-1.4} xRange={[-30, 30]} segments={12} bounds={[10, 3, 4]} volume={12} color="#e6e6fa" position={[-30, -0.5, 2]} speed={0.35} opacity={0.25} />
                </>
              )}
            </Clouds>

            <FlockOfBirds count={isMobile ? 10 : 20} isAudioEnabled={hasEntered} radius={12} height={10} heightVariance={5} centerOffset={modelPosition} speed={0.15} />
            <FloatingIsland position={modelPosition} scale={modelScale} rotation={modelRotation} />
            
            <SmallIsland position={[-28, 8, -12]} scale={[2.8, 2.8, 2.8]} rotation={[0, 1.1, 0]} floatOffset={0} floatSpeed={0.7} />
            <SmallIsland position={[30, 2, -18]} scale={[2.2, 2.2, 2.2]} rotation={[0.1, -0.6, 0]} floatOffset={1.8} floatSpeed={1.0} />
            <SmallIsland position={[-22, -10, 14]} scale={[3.2, 3.2, 3.2]} rotation={[0, 0.4, -0.05]} floatOffset={3.2} floatSpeed={0.85} />
            <SmallIsland position={[24, -6, 16]} scale={[2.5, 2.5, 2.5]} rotation={[-0.05, -0.9, 0]} floatOffset={4.7} floatSpeed={0.95} />
            <SmallIsland position={[3, 14, -30]} scale={[3.5, 3.5, 3.5]} rotation={[0.1, 0.2, 0.05]} floatOffset={2.4} floatSpeed={0.65} />

            <ParasiteIslandModifier portalRef={portalRef} />
          </Suspense>
          <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={50} maxPolarAngle={Math.PI / 1.5} />
        </Canvas>

        {!hasEntered ? (
          <div onClick={handleEnter} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', cursor: 'pointer', zIndex: 9999 }}>
            <h1 style={{ color: 'white', marginBottom: '20px', fontSize: '3rem', fontFamily: 'sans-serif', letterSpacing: '2px' }}>Antigravity Island</h1>
            <div style={{ padding: '15px 30px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '30px', color: 'white' }}>Click anywhere to enter</div>
          </div>
        ) : (
          <>
            <div className="overlay" style={{ pointerEvents: 'none' }}>Drag to Rotate • Click the Blue Building to Enter</div>
            <button className="audio-toggle" onClick={toggleMute}>{isMuted ? '🔇 Unmute' : '🔊 Mute'}</button>
          </>
        )}

        {showPicker && (
          <div onClick={() => setShowPicker(false)} className="modal-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 10000 }}>
            <div onClick={(e) => e.stopPropagation()} className="modal-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px 50px', borderRadius: '24px', background: 'rgba(20, 24, 40, 0.85)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '420px', width: '90%' }}>
              <h2 style={{ color: 'white', fontFamily: 'Inter, sans-serif' }}>Choose Your Companion</h2>
              <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                <div onClick={() => { setShowPicker(false); navigate('/siya'); }} className="companion-card shuna" style={{ flex: 1, padding: '24px 16px', borderRadius: '18px', textAlign: 'center', background: 'rgba(0, 170, 255, 0.08)', border: '1px solid rgba(0, 170, 255, 0.2)', cursor: 'pointer' }}>
                  <div style={{ fontSize: '2.5rem' }}>✨</div>
                  <div style={{ color: '#00aaff', fontSize: '1.3rem', fontWeight: 600 }}>Shuna</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Soulful companion</div>
                </div>
                <div onClick={() => { setShowPicker(false); navigate('/sai'); }} className="companion-card sai" style={{ flex: 1, padding: '24px 16px', borderRadius: '18px', textAlign: 'center', background: 'rgba(124, 92, 252, 0.08)', border: '1px solid rgba(124, 92, 252, 0.2)', cursor: 'pointer' }}>
                  <div style={{ fontSize: '2.5rem' }}>🧠</div>
                  <div style={{ color: '#7c5cfc', fontSize: '1.3rem', fontWeight: 600 }}>SAI</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Analytical AI</div>
                </div>
              </div>
              <button onClick={() => setShowPicker(false)} style={{ color: 'rgba(255,255,255,0.3)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
