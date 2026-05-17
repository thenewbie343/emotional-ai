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
import '../index.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Hey, night owl'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

const FEATURES = [
  { to: '/sai/chat',     icon: 'forum',           label: 'Chat',         desc: 'Talk to SAI',              accentClass: 'text-[#dcb8ff]' },
  { to: '/sai/memories', icon: 'memory',          label: 'Memory Vault', desc: 'What SAI knows about you', accentClass: 'text-[#00fbfb]' },
  { to: '/sai/goals',    icon: 'track_changes',   label: 'Goals',        desc: 'Daily challenges',         accentClass: 'text-[#ffb873]' },
  { to: '/sai/dreams',   icon: 'nights_stay',     label: 'Dream Worlds', desc: 'Visualize your dreams',    accentClass: 'text-[#8a2be2]' },
  { to: '/sai/capsule',  icon: 'hourglass_empty', label: 'Time Capsules',desc: 'Messages to future self',  accentClass: 'text-[#00dddd]' },
  { to: '/',             icon: 'landscape',       label: 'Island',       desc: '3D world',                 accentClass: 'text-[#efdbff]' },
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
    <div className="text-on-surface antialiased bg-[#16111b] min-h-screen relative font-['Plus_Jakarta_Sans'] overflow-x-hidden pb-[100px]">
      {/* Enhanced Background */}
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute w-[350px] h-[350px] rounded-full blur-[100px] bg-[#dcb8ff]/40 top-[-5%] left-[-10%] animate-[drift_18s_infinite_ease-in-out]"></div>
        <div className="absolute w-[350px] h-[350px] rounded-full blur-[100px] bg-[#00fbfb]/30 bottom-[-10%] right-[-5%] animate-[drift_22s_infinite_ease-in-out_-5s]"></div>
        <div className="absolute w-[450px] h-[450px] rounded-full blur-[100px] bg-[#8a2be2]/20 top-[30%] right-[10%] animate-[drift_25s_infinite_ease-in-out_-10s]"></div>
      </div>

      <div className="relative z-10 pt-8 pb-28 px-5 max-w-md mx-auto space-y-8">
        
        {/* Topbar */}
        <header className="flex justify-between items-center w-full mb-4">
          <div className="font-['Outfit'] text-[24px] font-bold tracking-tight bg-gradient-to-r from-[#dcb8ff] to-[#00fbfb] bg-clip-text text-transparent">
            SAI
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-[8px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#cfc2d7] hover:bg-[rgba(255,255,255,0.1)] transition-all">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-[8px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#ffb4ab] hover:bg-[rgba(255,180,171,0.2)] transition-all">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </header>

        {/* Hero Card with 3D Avatar */}
        <section className="w-full">
          <div className="backdrop-blur-[40px] bg-[rgba(15,5,24,0.7)] border border-[rgba(255,255,255,0.12)] shadow-[0_12px_40px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[32px] p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#dcb8ff]/5 to-transparent pointer-events-none"></div>
            
            <div className="relative mb-6 mt-2 w-full h-[220px]">
              <div className="absolute inset-0 bg-[#8a2be2]/40 blur-[40px] rounded-full scale-110"></div>
              {/* Actual 3D Avatar Rendering inside the card */}
              <div className="w-full h-full relative z-10" style={{ filter: 'drop-shadow(0 0 20px rgba(138,43,226,0.4))' }}>
                <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 50 }}>
                  <ambientLight intensity={0.7} />
                  <directionalLight position={[5, 8, 5]} intensity={1.5} />
                  <Environment preset="city" />
                  <Suspense fallback={null}>
                    <group position={[0, -2.9, 0]}>
                      <CompanionCharacter animation="idle" />
                    </group>
                  </Suspense>
                  <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.4} maxPolarAngle={Math.PI/2+0.15} minPolarAngle={Math.PI/2-0.35} />
                </Canvas>
              </div>
            </div>
            
            <h1 className="font-['Outfit'] text-[24px] font-bold text-white mb-2 tracking-tight">{getGreeting()}</h1>
            <p className="text-[#cfc2d7] text-[14px] leading-relaxed mb-6 opacity-80 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-[#00fbfb] rounded-full animate-pulse"></span>
              Always here for you
            </p>
            
            <Link to="/sai/chat" className="w-full py-4 bg-[#8a2be2] text-white rounded-[20px] font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_32px_rgba(138,43,226,0.35),0_0_8px_rgba(138,43,226,0.2)] group">
              <span>Talk to SAI</span>
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* Existing Functional Components in Glassmorphic wrappers */}
        <section className="space-y-4">
          <div className="backdrop-blur-[20px] bg-[rgba(15,5,24,0.5)] border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)] rounded-[24px] p-5">
            <XpBar xpData={xpData} />
          </div>
          <div className="backdrop-blur-[20px] bg-[rgba(15,5,24,0.5)] border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)] rounded-[24px] p-5">
            <DailyInsight session={session} />
          </div>
          <div className="backdrop-blur-[20px] bg-[rgba(15,5,24,0.5)] border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)] rounded-[24px] p-5">
            <StreakBadge userId={session?.user?.id} />
          </div>
        </section>

        {/* Feature Grid with UI Polish */}
        <section className="backdrop-blur-[20px] bg-[rgba(15,5,24,0.5)] border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)] rounded-[32px] p-6">
          <h3 className="font-['Outfit'] text-[16px] font-bold flex items-center gap-2 mb-6 text-white">
            <span className="material-symbols-outlined text-[#ffb873]">grid_view</span>
            Explore Features
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <Link key={f.to} to={f.to} className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-white/5 p-4 rounded-[24px] flex flex-col gap-3 group transition-all hover:bg-[rgba(255,255,255,0.08)] active:scale-95">
                <div className={`w-12 h-12 rounded-xl backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] flex items-center justify-center ${f.accentClass} shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]`}>
                  <span className="material-symbols-outlined text-[24px]">{f.icon}</span>
                </div>
                <div>
                  <h4 className="font-['Outfit'] font-bold text-[14px] text-white">{f.label}</h4>
                  <p className="text-[11px] text-[#cfc2d7] opacity-80 mt-1 leading-snug">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Mobile Nav */}
      <nav className="fixed bottom-0 w-full border-t border-[rgba(255,255,255,0.12)] bg-[rgba(15,5,24,0.85)] backdrop-blur-[40px] flex justify-around items-center pt-4 pb-8 z-50 px-4">
        <Link className="flex flex-col items-center gap-1 text-[#00fbfb] scale-110 drop-shadow-[0_0_8px_rgba(0,251,251,0.5)]" to="/sai">
          <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link className="flex flex-col items-center gap-1 text-[#cfc2d7] hover:text-white transition-colors" to="/sai/chat">
          <span className="material-symbols-outlined text-[24px]">forum</span>
          <span className="text-[10px] font-medium">Chat</span>
        </Link>
        <Link className="flex flex-col items-center gap-1 text-[#cfc2d7] hover:text-white transition-colors" to="/sai/goals">
          <span className="material-symbols-outlined text-[24px]">track_changes</span>
          <span className="text-[10px] font-medium">Goals</span>
        </Link>
        <Link className="flex flex-col items-center gap-1 text-[#cfc2d7] hover:text-white transition-colors" to="/sai/dreams">
          <span className="material-symbols-outlined text-[24px]">nights_stay</span>
          <span className="text-[10px] font-medium">Dreams</span>
        </Link>
        <Link className="flex flex-col items-center gap-1 text-[#cfc2d7] hover:text-white transition-colors" to="/sai/memories">
          <span className="material-symbols-outlined text-[24px]">memory</span>
          <span className="text-[10px] font-medium">Memory</span>
        </Link>
      </nav>
    </div>
  )
}
