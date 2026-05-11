import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { supabase } from '../lib/supabaseClient'
import CompanionCharacter from '../components/CompanionCharacter'
import { XpBar, fetchXp } from '../components/XpSystem'
import PersonalityRadar from '../components/PersonalityRadar'
import DailyInsight from '../components/DailyInsight'
import StreakBadge from '../components/StreakBadge'
import './SaiHub.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Hey, night owl'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

const FEATURES = [
  { to: '/sai/chat',     icon: '💬', label: 'Chat',         desc: 'Talk to SAI',              accent: '#7c5cfc' },
  { to: '/sai/journal',  icon: '📓', label: 'Journal',      desc: 'Track your mood',          accent: '#10b981' },
  { to: '/sai/memories', icon: '🧠', label: 'Memory Vault', desc: 'What SAI knows about you', accent: '#00d4ff' },
  { to: '/sai/wellness', icon: '💊', label: 'Wellness',     desc: 'Daily check-in',           accent: '#f59e0b' },
  { to: '/sai/goals',    icon: '🎯', label: 'Goals',        desc: 'Daily challenges',         accent: '#f97316' },
  { to: '/sai/insights', icon: '🔮', label: 'Insights',     desc: 'Your emotional profile',   accent: '#a855f7' },
  { to: '/sai/dreams',        icon: '🌙', label: 'Dream Worlds',  desc: 'Visualize your dreams',     accent: '#7c3aed' },
  { to: '/sai/diary',         icon: '📖', label: 'SAI Diary',    desc: "SAI's private thoughts",    accent: '#ff88cc' },
  { to: '/sai/constellation', icon: '⭐', label: 'Memory Stars', desc: '3D memory constellation',   accent: '#60a5fa' },
  { to: '/sai/capsule',       icon: '⏳', label: 'Time Capsules', desc: 'Messages to future self',  accent: '#facc15' },
  { to: '/',                  icon: '🏝️', label: 'Island',       desc: '3D world',                  accent: '#00ffaa' },
]

export default function SaiHub({ session }) {
  const navigate = useNavigate()
  const [xpData, setXpData] = useState(null)
  const [personality, setPersonality] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    fetchXp(session.user.id).then(data => setXpData(data))
    supabase.from('sai_personality').select('*')
      .eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setPersonality(data)
        else {
          supabase.from('sai_personality')
            .insert([{ user_id: session.user.id }])
            .select().maybeSingle()
            .then(({ data: newData }) => setPersonality(newData))
        }
      })
  }, [session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="sai-hub">
      {/* Top bar */}
      <div className="sai-topbar">
        <div className="logo">SAI</div>
        <button className="logout-btn" onClick={handleLogout}>Log Out</button>
      </div>

      {/* 3D Avatar Viewport */}
      <div className="sai-avatar-viewport">
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <Environment preset="city" />
          <Suspense fallback={null}>
            <group position={[0, -2.9, 0]}>
              <CompanionCharacter animation="idle" />
            </group>
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.4}
            maxPolarAngle={Math.PI / 2 + 0.15}
            minPolarAngle={Math.PI / 2 - 0.35}
          />
        </Canvas>
      </div>

      {/* Info */}
      <div className="sai-info">
        <div className="greeting">{getGreeting()}</div>
        <div className="sai-name">SAI</div>
        <div className="sai-status">
          <div className="dot" />
          Always here for you
        </div>
      </div>

      {/* XP Bar */}
      <div style={{ padding: '0 28px 12px', width: '100%', maxWidth: '520px', zIndex: 10 }}>
        <XpBar xpData={xpData} />
      </div>

      {/* Daily Insight */}
      <div style={{ padding: '0 28px 12px', width: '100%', maxWidth: '520px', zIndex: 10 }}>
        <DailyInsight session={session} />
      </div>

      {/* Streak Badge */}
      <div style={{ padding: '0 28px 16px', width: '100%', maxWidth: '520px', zIndex: 10 }}>
        <StreakBadge userId={session?.user?.id} />
      </div>

      {/* Feature Cards — 2-column grid */}
      <div className="sai-features-grid">
        {FEATURES.map(f => (
          <Link key={f.to} to={f.to} className="sai-feature-card" style={{ '--accent': f.accent }}>
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-label">{f.label}</div>
            <div className="feature-desc">{f.desc}</div>
          </Link>
        ))}
      </div>

      {/* Bottom Nav */}
      <div className="sai-bottom-nav">
        <div className="sai-nav-item active">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </div>
        <Link to="/sai/chat" className="sai-nav-item">
          <span className="nav-icon">💬</span>
          <span className="nav-label">Chat</span>
        </Link>
        <Link to="/sai/goals" className="sai-nav-item">
          <span className="nav-icon">🎯</span>
          <span className="nav-label">Goals</span>
        </Link>
        <Link to="/sai/wellness" className="sai-nav-item">
          <span className="nav-icon">💊</span>
          <span className="nav-label">Wellness</span>
        </Link>
        <Link to="/sai/memories" className="sai-nav-item">
          <span className="nav-icon">🧠</span>
          <span className="nav-label">Memory</span>
        </Link>
      </div>
    </div>
  )
}
