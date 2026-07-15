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
import SaiDashboard from './pages/SaiDashboard'
import SiyaHub from './pages/SiyaHub'
import ProfileHub from './pages/ProfileHub'
import OnboardingTutorial from './components/OnboardingTutorial'
import Billing from './pages/Billing'
import AdminPanel from './pages/AdminPanel'
import { useSubscription } from './hooks/useSubscription'
import OnboardingGate from './components/OnboardingGate'
import posthog from 'posthog-js'
import { NotificationProvider, useNotification } from './context/NotificationContext'
import NotificationToast from './components/NotificationToast'
import { notificationEngine } from './utils/NotificationEngine'
import './index.css'

function NotificationEngineRunner({ session }) {
  const { addNotification } = useNotification();
  useEffect(() => {
    // Globally intercept window.alert and redirect to custom themed notifications
    window.alert = (message) => {
      let type = 'info';
      const lower = message.toLowerCase();
      if (
        lower.includes('fail') || 
        lower.includes('error') || 
        lower.includes('blocked') || 
        lower.includes('limit') || 
        lower.includes('restricted') ||
        lower.includes('expired')
      ) {
        type = 'error';
      } else if (
        lower.includes('success') || 
        lower.includes('completed') || 
        lower.includes('earned') ||
        lower.includes('cleared') ||
        lower.includes('sent')
      ) {
        type = 'success';
      }
      
      addNotification({
        sender: 'System',
        message: message,
        type: type
      });
    };

    if (session?.user) {
      notificationEngine.init(addNotification);
      notificationEngine.evaluateTriggers();
      
      const interval = setInterval(() => {
        notificationEngine.evaluateTriggers();
      }, 10 * 60 * 1000); // Check every 10 mins
      
      return () => clearInterval(interval);
    }
  }, [addNotification, session]);
  
  return null;
}

