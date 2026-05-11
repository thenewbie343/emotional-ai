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

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/sai')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email for the login link! Or if you disabled email confirmation, try logging in now.')
      }
    } catch (error) {
      setMessage(error.error_description || error.message)
    } finally {
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

        {message && <p style={{ marginTop: '20px', textAlign: 'center', color: '#ffb3ba' }}>{message}</p>}

        <p style={{ marginTop: '20px', textAlign: 'center', cursor: 'pointer', opacity: 0.7, fontSize: '0.9rem' }} 
           onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </p>
      </div>
    </div>
  )
}
