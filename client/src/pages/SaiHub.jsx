import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
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
  if (hour < 5) return 'Good evening.'
  if (hour < 12) return 'Good morning.'
  if (hour < 17) return 'Good afternoon.'
  if (hour < 21) return 'Good evening.'
  return 'Good night.'
}

const QUICK_ACCESS = [
  { to: '/sai/chat',     icon: 'forum',           title: 'SAI Chat',     desc: 'Engage with your assistant',   color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { to: '/sai/memories', icon: 'memory',          title: 'Memory Vault', desc: 'Review stored context',        color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { to: '/sai/dreams',   icon: 'nights_stay',     title: 'Dream Vault',  desc: 'Visualize your dreams',        color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { to: '/sai/capsule',  icon: 'hourglass_empty', title: 'Time Capsules',desc: 'Messages to future self',      color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { to: '/sai/goals',    icon: 'track_changes',   title: 'Goals',        desc: 'Daily challenges',             color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { to: '/',             icon: 'public',          title: '3D Island',    desc: 'Enter the open world',         color: 'text-rose-400', bg: 'bg-rose-500/10' },
]

export default function SaiHub({ session }) {
  const navigate = useNavigate()
  const [xpData, setXpData] = useState(null)
  
  useEffect(() => {
    if (!session?.user?.id) return
    fetchXp(session.user.id).then(data => setXpData(data))
  }, [session])

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 font-sans selection:bg-blue-500/30 overflow-x-hidden pb-24">
      {/* Subtle ambient background glow for minimalist depth */}
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#09090b]/0 to-[#09090b]/0 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 space-y-10">
        
        {/* Header - Professional & Refined */}
        <header className="flex justify-between items-end w-full animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-white mb-2">{getGreeting()}</h1>
            <p className="text-sm text-gray-400 font-medium tracking-wider uppercase flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Personal Assistant Hub
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-11 h-11 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-md">
              <span className="material-symbols-outlined text-[20px] text-gray-300">notifications</span>
            </button>
            <button onClick={() => supabase.auth.signOut().then(() => navigate('/auth'))} className="w-11 h-11 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors group backdrop-blur-md">
              <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-red-400 transition-colors">logout</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Top Section: Dedicated 3D Viewport & XP (Left Column) */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            <div className="relative w-full aspect-[4/5] bg-[#121214] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl group transition-all duration-500 hover:border-white/10 hover:shadow-blue-900/20">
              {/* Clean Blueprint Grid Background */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50"></div>
              
              <div className="absolute top-5 left-5 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                <span className="text-[11px] font-semibold tracking-widest text-emerald-400 uppercase">SAI Online</span>
              </div>
              
              {/* Interactive 3D Canvas */}
              <div className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing">
                <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.5], fov: 45 }}>
                  <ambientLight intensity={0.8} />
                  <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
                  <Environment preset="city" />
                  <Suspense fallback={null}>
                    <group position={[0, -2.5, 0]}>
                      <CompanionCharacter animation="idle" />
                      {/* Subtle contact shadow to ground the character */}
                      <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={10} blur={2.5} far={4} color="#000000" />
                    </group>
                  </Suspense>
                  <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI/2} minPolarAngle={Math.PI/3} />
                </Canvas>
              </div>
            </div>

            {/* Dynamic XP Bar placed immediately below the 3D character */}
            <div className="bg-[#121214] border border-white/5 rounded-[24px] p-6 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
              <XpBar xpData={xpData} />
            </div>
          </section>

          {/* Main Section: Data Cards & Quick Access (Right Column) */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Daily Insight & Streak Badge Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Insight Card */}
              <div className="bg-[#121214] border border-white/5 rounded-[24px] p-6 shadow-xl hover:border-white/10 hover:-translate-y-1 transition-all duration-300 group">
                <h3 className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-yellow-500">lightbulb</span> Daily Insight
                </h3>
                <div className="transition-transform duration-300">
                  <DailyInsight session={session} />
                </div>
              </div>
              
              {/* Streak Badge Card */}
              <div className="bg-[#121214] border border-white/5 rounded-[24px] p-6 shadow-xl hover:border-white/10 hover:-translate-y-1 transition-all duration-300 group flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase mb-2 self-start flex items-center gap-2 w-full">
                  <span className="material-symbols-outlined text-[16px] text-orange-500">local_fire_department</span> Activity Streak
                </h3>
                <div className="flex-grow flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                  <StreakBadge userId={session?.user?.id} />
                </div>
              </div>
            </div>

            {/* Quick Access Modules Grid */}
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
                      {/* Distinctive Color Palette Shifts */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300 shadow-inner border border-white/5`}>
                        <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                      </div>
                      <div className="flex flex-col justify-center h-12">
                        <h3 className="font-semibold text-gray-200 group-hover:text-white transition-colors text-[15px]">{item.title}</h3>
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
