import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SiyaHub({ session }) {
  const navigate = useNavigate();

  return (
    <div className="siya-hub-container text-[#ecdcff] font-outfit min-h-screen overflow-x-hidden relative" style={{ backgroundColor: '#180e27' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-outfit { font-family: 'Outfit', sans-serif; }

        .siya-glass-panel {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            border-right: 1px solid rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .siya-blob {
            position: fixed;
            border-radius: 50%;
            filter: blur(80px);
            z-index: 0;
            opacity: 0.35;
        }

        .siya-blob-1 {
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, #f7b6b6 0%, transparent 70%);
            top: -100px;
            left: -100px;
        }

        .siya-blob-2 {
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, #574326 0%, transparent 70%);
            bottom: -150px;
            right: -100px;
        }

        @keyframes pulse-star {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.1); }
        }
        .siya-star {
            animation: pulse-star 4s infinite ease-in-out;
        }
      `}</style>

      {/* Background Decoration */}
      <div className="siya-blob siya-blob-1"></div>
      <div className="siya-blob siya-blob-2"></div>

      {/* TopNavBar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex justify-between items-center px-8 h-16 w-[90%] max-w-7xl rounded-full bg-[#251b34]/40 backdrop-blur-xl border border-white/20 shadow-[0_0_40px_rgba(247,182,182,0.1)]">
        <div className="font-playfair text-2xl font-semibold tracking-widest text-[#ecdcff]">SHUNA</div>
        <div className="hidden md:flex items-center space-x-8">
          <button onClick={() => navigate('/siya/wellness')} className="text-[#d6c2c1] hover:text-[#ecdcff] transition-colors">Wellness</button>
          <button onClick={() => navigate('/siya/journal')} className="text-[#ffd6d5] font-bold border-b-2 border-[#ffd6d5] pb-1">Journal</button>
          <button onClick={() => navigate('/siya/memory')} className="text-[#d6c2c1] hover:text-[#ecdcff] transition-colors">Memories</button>
          <button onClick={() => navigate('/siya/insights')} className="text-[#d6c2c1] hover:text-[#ecdcff] transition-colors">Insights</button>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-[#ffd6d5] cursor-pointer hover:scale-110 transition-transform">account_circle</span>
        </div>
      </nav>

      <main className="pt-32 pb-40 px-6 md:px-16 max-w-7xl mx-auto relative z-10">
        {/* Hero Section: Memory Constellation */}
        <section className="mb-12 relative overflow-hidden siya-glass-panel rounded-3xl p-8 md:p-12 min-h-[400px] flex flex-col justify-center">
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full opacity-40 mix-blend-screen bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#180e27] via-[#180e27]/50 to-transparent"></div>
          </div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="font-playfair text-4xl md:text-5xl text-[#ffd6d5] mb-4 leading-tight font-bold">
              Memory Constellation
            </h1>
            <p className="text-lg text-[#d6c2c1] leading-relaxed">
              Your journey, mapped across time and emotion. Each star represents a moment of clarity, a fragment of peace, or a milestone of growth.
            </p>
            <div className="mt-8 flex gap-4">
              <button onClick={() => navigate('/siya/memory')} className="bg-[#ffd6d5] text-[#4e2425] px-8 py-3 rounded-full font-medium hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,214,213,0.3)]">
                Explore Map
              </button>
              <button onClick={() => navigate('/siya/diary')} className="border border-white/20 bg-white/5 backdrop-blur-md px-8 py-3 rounded-full font-medium hover:bg-white/10 transition-colors">
                Add Entry
              </button>
            </div>
          </div>

          {/* Floating Decorative Stars */}
          <div className="absolute top-1/4 right-1/4 siya-star w-2 h-2 bg-[#dfc29c] rounded-full shadow-[0_0_10px_#dfc29c]"></div>
          <div className="absolute bottom-1/3 right-1/2 siya-star w-1.5 h-1.5 bg-[#ffd6d5] rounded-full shadow-[0_0_8px_#ffd6d5]" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 right-10 siya-star w-3 h-3 bg-[#dfc29c] rounded-full shadow-[0_0_12px_#dfc29c]" style={{ animationDelay: '2s' }}></div>
        </section>

        {/* Bento Grid Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Daily Reflection (Large) */}
          <div className="md:col-span-8 siya-glass-panel rounded-3xl p-8 flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#ffd6d5]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#ffd6d5]">edit_note</span>
                  </div>
                  <h2 className="font-playfair text-2xl font-semibold text-[#ecdcff]">Daily Reflection</h2>
                </div>
                <span className="text-sm text-[#d6c2c1] opacity-60">Today, 8:45 AM</span>
              </div>
              <div className="space-y-6">
                <p className="font-playfair text-2xl text-[#dfc29c] italic leading-relaxed opacity-90 px-4 border-l-2 border-[#ffd6d5]/30">
                  "The morning mist felt like a fresh beginning, wrapping the world in a quiet promise. I found a moment of pure silence before the day began..."
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-1.5 rounded-full bg-[#ffd6d5]/10 text-[#ffd6d5] border border-[#ffd6d5]/20 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ffd6d5] animate-pulse"></span> Peaceful
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-[#dfc29c]/10 text-[#dfc29c] border border-[#dfc29c]/20 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#dfc29c]"></span> Grateful
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-sm text-[#d6c2c1] mb-4">Journal Completion</p>
              <div className="h-1.5 w-full bg-[#251b34] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#ffd6d5] to-[#dfc29c] w-[85%] shadow-[0_0_10px_rgba(255,214,213,0.5)]"></div>
              </div>
            </div>
          </div>

          {/* Card 2: Wellness Radar (Medium) */}
          <div onClick={() => navigate('/siya/wellness')} className="md:col-span-4 siya-glass-panel rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[420px] cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-64 h-64 border border-[#ffd6d5] rounded-full group-hover:scale-105 transition-transform duration-700"></div>
              <div className="absolute w-48 h-48 border border-[#dfc29c] rounded-full group-hover:scale-95 transition-transform duration-700"></div>
              <div className="absolute w-32 h-32 border border-[#ffd6d5]/50 rounded-full"></div>
            </div>
            
            <h2 className="font-playfair text-2xl font-semibold text-[#ecdcff] mb-8 text-center relative z-10">Wellness Radar</h2>
            
            {/* Radar Visualization */}
            <div className="relative w-48 h-48 flex items-center justify-center z-10">
              <svg className="w-full h-full drop-shadow-[0_0_15px_rgba(255,214,213,0.4)]" viewBox="0 0 100 100">
                <polygon points="50,10 90,50 50,90 10,50" fill="rgba(255, 214, 213, 0.2)" stroke="#ffd6d5" strokeWidth="0.5"></polygon>
                <path d="M50 10 L80 40 L60 85 L20 60 Z" fill="rgba(223, 194, 156, 0.4)" stroke="#dfc29c" strokeWidth="1.5"></path>
                <circle cx="50" cy="10" r="2" fill="#ffd6d5"></circle>
                <circle cx="80" cy="40" r="2" fill="#dfc29c"></circle>
                <circle cx="60" cy="85" r="2" fill="#dfc29c"></circle>
                <circle cx="20" cy="60" r="2" fill="#dfc29c"></circle>
              </svg>
              <span className="absolute -top-6 text-sm text-[#ffd6d5] font-bold">Focus</span>
              <span className="absolute -bottom-6 text-sm text-[#dfc29c]">Balance</span>
              <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-sm text-[#dfc29c]">Rest</span>
              <span className="absolute -left-12 top-1/2 -translate-y-1/2 text-sm text-[#dfc29c]">Energy</span>
            </div>
            
            <div className="mt-12 text-center relative z-10">
              <p className="text-[#d6c2c1]">Your balance is up <span className="text-[#ffd6d5] font-bold">12%</span> this week.</p>
            </div>
          </div>

          {/* Card 3: Emotional Resonance (Wide) */}
          <div onClick={() => navigate('/siya/insights')} className="md:col-span-12 siya-glass-panel rounded-3xl p-8 min-h-[300px] cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-[#dfc29c]">auto_awesome</span>
              <h2 className="font-playfair text-2xl font-semibold text-[#ecdcff]">Emotional Resonance</h2>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 py-4">
              <span className="font-playfair text-[40px] text-[#ffd6d5] opacity-90 drop-shadow-[0_0_15px_rgba(255,214,213,0.3)] hover:scale-110 transition-transform">Serenity</span>
              <span className="font-playfair text-2xl text-[#dfc29c] opacity-70 hover:opacity-100 transition-opacity">Growth</span>
              <span className="font-playfair text-[32px] text-[#ecdcff] drop-shadow-[0_0_10px_rgba(236,220,255,0.2)] hover:scale-105 transition-transform">Connection</span>
              <span className="font-playfair text-xl text-[#f4b3b3] opacity-60 hover:opacity-100 transition-opacity">Clarity</span>
              <span className="font-playfair text-[48px] text-[#dfc29c] drop-shadow-[0_0_20px_rgba(223,194,156,0.3)] hover:scale-110 transition-transform">Balance</span>
              <span className="font-playfair text-2xl text-[#d6c2c1] opacity-50 hover:opacity-100 transition-opacity">Wonder</span>
              <span className="font-playfair text-[28px] text-[#ffd6d5] opacity-80 hover:scale-105 transition-transform">Awareness</span>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[#d6c2c1] text-center md:text-left">These keywords were most frequent in your reflections over the last 30 days.</p>
              <button className="text-sm text-[#ffd6d5] flex items-center gap-2 group">
                Full Analysis <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
