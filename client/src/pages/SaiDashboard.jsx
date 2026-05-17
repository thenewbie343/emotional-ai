import React from 'react';
import '../index.css';

export default function SaiDashboard() {
  return (
    <div className="text-on-surface antialiased bg-[#16111b] min-h-screen relative font-['Plus_Jakarta_Sans'] overflow-x-hidden pb-[100px]">
      {/* Enhanced Background */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <div className="absolute w-[350px] h-[350px] rounded-full blur-[100px] bg-[#dcb8ff]/40 top-[-5%] left-[-10%] animate-[drift_18s_infinite_ease-in-out]"></div>
        <div className="absolute w-[350px] h-[350px] rounded-full blur-[100px] bg-[#00fbfb]/30 bottom-[-10%] right-[-5%] animate-[drift_22s_infinite_ease-in-out_-5s]"></div>
        <div className="absolute w-[450px] h-[450px] rounded-full blur-[100px] bg-[#8a2be2]/20 top-[30%] right-[10%] animate-[drift_25s_infinite_ease-in-out_-10s]"></div>
      </div>

      <div className="relative z-10 pt-24 pb-28 px-5">
        <div className="max-w-md mx-auto space-y-12">
          
          {/* Hero Card */}
          <section className="w-full">
            <div className="backdrop-blur-[40px] bg-[rgba(15,5,24,0.7)] border border-[rgba(255,255,255,0.12)] shadow-[0_12px_40px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[32px] p-8 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-[#dcb8ff]/5 to-transparent pointer-events-none"></div>
              
              <div className="relative mb-8 mt-4">
                <div className="absolute inset-0 bg-[#8a2be2]/40 blur-[40px] rounded-full scale-125"></div>
                <img alt="Echo Mind Mascot" className="w-28 h-28 relative z-10 drop-shadow-[0_0_20px_rgba(138,43,226,0.4)]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGQA8TdYQ_Iq6Wx5f4igpHtya-fZfYiWtisgEsp9RNoaIxXEoXVRKDE0sxYhX04KC087N_RO1QWO7J5jpb0A9lBYgsipOSUnisRY-tU33wWi9WmirHbIVpGzRGjne0mzDZKfhBlsf6IsoARjAoHsjJilkxkTSknjxCnOWO3dsUztKBiYUBC5SvDW2-JAJNVXJ3cRC8XmKQzrVFp6iIkGG2-LzXIz5OCKZ55d0H1HvdIEMwvpbWvP6OwnPCJGQSmPObuA5MZhqgQd-7" />
              </div>
              
              <h1 className="font-['Outfit'] text-[28px] font-bold text-[#dcb8ff] mb-4 tracking-tight">Meet Echo Mind</h1>
              <p className="text-[#cfc2d7] text-[15px] leading-relaxed mb-10 px-4 opacity-80">Your intelligent companion for seamless productivity and growth.</p>
              
              <button className="w-full py-4 bg-[#8a2be2] text-white rounded-[20px] font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_32px_rgba(138,43,226,0.35),0_0_8px_rgba(138,43,226,0.2)] group">
                <span>Get Started</span>
                <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
              </button>
              
              <div className="mt-8 w-full backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#cfc2d7]">System Status</span>
                  <span className="text-[#00fbfb] flex items-center gap-2 font-semibold">
                    <span className="w-2 h-2 bg-[#00fbfb] rounded-full animate-pulse"></span>
                    Active
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#cfc2d7]">Cloud Sync</span>
                  <span className="font-medium">2 mins ago</span>
                </div>
              </div>
            </div>
          </section>

          {/* Interaction Quick Actions */}
          <section className="grid grid-cols-2 gap-4">
            <button className="backdrop-blur-[20px] bg-[rgba(15,5,24,0.5)] border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] p-6 rounded-[28px] flex flex-col items-center justify-center gap-3 group transition-all active:scale-95">
              <div className="w-12 h-12 rounded-xl backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] flex items-center justify-center text-[#dcb8ff]">
                <span className="material-symbols-outlined text-[28px]">forum</span>
              </div>
              <span className="font-['Outfit'] text-[14px] font-semibold text-white">Chat</span>
            </button>
            <button className="backdrop-blur-[20px] bg-[rgba(15,5,24,0.5)] border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] p-6 rounded-[28px] flex flex-col items-center justify-center gap-3 group transition-all active:scale-95">
              <div className="w-12 h-12 rounded-xl backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] flex items-center justify-center text-[#00fbfb]">
                <span className="material-symbols-outlined text-[28px]">mic</span>
              </div>
              <span className="font-['Outfit'] text-[14px] font-semibold text-white">Talk</span>
            </button>
          </section>

          {/* Advanced Voice Visualizer */}
          <section className="backdrop-blur-[40px] bg-[rgba(15,5,24,0.7)] border border-[rgba(255,255,255,0.12)] shadow-[0_12px_40px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[32px] p-6 relative overflow-hidden">
            <h3 className="font-['Outfit'] text-[12px] font-bold uppercase tracking-[0.2em] text-[#00fbfb] mb-6 text-center">Voice Assessment</h3>
            
            <div className="w-full h-[80px] flex items-center justify-center overflow-hidden mb-6">
              <svg className="w-[300px] h-full fill-none stroke-[3] stroke-linecap-round filter drop-shadow-[0_0_8px_rgba(0,251,251,0.5)]" viewBox="0 0 200 60">
                <defs>
                  <linearGradient id="waveGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#00fbfb"></stop>
                    <stop offset="50%" stopColor="#dcb8ff"></stop>
                    <stop offset="100%" stopColor="#8a2be2"></stop>
                  </linearGradient>
                </defs>
                <path className="animate-[wave-move_3s_ease-in-out_infinite]" d="M0,30 Q25,10 50,30 T100,30 T150,30 T200,30" stroke="url(#waveGrad)" strokeDasharray="200"></path>
                <path className="animate-[wave-move_3s_ease-in-out_infinite]" style={{ animationDelay: '-1.5s' }} d="M0,35 Q25,15 50,35 T100,35 T150,35 T200,35" opacity="0.3" stroke="url(#waveGrad)" strokeDasharray="200"></path>
              </svg>
            </div>
            
            <div className="text-center mb-6">
              <p className="font-['Outfit'] text-[18px] font-bold text-white mb-1">Analyzing Voice Tone</p>
              <p className="text-[12px] text-[#cfc2d7] opacity-70">Detecting emotional resonance and clarity</p>
            </div>
            
            <div className="space-y-4">
              <div className="h-[6px] bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00fbfb] via-[#dcb8ff] to-[#8a2be2] w-3/4 animate-pulse"></div>
              </div>
              <button className="w-full h-14 rounded-full bg-[#00fbfb] text-[#16111b] flex items-center justify-center shadow-[0_0_32px_rgba(0,251,251,0.35),0_0_8px_rgba(0,251,251,0.2)] active:scale-95 transition-all">
                <span className="material-symbols-outlined font-bold text-[28px]">mic</span>
              </button>
            </div>
          </section>

          {/* Topics Section */}
          <section className="space-y-4">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 scrollbar-hide">
              <button className="whitespace-nowrap px-5 py-2.5 rounded-full backdrop-blur-[40px] bg-[rgba(15,5,24,0.7)] border border-[rgba(255,255,255,0.12)] border-[#dcb8ff]/30 text-[#dcb8ff] font-bold text-[13px] shadow-[0_0_12px_rgba(138,43,226,0.2)]">All Topics</button>
              <button className="whitespace-nowrap px-5 py-2.5 rounded-full backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#cfc2d7] text-[13px] font-medium">Recent</button>
              <button className="whitespace-nowrap px-5 py-2.5 rounded-full backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#cfc2d7] text-[13px] font-medium">AI Assets</button>
              <button className="whitespace-nowrap px-5 py-2.5 rounded-full backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#cfc2d7] text-[13px] font-medium">Voice Lab</button>
            </div>
            
            <div className="backdrop-blur-[20px] bg-[rgba(15,5,24,0.5)] border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-[32px] p-6">
              <h3 className="font-['Outfit'] text-[16px] font-bold flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-[#ffb873]">grid_view</span>
                Explore Topics
              </h3>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-[#ffb873]/20 flex items-center justify-center text-[#ffb873]">
                    <span className="material-symbols-outlined text-[24px]">payments</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-white">Finance</h4>
                    <p className="text-[12px] text-[#cfc2d7]">Asset management & trends</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-[#00fbfb]/20 flex items-center justify-center text-[#00fbfb]">
                    <span className="material-symbols-outlined text-[24px]">business_center</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-white">Business</h4>
                    <p className="text-[12px] text-[#cfc2d7]">Scale and strategy insights</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* History Section */}
          <section className="backdrop-blur-[20px] bg-[rgba(15,5,24,0.5)] border border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-[32px] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Outfit'] text-[16px] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00fbfb]">history</span>
                History
              </h3>
              <button className="text-[11px] font-bold text-[#dcb8ff] uppercase tracking-wider">View All</button>
            </div>
            
            <div className="space-y-1 relative before:content-[''] before:absolute before:left-[7px] before:top-[24px] before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-[rgba(220,184,255,0.4)] before:to-transparent">
              <div className="relative pl-8 pb-6">
                <div className="absolute left-0 top-4 w-4 h-4 rounded-full bg-[#16111b] border-2 border-[#dcb8ff] z-10 shadow-[0_0_10px_rgba(220,184,255,0.6)]"></div>
                <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-white/5 p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-bold mb-1 text-white">Financial Analysis Q4</p>
                    <div className="flex items-center gap-3 text-[10px] text-[#cfc2d7] opacity-60">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">timer</span> 10m ago</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">description</span> 2.4MB</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#cfc2d7]">chevron_right</span>
                </div>
              </div>
              
              <div className="relative pl-8">
                <div className="absolute left-0 top-4 w-4 h-4 rounded-full bg-[#16111b] border-2 border-[#00fbfb] z-10 shadow-[0_0_10px_rgba(0,251,251,0.6)]"></div>
                <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.03)] border border-white/5 p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-bold mb-1 text-white">UX Audit Report</p>
                    <div className="flex items-center gap-3 text-[10px] text-[#cfc2d7] opacity-60">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">timer</span> 1h ago</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">description</span> 15.8MB</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#cfc2d7]">chevron_right</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      
    </div>
  );
}
