import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error') // 'error' or 'success'
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageType('error')

    const formattedEmail = email.trim().toLowerCase()

    // 1. Password length check (must be at least 8 characters)
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    // 2. Validate email domain for Sign Up (must end with @gmail.com)
    if (!isLogin) {
      if (!formattedEmail.endsWith('@gmail.com')) {
        setMessage('Only valid @gmail.com email addresses are allowed for signup.')
        setLoading(false)
        return
      }

      const usernamePart = formattedEmail.split('@')[0]

      // A. Minimum 4 character username check
      if (usernamePart.length < 4) {
        setMessage('Gmail username must be at least 4 characters long (before @gmail.com).')
        setLoading(false)
        return
      }

      // B. Blacklist check (test, dummy, fraud, temp, fake, guest, admin)
      const blacklist = ['test', 'dummy', 'fraud', 'temp', 'fake', 'guest', 'admin']
      if (blacklist.some(word => usernamePart.includes(word))) {
        setMessage('Gmail username contains blocked keywords (e.g. test, dummy, fraud).')
        setLoading(false)
        return
      }

      // C. Gmail format check (only alphanumeric a-z, 0-9 and single dots allowed)
      const gmailRegex = /^[a-z0-9]+(\.[a-z0-9]+)*$/;
      if (!gmailRegex.test(usernamePart)) {
        setMessage('Invalid Gmail username format (only letters, numbers, and single dots allowed).')
        setLoading(false)
        return
      }
    }

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
        setMessageType('success')
        setMessage('Verification link sent! Check your Gmail inbox.')
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
    setMessageType('error')
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
    <div className="min-h-screen w-screen bg-[#020005] text-gray-100 flex items-center justify-center p-6 overflow-x-hidden relative font-sans">
      {/* Cosmic background nebulas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[600px] h-[600px] bg-fuchsia-900/15 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] bg-indigo-900/15 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden">
          {/* Subtle light leak */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-widest bg-gradient-to-r from-[#00d4ff] via-indigo-400 to-fuchsia-500 bg-clip-text text-transparent mb-2">
              ANTIGRAVITY ISLAND
            </h1>
            <p className="text-xs uppercase tracking-widest text-white/40">
              {isLogin ? 'Synchronize Mind & Companion' : 'Crystallize New Insight'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors text-[20px]">
                mail
              </span>
              <input
                type="email"
                placeholder="Gmail Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 pl-12 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 pointer-events-auto"
                required
              />
            </div>

            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors text-[20px]">
                lock
              </span>
              <input
                type="password"
                placeholder="Password (Min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 pl-12 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 pointer-events-auto"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-sm font-semibold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? 'Log In' : 'Sign Up'
              )}
            </button>
          </form>

          <div className="flex items-center my-6 opacity-30">
            <div className="flex-1 h-[1px] bg-white" />
            <span className="px-3 text-xs tracking-wider">OR</span>
            <div className="flex-1 h-[1px] bg-white" />
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin} 
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-3 pointer-events-auto hover:border-white/20 active:scale-[0.98] disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.47-.63-.74-1.37-.88-2.13z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </button>

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-4 rounded-2xl text-xs text-center border ${
                messageType === 'error' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-300' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              }`}
            >
              {message}
            </motion.div>
          )}

          <p 
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage('');
            }}
            className="mt-6 text-center cursor-pointer text-xs text-white/50 hover:text-white transition-colors uppercase tracking-wider font-semibold pointer-events-auto"
          >
            {isLogin ? "Need a companion? Create account" : "Synchronize existing companion? Log In"}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
