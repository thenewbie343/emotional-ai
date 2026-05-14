import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import HomeScene from './pages/HomeScene'
import CompanionChat from './pages/CompanionChat'
import Auth from './pages/Auth'
import SaiHub from './pages/SaiHub'
import SaiChat from './pages/SaiChat'
import SaiJournal from './pages/SaiJournal'
import SaiDreams from './pages/SaiDreams'
import SaiDiary from './pages/SaiDiary'
import SaiMemories from './pages/SaiMemories'
import SaiWellness from './pages/SaiWellness'
import SaiInsights from './pages/SaiInsights'
import SaiGoals from './pages/SaiGoals'
import SaiConstellation from './pages/SaiConstellation'
import SaiTimeCapsule from './pages/SaiTimeCapsule'
import OnboardingTutorial from './components/OnboardingTutorial'
import './index.css'

// ── SAI ↔ SHUNA Toggle Button ────────────────────────────────────────────────
function CompanionToggle({ session, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isSai = location.pathname.startsWith('/sai')
  const isChat = location.pathname === '/chat'
  const showToggle = session && (isSai || isChat)

  if (!showToggle) return null

  const handleToggle = () => {
    onToggle()           
    if (isSai) {
      navigate('/chat')
    } else {
      navigate('/sai')
    }
  }

  return (
    <button
      onClick={handleToggle}
      className="companion-toggle-btn"
      style={{
        position: 'fixed', top: '18px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, background: 'rgba(10,10,18,0.75)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '50px', padding: '7px 18px', color: 'white',
        fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.7rem',
        fontWeight: 600, letterSpacing: '1.5px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
      title={isSai ? 'Switch to SHUNA (Companion Mode)' : 'Switch to SAI (Personal AI)'}
    >
      <span style={{ color: isSai ? '#00d4ff' : 'rgba(255,255,255,0.4)' }}>SAI</span>
      <span style={{ opacity: 0.3 }}>⇄</span>
      <span style={{ color: isChat ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>SHUNA</span>
    </button>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companionKey, setCompanionKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div style={{ width: '100vw', height: '100vh', background: '#0a0e1a' }} />

  return (
    <>
      <OnboardingTutorial userId={session?.user?.id} />
      <CompanionToggle session={session} onToggle={() => setCompanionKey(k => k + 1)} />
      <Routes>
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/sai" />} />
        <Route path="/" element={session ? <HomeScene /> : <Navigate to="/auth" />} />
        <Route path="/chat" element={session ? <CompanionChat key={`siya-${companionKey}`} session={session} /> : <Navigate to="/auth" />} />

        {/* SHUNA features */}
        <Route path="/siya/journal" element={session ? <SaiJournal session={session} /> : <Navigate to="/auth" />} />
        <Route path="/siya/wellness" element={session ? <SaiWellness session={session} /> : <Navigate to="/auth" />} />
        <Route path="/siya/insights" element={session ? <SaiInsights session={session} /> : <Navigate to="/auth" />} />
        <Route path="/siya/diary" element={session ? <SaiDiary session={session} /> : <Navigate to="/auth" />} />
        <Route path="/siya/memory" element={session ? <SaiConstellation session={session} /> : <Navigate to="/auth" />} />

        {/* SAI routes */}
        <Route path="/sai" element={session ? <SaiHub key={`saihub-${companionKey}`} session={session} /> : <Navigate to="/auth" />} />
        <Route path="/sai/chat" element={session ? <SaiChat key={`saichat-${companionKey}`} session={session} /> : <Navigate to="/auth" />} />
        <Route path="/sai/dreams" element={session ? <SaiDreams session={session} /> : <Navigate to="/auth" />} />
        <Route path="/sai/memories" element={session ? <SaiMemories session={session} /> : <Navigate to="/auth" />} />
        <Route path="/sai/goals" element={session ? <SaiGoals session={session} /> : <Navigate to="/auth" />} />
        <Route path="/sai/capsule" element={session ? <SaiTimeCapsule session={session} /> : <Navigate to="/auth" />} />
      </Routes>
    </>
  )
}
