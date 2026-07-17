import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { supabase } from '../lib/supabaseClient'
import { useSubscription } from '../hooks/useSubscription'
import CompanionCharacter from '../components/CompanionCharacter'
import { XpBar, fetchXp } from '../components/XpSystem'
import PersonalityRadar from '../components/PersonalityRadar'
import DailyInsight from '../components/DailyInsight'
import StreakBadge from '../components/StreakBadge'
import { useNotification } from '../context/NotificationContext'
import NotificationDropdown from '../components/NotificationDropdown'
import TokenIcon from '../components/TokenIcon'
import './SaiHub.css'
import '../index.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good evening.'
  if (hour < 12) return 'Good morning.'
  if (hour < 17) return 'Good afternoon.'
  if (hour < 21) return 'Good evening.'
  return 'Good night.'
}

const QUICK_ACCESS = [
  { to: '/sai/study',    icon: 'dashboard',       title: 'Study Hub',    desc: 'Enter the grid',               color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/10', livesCost: 3, timeCost: 0 },
  { to: '/sai/chat',     icon: 'bolt',            title: 'Sai Link',     desc: 'Direct AI connection',         color: 'text-blue-400', bg: 'bg-blue-500/10', livesCost: 2, timeCost: 2, timeSuffix: '/msg' },
  { to: '/sai/memories', icon: 'memory',          title: 'Memory Vault', desc: 'Review stored context',        color: 'text-purple-400', bg: 'bg-purple-500/10', livesCost: 1, timeCost: 0 },
  { to: '/sai/dreams',   icon: 'nights_stay',     title: 'Dream Vault',  desc: 'Visualize your dreams',        color: 'text-indigo-400', bg: 'bg-indigo-500/10', livesCost: 2, timeCost: 10, timeSuffix: '/dream' },
  { to: '/sai/capsule',  icon: 'hourglass_empty', title: 'Time Capsules',desc: 'Messages to future self',      color: 'text-amber-400', bg: 'bg-amber-500/10', livesCost: 2, timeCost: 10, timeSuffix: '/capsule' },
  { to: '/sai/goals',    icon: 'track_changes',   title: 'Goals',        desc: 'Daily challenges',             color: 'text-emerald-400', bg: 'bg-emerald-500/10', livesCost: 1, timeCost: 5, timeSuffix: '/challenge' },
  { to: '/profile',      icon: 'manage_accounts', title: 'Profile Hub',  desc: 'Command Center & Settings',    color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
  { to: '/island',       icon: 'public',          title: '3D Island',    desc: 'Enter the open world',         color: 'text-rose-400', bg: 'bg-rose-500/10' },
]

export default function SaiHub({ session }) {
  const navigate = useNavigate()
  const { isPremium } = useSubscription(session)
  const { unreadCount, togglePanel } = useNotification()
  const [xpData, setXpData] = useState(null)

  const [lives, setLives] = useState(() => {
    try {
      const cached = localStorage.getItem('antigravity_token_balances')
      if (cached) return JSON.parse(cached).lives || 0;
    } catch (e) {}
    return 0;
  })
  const [time, setTime] = useState(() => {
    try {
      const cached = localStorage.getItem('antigravity_token_balances')
      if (cached) {
        const parsed = JSON.parse(cached)
        return (parsed.refill_time || 0) + (parsed.topup_time || 0);
      }
    } catch (e) {}
    return 0;
  })
  
  useEffect(() => {
    if (!session?.user?.id) return
    fetchXp(session.user.id).then(data => setXpData(data))

    const fetchBalances = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com")
        const res = await fetch(`${API_BASE}/api/tokens/balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id })
        })
        if (res.ok) {
          const balances = await res.json()
          localStorage.setItem('antigravity_token_balances', JSON.stringify(balances))
          setLives(balances.lives)
          setTime((balances.refill_time || 0) + (balances.topup_time || 0))
        }
      } catch (err) {
        console.error('Error fetching balances in hub:', err)
      }
    }
    fetchBalances()
  }, [session])

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 font-sans selection:bg-blue-500/30 overflow-x-hidden pb-24">
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#09090b]/0 to-[#09090b]/0 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 space-y-10">
        
        <header className="flex justify-between items-end w-full animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-white mb-2">{getGreeting()}</h1>
            <p className="text-sm text-gray-400 font-medium tracking-wider uppercase flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Personal Assistant Hub
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div 
              onClick={() => navigate('/profile')}
              className="cursor-pointer flex items-center gap-2.5 px-1 py-1 hover:opacity-80 transition-opacity text-xs select-none mr-2 flex items-center"
              title="Command Center Wallet"
            >
              <span className="flex items-center gap-1 font-medium text-rose-300">
                {lives} <TokenIcon type="life" className="w-3.5 h-3.5" />
              </span>
              <span className="w-[1px] h-3 bg-white/10 mx-1" />
              <span className="flex items-center gap-1 font-medium text-sky-300">
                {time} <TokenIcon type="time" className="w-3.5 h-3.5" />
              </span>
            </div>

            {!isPremium && (
              <button onClick={() => navigate('/billing')} className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-xs font-semibold text-white hover:opacity-90 transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                Go Premium
              </button>
            )}
            <div className="relative">
              <button 
                onClick={togglePanel}
                className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors relative"
              >
                <span className="material-symbols-outlined text-[20px] text-gray-300">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-[#09090b]" />
                )}
              </button>
              <NotificationDropdown />
            </div>
            <button 
              onClick={() => supabase.auth.signOut().then(() => navigate('/auth'))} 
              className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 group transition-all"
            >
              <span className="material-symbols-outlined text-[20px] text-gray-300 group-hover:text-red-400 transition-colors">logout</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <section className="lg:col-span-5 flex flex-col gap-6">
            <div className="relative w-full aspect-[4/5] bg-gradient-to-b from-[#121214] to-[#0d0d0f] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
              
              <div className="absolute top-5 left-5 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-semibold tracking-wider text-blue-400 uppercase">Sai is online</span>
              </div>
              
              <div className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing">
                <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.5], fov: 45 }}>
                  <ambientLight intensity={0.8} />
                  <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
                  <Environment preset="city" />
                  <Suspense fallback={null}>
                    <group position={[0, -2.5, 0]}>
                      <CompanionCharacter animation="idle" />
                      <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={10} blur={2.5} far={4} color="#000000" />
                    </group>
                  </Suspense>
                  <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI/2} minPolarAngle={Math.PI/3} />
                </Canvas>
              </div>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-[24px] p-6 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
              <XpBar xpData={xpData} />
            </div>
          </section>

          <section className="lg:col-span-7 flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#121214] border border-white/5 rounded-[24px] p-6 shadow-xl hover:border-white/10 hover:-translate-y-1 transition-all duration-300 group">
                <h3 className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-yellow-500">lightbulb</span> Daily Insight
                </h3>
                <div className="transition-transform duration-300">
                  <DailyInsight session={session} />
                </div>
              </div>
              
              <div className="bg-[#121214] border border-white/5 rounded-[24px] p-6 shadow-xl hover:border-white/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <StreakBadge userId={session?.user?.id} />
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase mb-4 pl-2 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[16px]">grid_view</span> Quick Access Modules
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {QUICK_ACCESS.map((item, idx) => (
                  <Link 
                    key={item.to} 
                    to={item.to} 
                    className="group relative bg-[#121214] border border-white/5 rounded-[24px] p-5 hover:bg-[#161619] hover:border-white/10 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden shadow-lg"
                  >
                    <div className="relative z-10 flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300 shadow-inner border border-white/5`}>
                        <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                      </div>
                      <div className="flex flex-col justify-center h-12">
                        <h3 className="font-semibold text-gray-200 group-hover:text-white transition-colors text-[15px] flex items-center gap-1.5 flex-wrap">
                          <span>{item.title}</span>
                          {(item.livesCost > 0 || item.timeCost > 0) && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-blue-300 flex items-center gap-1.5">
                              {item.livesCost > 0 && (
                                <span className="flex items-center gap-0.5">
                                  {item.livesCost} <TokenIcon type="life" className="w-3 h-3" />
                                </span>
                              )}
                              {item.timeCost > 0 && (
                                <span className="flex items-center gap-0.5">
                                  {item.timeCost} <TokenIcon type="time" className="w-3 h-3" />{item.timeSuffix || ''}
                                </span>
                              )}
                            </span>
                          )}
                        </h3>
                        <p className="text-[12px] text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
