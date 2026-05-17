import { useState, useEffect, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Sparkles } from '@react-three/drei';
import { SpiritFamiliar } from '../components/siya/SpiritFamiliar';
import { supabase } from '../lib/supabaseClient';
import '../index.css';

const QUICK_ACCESS = [
  { to: '/chat',          icon: 'forum',           title: 'Chat with Shuna', desc: 'Connect and reflect',     color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/20' },
  { to: '/siya/journal',  icon: 'auto_stories',    title: 'Inner Diary',     desc: 'Private reflections',     color: 'text-rose-300',    bg: 'bg-rose-500/20' },
  { to: '/siya/wellness', icon: 'self_improvement',title: 'Wellness Radar',  desc: 'Emotional balance',       color: 'text-indigo-300',  bg: 'bg-indigo-500/20' },
  { to: '/siya/insights', icon: 'bubble_chart',    title: 'Resonance',       desc: 'Emotional insights',      color: 'text-violet-300',  bg: 'bg-violet-500/20' },
  { to: '/',              icon: 'public',          title: '3D Island',       desc: 'Return to the world',     color: 'text-sky-300',     bg: 'bg-sky-500/20' },
];

export default function SiyaHub({ session }) {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 5) setGreeting('The night is quiet.');
    else if (hour < 12) setGreeting('A peaceful morning to you.');
    else if (hour < 17) setGreeting('Good afternoon. Take a breath.');
    else if (hour < 21) setGreeting('The evening brings calm.');
    else setGreeting('Rest easy tonight.');
  }, []);

  return (
    <div className="min-h-screen bg-[#130b1c] text-gray-100 font-sans selection:bg-fuchsia-500/30 overflow-x-hidden pb-24 relative">
      
      {/* Dynamic Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-fuchsia-900/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-900/20 rounded-full blur-[150px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]"></div>
        <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-rose-900/10 rounded-full blur-[100px] mix-blend-screen animate-[bounce_15s_infinite]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 space-y-10">
        
        {/* Header - Ethereal & Calming */}
        <header className="flex justify-between items-end w-full animate-[fadeIn_1s_ease-out]">
          <div>
            <h1 className="text-4xl md:text-5xl font-light tracking-wide text-white mb-2 font-serif">
              {greeting}
            </h1>
            <p className="text-sm text-fuchsia-200/60 font-medium tracking-widest uppercase flex items-center gap-2">
               <span className="w-2 h-2 bg-fuchsia-400 rounded-full shadow-[0_0_8px_rgba(232,121,249,0.8)] animate-pulse"></span> Shuna Reflection Hub
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md hover:scale-110 active:scale-95 shadow-lg">
              <span className="material-symbols-outlined text-[20px] text-fuchsia-200">notifications</span>
            </button>
            <button onClick={() => supabase.auth.signOut().then(() => navigate('/auth'))} className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-all group backdrop-blur-md hover:scale-110 active:scale-95 shadow-lg">
              <span className="material-symbols-outlined text-[20px] text-fuchsia-200 group-hover:text-rose-300 transition-colors">logout</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Top Section: Dedicated 3D Viewport for Shuna (Left Column) */}
          <section className="lg:col-span-5 flex flex-col gap-6 animate-[slideInUp_0.8s_ease-out]">
            <div className="relative w-full aspect-[4/5] bg-white/[0.02] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] group transition-all duration-700 hover:border-fuchsia-500/30 hover:shadow-[0_0_40px_rgba(192,38,211,0.15)] backdrop-blur-xl">
              
              <div className="absolute top-5 left-5 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                <span className="text-[11px] font-semibold tracking-widest text-fuchsia-300 uppercase">Shuna is present</span>
              </div>
              
              {/* Interactive 3D Canvas */}
              <div className="w-full h-full relative z-10 cursor-pointer">
                <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 45 }}>
                  <ambientLight intensity={1.5} />
                  <pointLight position={[10, 10, 10]} intensity={2} color="#f5d0fe" />
                  <pointLight position={[-10, -10, -10]} intensity={1} color="#818cf8" />
                  <Suspense fallback={null}>
                    <SpiritFamiliar active={true} onInteract={() => navigate('/chat')} />
                    <Sparkles count={80} scale={6} size={1.5} speed={0.2} opacity={0.4} color="#fbcfe8" />
                  </Suspense>
                  <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} maxPolarAngle={Math.PI/1.5} minPolarAngle={Math.PI/3} />
                </Canvas>
              </div>

              {/* Direct Chat Overlay Button inside 3D view */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                <button 
                  onClick={() => navigate('/chat')}
                  className="px-6 py-3 bg-fuchsia-600/80 hover:bg-fuchsia-500 text-white rounded-full font-medium tracking-wide shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)] backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 border border-fuchsia-400/30"
                >
                  <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                  Talk to Shuna
                </button>
              </div>
            </div>

            {/* Reflection Prompt Card */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[24px] p-6 shadow-xl relative overflow-hidden backdrop-blur-md hover:bg-white/[0.05] transition-all duration-300 hover:border-fuchsia-500/20 group">
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-duration-500"></div>
              <h3 className="text-[11px] font-semibold tracking-widest text-fuchsia-300/70 uppercase mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">psychology_alt</span> Daily Reflection
              </h3>
              <p className="text-gray-300 font-serif text-lg leading-relaxed italic">
                "What is one thing you can let go of today to create more space for yourself?"
              </p>
            </div>
          </section>

          {/* Main Section: Quick Access Modules (Right Column) */}
          <section className="lg:col-span-7 flex flex-col gap-6 animate-[slideInUp_1s_ease-out]">
            
            {/* Quick Access Modules Grid */}
            <div className="w-full">
              <h2 className="text-[11px] text-fuchsia-300/70 font-semibold tracking-widest uppercase mb-4 pl-2 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[16px]">widgets</span> Sanctuary Modules
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {QUICK_ACCESS.map((item, idx) => (
                  <Link 
                    key={item.to} 
                    to={item.to} 
                    className="group relative bg-white/[0.03] border border-white/10 rounded-[24px] p-6 hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden shadow-lg backdrop-blur-md"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10 flex items-start gap-4">
                      {/* Distinctive Color Palette Shifts */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner border border-white/10`}>
                        <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
                      </div>
                      <div className="flex flex-col justify-center h-14">
                        <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors text-[16px] font-sans tracking-wide">{item.title}</h3>
                        <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Mini Wellness Preview */}
            <div className="bg-gradient-to-br from-[#1c1228] to-[#120b1c] border border-fuchsia-500/10 rounded-[24px] p-6 shadow-xl hover:shadow-[0_8px_30px_rgba(192,38,211,0.1)] hover:border-fuchsia-500/30 transition-all duration-500 group relative overflow-hidden mt-2">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50 mix-blend-screen group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="relative z-10">
                <h3 className="text-[11px] font-semibold tracking-widest text-fuchsia-300/70 uppercase mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">monitor_heart</span> Emotional Rhythm
                </h3>
                
                <div className="flex justify-between items-end gap-2 h-24 mt-4">
                  {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                    <div key={i} className="w-full bg-white/5 rounded-t-lg relative group-hover:bg-white/10 transition-colors" style={{ height: '100%' }}>
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-fuchsia-600 to-indigo-400 rounded-t-lg transition-all duration-1000 group-hover:shadow-[0_0_15px_rgba(192,38,211,0.5)]" 
                        style={{ height: `${h}%`, transitionDelay: `${i * 100}ms` }}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between text-xs text-gray-500">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  );
}
