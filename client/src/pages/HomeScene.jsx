import { Suspense, useState, useEffect, useRef, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sky, Environment, PerspectiveCamera, Clouds, Cloud, Sparkles, Stats } from '@react-three/drei'
import * as THREE from 'three'
import FloatingIsland from '../components/FloatingIsland'
import { initAudio, setAudioVolume, stopAudio } from '../utils/audioSynth'
import { supabase } from '../lib/supabaseClient'
import { useIslandAchievements } from '../hooks/useIslandAchievements'
import IslandAchievements from '../components/island/IslandAchievements'
import { motion } from 'framer-motion'

const SmallIsland = lazy(() => import('../components/SmallIsland'))
const FlockOfBirds = lazy(() => import('../components/FlockOfBirds'))
const FloatingDebris = lazy(() => import('../components/FloatingDebris'))
const ShootingStars = lazy(() => import('../components/ShootingStars'))
const MagicDrip = lazy(() => import('../components/MagicDrip'))
const MovingCloud = lazy(() => import('../components/MovingCloud'))
const ParasiteIslandModifier = lazy(() => import('../components/ParasiteLayer').then(module => ({ default: module.ParasiteIslandModifier })))

function FpsMonitor({ isMobile, onLowFps }) {
  const frameTimes = useRef([]);
  const lastTime = useRef(performance.now());
  const triggered = useRef(false);

  useFrame(() => {
    if (!isMobile || triggered.current) return;
    const now = performance.now();
    const delta = (now - lastTime.current) / 1000;
    lastTime.current = now;

    if (delta > 0 && delta < 2) {
      frameTimes.current.push(delta);
      if (frameTimes.current.length > 60) {
        frameTimes.current.shift();
      }

      if (frameTimes.current.length >= 30) {
        const avgDelta = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
        const fps = 1 / avgDelta;
        if (fps <= 10) {
          triggered.current = true;
          onLowFps();
        }
      }
    }
  });

  return null;
}