// ── SAI ↔ SHUNA Toggle Button ────────────────────────────────────────────────
// ... (rest of helper functions and components) ...
function CompanionToggle({ session, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isSai = location.pathname.startsWith('/sai')
  const isChat = location.pathname === '/chat'
  const isSiya = location.pathname.startsWith('/siya')
  const showToggle = session && (
    location.pathname === '/sai' || 
    location.pathname === '/siya' || 
    location.pathname === '/chat' || 
    location.pathname === '/sai/chat'
  )

  if (!showToggle) return null

  const handleToggle = () => {
    onToggle()           
    if (isSai) {
      navigate('/siya')
      posthog.capture('persona_switched', {
        from: 'SAI',
        to: 'SHUNA'
      })
    } else {
      navigate('/sai')
      posthog.capture('persona_switched', {
        from: 'SHUNA',
        to: 'SAI'
      })
    }
  }

  return (
    <button
      onClick={handleToggle}
      className="companion-toggle-btn"
      title={isSai ? 'Switch to SHUNA (Companion Mode)' : 'Switch to SAI (Personal AI)'}
    >
      <span style={{ color: isSai ? '#00d4ff' : 'rgba(255,255,255,0.4)' }}>SAI</span>
      <span style={{ opacity: 0.3 }}>⇄</span>
      <span style={{ color: (isChat || isSiya) ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>SHUNA</span>
    </button>
  )
}

function PremiumRoute({ session, children }) {
  const { isPremium, loading } = useSubscription(session)
  const navigate = useNavigate();

  if (loading) {
    return <div style={{ width: '100vw', height: '100vh', background: '#0a0e1a' }} />
  }

  if (!isPremium) {
    return <Navigate to="/billing" replace />
  }

  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companionKey, setCompanionKey] = useState(0)

  const identifyUserPostHog = async (user) => {
    if (!user) return;
    try {
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const tier = sub?.tier || 'free';
      posthog.identify(user.id, {
        email: user.email,
        tier: tier
      });
    } catch (err) {
      console.error('[PostHog] Identity error:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.user_metadata?.is_blocked) {
        await supabase.auth.signOut()
        setSession(null)
      } else {
        setSession(session)
        if (session?.user) {
          identifyUserPostHog(session.user);
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.user_metadata?.is_blocked) {
        await supabase.auth.signOut()
        setSession(null)
      } else {
        setSession(session)
        if (session?.user) {
          identifyUserPostHog(session.user);
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div style={{ width: '100vw', height: '100vh', background: '#0a0e1a' }} />

  return (
    <NotificationProvider>
      <NotificationEngineRunner session={session} />
      <NotificationToast />
      <OnboardingGate>
        <OnboardingTutorial userId={session?.user?.id} />
        <CompanionToggle session={session} onToggle={() => setCompanionKey(k => k + 1)} />
        <Routes>
          <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
          <Route path="/" element={
            session ? (
              session.user.user_metadata?.default_companion === 'Sai' 
                ? <Navigate to="/sai" /> 
                : (session.user.user_metadata?.default_companion === 'Shuna' ? <Navigate to="/siya" /> : <Navigate to="/island" />)
            ) : <Navigate to="/auth" />
          } />
          <Route path="/island" element={session ? <HomeScene /> : <Navigate to="/auth" />} />
          <Route path="/chat" element={session ? <CompanionChat key={`siya-${companionKey}`} session={session} /> : <Navigate to="/auth" />} />

          {/* SHUNA features */}
          <Route path="/siya" element={session ? <SiyaHub key={`siyahub-${companionKey}`} session={session} /> : <Navigate to="/auth" />} />
          <Route path="/siya/journal" element={session ? <PremiumRoute session={session}><SaiJournal session={session} /></PremiumRoute> : <Navigate to="/auth" />} />
          <Route path="/siya/wellness" element={session ? <PremiumRoute session={session}><SaiWellness session={session} /></PremiumRoute> : <Navigate to="/auth" />} />
          <Route path="/siya/insights" element={session ? <PremiumRoute session={session}><SaiInsights session={session} /></PremiumRoute> : <Navigate to="/auth" />} />
          <Route path="/siya/diary" element={session ? <PremiumRoute session={session}><SaiDiary session={session} /></PremiumRoute> : <Navigate to="/auth" />} />
          <Route path="/siya/memory" element={session ? <PremiumRoute session={session}><SaiConstellation session={session} /></PremiumRoute> : <Navigate to="/auth" />} />

          {/* SAI routes */}
          <Route path="/sai" element={session ? <SaiHub key={`saihub-${companionKey}`} session={session} /> : <Navigate to="/auth" />} />
          <Route path="/sai/chat" element={session ? <SaiChat key={`saichat-${companionKey}`} session={session} /> : <Navigate to="/auth" />} />
          <Route path="/sai/dreams" element={session ? <PremiumRoute session={session}><SaiDreams session={session} /></PremiumRoute> : <Navigate to="/auth" />} />
          <Route path="/sai/memories" element={session ? <PremiumRoute session={session}><SaiMemories session={session} /></PremiumRoute> : <Navigate to="/auth" />} />
          <Route path="/sai/goals" element={session ? <SaiGoals session={session} /> : <Navigate to="/auth" />} />
          <Route path="/sai/capsule" element={session ? <PremiumRoute session={session}><SaiTimeCapsule session={session} /></PremiumRoute> : <Navigate to="/auth" />} />
          <Route path="/sai/study" element={session ? <SaiDashboard session={session} /> : <Navigate to="/auth" />} />
          <Route path="/dashboard" element={session ? <Navigate to="/sai/study" replace /> : <Navigate to="/auth" />} />
          
          {/* Billing & Admin */}
          <Route path="/billing" element={session ? <Billing session={session} /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={session ? <ProfileHub session={session} /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={session ? <AdminPanel session={session} /> : <Navigate to="/auth" />} />
        </Routes>
      </OnboardingGate>
    </NotificationProvider>
  )
}
