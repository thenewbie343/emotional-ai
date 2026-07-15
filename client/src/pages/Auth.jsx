import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const formattedEmail = email.trim().toLowerCase()

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: formattedEmail, password })
        if (error) throw error

        if (data.user?.user_metadata?.is_blocked) {
          await supabase.auth.signOut()
          throw new Error('Your account has been blocked by the admin.')
        }

        navigate('/')
      } else {
        const { error } = await supabase.auth.signUp({ 
          email: formattedEmail, 
          password,
          options: {
            redirectTo: window.location.origin
          }
        })
        if (error) throw error
        setMessage('Check your email for the login link! Or if you disabled email confirmation, try logging in now.')
      }
    } catch (error) {
      setMessage(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        padding: '40px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
        width: '100%', maxWidth: '400px',
        color: 'white',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '10px', fontWeight: '700', letterSpacing: '3px', background: 'linear-gradient(135deg, #7c5cfc, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          SAI
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '30px', fontSize: '0.9rem', opacity: 0.5 }}>
          {isLogin ? 'Welcome back to your AI companion' : 'Create your AI companion'}
        </p>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none'
            }}
            required
          />
          <input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none'
            }}
            required
          />
          
          <button type="submit" disabled={loading} style={{
            padding: '15px', borderRadius: '10px', 
            background: 'rgba(100, 200, 255, 0.3)', color: 'white',
            cursor: 'pointer', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)',
            transition: 'background 0.3s'
          }}>
            {loading ? 'Loading...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', opacity: 0.3 }}>
          <div style={{ flex: 1, height: '1px', background: 'white' }} />
          <span style={{ padding: '0 10px', fontSize: '0.8rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'white' }} />
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin} 
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'background 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.47-.63-.74-1.37-.88-2.13z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>

        {message && <p style={{ marginTop: '20px', textAlign: 'center', color: '#ffb3ba' }}>{message}</p>}

        <p style={{ marginTop: '20px', textAlign: 'center', cursor: 'pointer', opacity: 0.7, fontSize: '0.9rem' }} 
           onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </p>
      </div>
    </div>
  )
}