export default function HomeScene() {
  const navigate = useNavigate()
  const [isLowFps, setIsLowFps] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('islandVolume')
    return saved !== null ? parseFloat(saved) : 1.0
  })
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('islandMuted') === 'true'
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showPicker, setShowPicker] = useState(false)
  const [userId, setUserId] = useState(null)
  const [showFireworks, setShowFireworks] = useState(false)
  const [logoMoved, setLogoMoved] = useState(false)
  const portalRef = useRef()

  const { achievements } = useIslandAchievements(userId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    const handlePortalClick = () => setShowPicker(true)
    window.addEventListener('portal-click', handlePortalClick)
    const handleTriggerFireworks = () => setShowFireworks(true)
    window.addEventListener('trigger-fireworks', handleTriggerFireworks)

    const timer = setTimeout(() => {
      setLogoMoved(true)
    }, 3000)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('portal-click', handlePortalClick)
      window.removeEventListener('trigger-fireworks', handleTriggerFireworks)
      clearTimeout(timer)
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
    setLogoMoved(true)
    setAudioVolume(isMuted ? 0 : volume)
    initAudio()
  }

  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    localStorage.setItem('islandMuted', newMuted.toString())
    setAudioVolume(newMuted ? 0 : volume)
  }

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value)
    setVolume(newVol)
    localStorage.setItem('islandVolume', newVol.toString())
    
    if (newVol > 0 && isMuted) {
      setIsMuted(false)
      localStorage.setItem('islandMuted', 'false')
    } else if (newVol === 0 && !isMuted) {
      setIsMuted(true)
      localStorage.setItem('islandMuted', 'true')
    }
    
    setAudioVolume(newVol)
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        {!isLowFps ? (
          <Canvas 
            shadows={!isMobile}
            dpr={isMobile ? 1 : [1, 1.5]} 
            performance={{ min: 0.5 }}
            gl={{ 
              antialias: false, 
              powerPreference: "high-performance",
              alpha: false,
              stencil: false,
              depth: true
            }}
          >
            <FpsMonitor isMobile={isMobile} onLowFps={() => setIsLowFps(true)} />
            <color attach="background" args={['#0a081d']} />
            <Suspense fallback={null}>
              <PerspectiveCamera makeDefault position={[0, 3, cameraZ]} fov={cameraFov} />
              <Sky distance={450000} sunPosition={[5, 1, 8]} inclination={0} azimuth={0.25} />
              {!isMobile && <Environment preset="sunset" />}
              <ambientLight intensity={isMobile ? 1.1 : 0.4} />
              <directionalLight position={[5, 10, 5]} intensity={isMobile ? 1.2 : 1.5} castShadow={!isMobile} />
              <pointLight position={[-5, 5, -5]} intensity={isMobile ? 0.8 : 0.5} color="#b0c4de" />
              {isMobile && <directionalLight position={[-5, -5, -5]} intensity={0.4} color="#ffffff" />}

              <Sparkles count={isMobile ? 5 : 45} scale={30} size={2} speed={0.4} opacity={0.2} color="#aaddff" position={[0, -2, 0]} />
              <ShootingStars />

              {!isMobile && (
                <Clouds material={THREE.MeshBasicMaterial}>
                  <Cloud segments={4} bounds={[10, 2, 2]} volume={10} color="#eeddff" position={[-20, 10, -30]} speed={0.2} opacity={0.25} />
                  <Cloud segments={4} bounds={[10, 2, 2]} volume={10} color="#ffeedd" position={[20, 15, -40]} speed={0.2} opacity={0.25} />
                  <MovingCloud moveSpeed={1.5} xRange={[-35, 35]} segments={6} bounds={[15, 3, 3]} volume={15} color="#ffffff" position={[-35, 5, 12]} speed={0.3} opacity={0.2} />
                  <MovingCloud moveSpeed={-1.4} xRange={[-30, 30]} segments={5} bounds={[10, 3, 4]} volume={12} color="#e6e6fa" position={[-30, -0.5, 2]} speed={0.35} opacity={0.25} />
                </Clouds>
              )}

              <FlockOfBirds count={isMobile ? 6 : 12} isAudioEnabled={hasEntered} radius={12} height={10} heightVariance={5} centerOffset={modelPosition} speed={0.15} />
              <FloatingIsland position={modelPosition} scale={modelScale} rotation={modelRotation} isMobile={isMobile} />
              <IslandAchievements achievements={achievements} showFireworks={showFireworks} onFireworksComplete={() => setShowFireworks(false)} />
              
              {isMobile ? (
                <SmallIsland position={[24, -6, 16]} scale={[2.5, 2.5, 2.5]} rotation={[-0.05, -0.9, 0]} floatOffset={4.7} floatSpeed={0.95} />
              ) : (
                <>
                  <SmallIsland position={[-28, 8, -12]} scale={[2.8, 2.8, 2.8]} rotation={[0, 1.1, 0]} floatOffset={0} floatSpeed={0.7} />
                  <SmallIsland position={[30, 2, -18]} scale={[2.2, 2.2, 2.2]} rotation={[0.1, -0.6, 0]} floatOffset={1.8} floatSpeed={1.0} />
                  <SmallIsland position={[24, -6, 16]} scale={[2.5, 2.5, 2.5]} rotation={[-0.05, -0.9, 0]} floatOffset={4.7} floatSpeed={0.95} />
                </>
              )}

              <ParasiteIslandModifier portalRef={portalRef} />
            </Suspense>
            <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={50} maxPolarAngle={Math.PI / 1.5} />
            <Stats />
          </Canvas>
        ) : (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            background: '#0a081d',
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            zIndex: 9998
          }}>
            {/* Cosmic background glows */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
              <div style={{ position: 'absolute', top: '-10%', left: '-15%', width: '500px', height: '500px', background: 'rgba(134,25,143,0.1)', filter: 'blur(150px)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '600px', height: '600px', background: 'rgba(49,46,129,0.1)', filter: 'blur(150px)', borderRadius: '50%' }} />
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 text-center max-w-sm px-6 flex flex-col items-center"
            >
              {/* 2D Island representation */}
              <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                {/* Glowing circles representing orbits */}
                <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50%', animation: 'spin 20s linear infinite' }} />
                <div style={{ position: 'absolute', width: '192px', height: '192px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '50%', animation: 'spin 10s linear infinite' }} />
                
                {/* 2D stylized floating island container */}
                <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', background: 'linear-gradient(to bottom right, rgba(99,102,241,0.15), rgba(168,85,247,0.15))', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {/* Blue Building representation */}
                  <button 
                    onClick={() => setShowPicker(true)}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      background: 'linear-gradient(to right, #06b6d4, #2563eb)',
                      border: '1px solid rgba(103,232,249,0.3)',
                      boxShadow: '0 0 20px rgba(6,182,212,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span className="material-symbols-outlined text-white text-3xl" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>corporate_fare</span>
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-bold tracking-wider text-white mb-2">Performance Mode</h2>
              <p className="text-xs text-white/50 mb-6 leading-relaxed">
                The 3D environment was frozen to save battery and memory. You can enter the Companion Hub by clicking the Blue Building above.
              </p>
            </motion.div>
          </div>
        )}

        {/* Animated Logo */}
        <img 
          src="/logo.jpeg" 
          alt="Antigravity Island Logo" 
          style={{
            position: 'absolute',
            zIndex: 10001,
            transition: 'all 1.2s cubic-bezier(0.22, 1, 0.36, 1)', // Smooth ease-out
            ...(logoMoved ? {
              top: '24px',
              left: 'calc(100% - 84px)', // 100% minus 24px margin minus 60px width
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transform: 'translate(0%, 0%)'
            } : {
              top: '50%',
              left: '50%',
              width: '180px',
              height: '180px',
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              transform: 'translate(-50%, -140%)'
            }),
            objectFit: 'cover'
          }}
        />

        {!hasEntered ? (
          <div onClick={handleEnter} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', cursor: 'pointer', zIndex: 9999 }}>
            <div style={{ height: '180px', marginBottom: '24px' }} /> {/* Spacer for logo */}
            <h1 style={{ color: 'white', marginBottom: '20px', fontSize: '3rem', fontFamily: 'sans-serif', letterSpacing: '2px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Antigravity Island</h1>
            <div style={{ padding: '15px 30px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '30px', color: 'white', fontWeight: '500', letterSpacing: '1px' }}>Click anywhere to enter</div>
          </div>
        ) : (
          <>
            <div className="overlay" style={{ pointerEvents: 'none' }}>Drag to Rotate • Click the Blue Building to Enter</div>
            <div className="volume-control-container">
              <button 
                className="volume-mute-btn"
                onClick={toggleMute} 
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <input 
                className="custom-volume-slider"
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={isMuted ? 0 : volume} 
                onChange={handleVolumeChange}
                title="Adjust Volume"
              />
            </div>
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
