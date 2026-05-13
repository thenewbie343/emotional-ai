import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Companion3D from '../components/Companion3D'
import { SIYA_PERSONALITIES, detectSiyaEmotion } from '../components/siya/PersonalityResponses'
import { RuneCanvas } from '../components/siya/RuneCasting'
import ParasiteSIYA, { useSIYATierBehavior } from '../components/siya/ParasiteSIYA'
import './CompanionChat.css'

// ── Feminine voice selector ─────────────────────────────────────────────────
// Priority order: premium female → Google UK → Zira → Samantha → any female
function getFeminineVoice() {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const priority = [
    v => v.name.includes('Samantha') && v.lang.startsWith('en'),
    v => v.name.includes('Google UK English Female'),
    v => v.name.includes('Google US English') && !v.name.includes('Male'),
    v => v.name.includes('Zira') && v.lang.startsWith('en'),
    v => v.name.includes('Victoria') && v.lang.startsWith('en'),
    v => (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman')) && v.lang.startsWith('en'),
    v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB'),
  ]

  for (const test of priority) {
    const found = voices.find(test)
    if (found) return found
  }
  return voices.find(v => v.lang.startsWith('en')) || voices[0]
}

// ── Mode labels and descriptions ─────────────────────────────────────────────
const MODES = [
  {
    key: 'analytical',
    label: 'ANALYTICAL',
    desc: 'Cold logic, precise answers',
    color: '#00d4ff',
  },
  {
    key: 'direct',
    label: 'DIRECT',
    desc: 'Blunt, no-nonsense, sharp',
    color: '#ffffff',
  },
  {
    key: 'unhinged',
    label: 'UNHINGED',
    desc: 'Chaotic, raw, unpredictable',
    color: '#ff4488',
  },
]

// ── Updated personality keys to match new labels ─────────────────────────────
// Remaps UI mode keys → PersonalityResponses keys
const MODE_TO_PERSONALITY = {
  analytical: 'romantic',  // 'romantic' key = analytical responses
  direct: 'sexy',           // 'sexy' key = direct responses
  unhinged: 'unhinged',
}

export default function CompanionChat({ session }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)
  const [activeMode, setActiveMode] = useState('analytical')
  const chatHistoryRef = useRef(null)

  const [characterAnim, setCharacterAnim] = useState('idle')

  // Feature toggles
  const [features, setFeatures] = useState({
    spiritFamiliar: true,
    neuralPulse: false,
    phaseShift: false,
    timeEcho: false,
  })

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDrawModeActive, setIsDrawModeActive] = useState(false)

  // Parasite Engine — tier-aware behavior + deflection system
  const {
    applyTierBehavior,
    recordEngagement,
    idleAnimationSpeed,
    colorTemperature,
  } = useSIYATierBehavior()

  // Load voices asynchronously (Chrome needs this)
  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices()
    load()
    window.speechSynthesis.onvoiceschanged = load
  }, [])

  // Load chat history
  useEffect(() => {
    if (!session?.user?.id) return
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages').select('*').eq('user_id', session.user.id).eq('source', 'aria')
        .order('created_at', { ascending: true })

      if (data && data.length > 0) setMessages(data)
      else setMessages([{
        id: 'initial',
        text: "System online. SHUNAoperational. How can I assist you?",
        sender: 'ai'
      }])
    }
    fetchMessages()
  }, [session])

  // Auto-scroll
  useEffect(() => {
    if (chatHistoryRef.current) chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
  }, [messages, isTyping])

  // ── Speak with feminine voice ────────────────────────────────────────────
  const speakText = (text) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = getFeminineVoice()
    if (voice) utterance.voice = voice

    // Gentle feminine parameters — high pitch makes it sound robotic, keep 1.1 max
    utterance.pitch = 1.12
    utterance.rate = activeMode === 'unhinged' ? 1.08 : activeMode === 'direct' ? 0.97 : 1.02
    utterance.volume = 1.0

    window.speechSynthesis.speak(utterance)
  }

  const handleSpellCast = (spellType) => {
    setFeatures(prev => ({ ...prev, neuralPulse: true }))
    speakText(`Energy reconfigured. ${spellType} protocol activated.`)
    setCharacterAnim('dance')
    setIsDrawModeActive(false)
    setTimeout(() => {
      setFeatures(prev => ({ ...prev, neuralPulse: false }))
      setCharacterAnim('idle')
    }, 5000)
  }

  const toggleFeature = (feat) => {
    setFeatures(prev => ({ ...prev, [feat]: !prev[feat] }))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputText.trim()) return

    window.speechSynthesis.cancel()

    const newUserMsg = { id: Date.now(), text: inputText, sender: 'user' }
    setMessages(prev => [...prev, newUserMsg])

    if (session?.user?.id) {
      supabase.from('messages').insert([{
        user_id: session.user.id, text: inputText, sender: 'user', source: 'aria'
      }]).then(({ error }) => { if (error) console.error('Save user msg error:', error) })
    }

    const capturedInput = inputText
    setInputText('')
    setIsTyping(true)

    setTimeout(async () => {
      const emotionKey = detectSiyaEmotion(capturedInput)
      const personalityKey = MODE_TO_PERSONALITY[activeMode]

      let generatedText = "Processing error. Rebooting language modules.";
      try {
        const API_BASE = "https://emotional-ai-18zi.onrender.com";
        // Send full chat history to the backend AI Router
        const apiRes = await fetch(`${API_BASE}/api/ai/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, newUserMsg].map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            })),
            emotion: emotionKey,
            mode: activeMode
          })
        });

        if (apiRes.ok) {
          const aiData = await apiRes.json();
          generatedText = aiData.text;
        } else {
          console.error("AI API Error:", await apiRes.text());
        }
      } catch (err) {
        console.error("Failed to connect to AI Router:", err);
      }

      // Record engagement + apply tier-based modifications / deflection
      await recordEngagement(capturedInput)
      const { response: tieredText } = applyTierBehavior(capturedInput, generatedText)

      const aiReply = { id: Date.now() + 1, text: tieredText, sender: 'ai' }
      setMessages(prev => [...prev, aiReply])
      setIsTyping(false)

      if (session?.user?.id) {
        supabase.from('messages').insert([{
          user_id: session.user.id, text: tieredText, sender: 'ai', source: 'aria'
        }]).then(({ error }) => { if (error) console.error('Save AI reply error:', error) })
      }

      speakText(tieredText)

      if (capturedInput.toLowerCase().includes('dance')) setCharacterAnim('dance')
      else if (emotionKey === 'happy') setCharacterAnim('yes')
      else if (emotionKey === 'angry') setCharacterAnim('arguing')
      else if (emotionKey === 'sad') setCharacterAnim('look away')
      else if (emotionKey === 'love') setCharacterAnim('thoughtful')
      else setCharacterAnim('talk')

      const readingTime = Math.max(3000, tieredText.length * 100)
      setTimeout(() => setCharacterAnim('idle'), readingTime)

    }, 1200 + Math.random() * 600)
  }

  return (
    <ParasiteSIYA>
      <div className="companion-container">
        {/* 3D Scene — full viewport background */}
        <div className="avatar-section">
          <Companion3D
            companion="siya"
            characterAnim={characterAnim}
            messages={messages}
            features={features}
          />
        </div>

        {/* Draw mode rune canvas overlay */}
        <RuneCanvas onSpellCast={handleSpellCast} isDrawModeActive={isDrawModeActive} />

        {/* Header */}
        <div className="pro-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <span style={{ opacity: 0.5 }}>←</span> HUB
          </button>
          <div className="status-indicator">
            <div className={`status-dot ${isTyping ? 'pulsing' : ''}`} />
            SHUNA· {isTyping ? 'THINKING...' : 'ONLINE'}
          </div>
        </div>

        {/* Effects menu button */}
        <button
          className={`magic-menu-btn ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="SHUNAeffects menu"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.5" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="magic-menu-panel">
            <div className="menu-label">SHUNAABILITIES</div>

            {/* Rune Cast — the only active ability */}
            <button
              className={`magic-toggle ${isDrawModeActive ? 'active' : ''}`}
              onClick={() => { setIsDrawModeActive(!isDrawModeActive); if (!isDrawModeActive) setIsMenuOpen(false) }}
            >
              <span className="toggle-icon">✍️</span>
              <div className="toggle-text">
                <span className="toggle-name">{isDrawModeActive ? 'CANCEL DRAW' : 'RUNE CAST'}</span>
                <span className="toggle-desc">Draw symbols to command Siya</span>
              </div>
            </button>
            
            <div className="menu-label" style={{ marginTop: '16px' }}>SIYA'S MIND</div>
            
            <button className="magic-toggle" onClick={() => navigate('/siya/journal')}>
              <span className="toggle-icon">📓</span>
              <div className="toggle-text">
                <span className="toggle-name">JOURNAL</span>
                <span className="toggle-desc">Track your mood with Siya</span>
              </div>
            </button>

            <button className="magic-toggle" onClick={() => navigate('/siya/insights')}>
              <span className="toggle-icon">🔮</span>
              <div className="toggle-text">
                <span className="toggle-name">INSIGHTS</span>
                <span className="toggle-desc">Your emotional profile</span>
              </div>
            </button>

            <button className="magic-toggle" onClick={() => navigate('/siya/wellness')}>
              <span className="toggle-icon">💊</span>
              <div className="toggle-text">
                <span className="toggle-name">WELLNESS</span>
                <span className="toggle-desc">Daily check-in with Siya</span>
              </div>
            </button>

            <button className="magic-toggle" onClick={() => navigate('/siya/diary')}>
              <span className="toggle-icon">📖</span>
              <div className="toggle-text">
                <span className="toggle-name">SIYA DIARY</span>
                <span className="toggle-desc">Siya's private thoughts</span>
              </div>
            </button>

            <button className="magic-toggle" onClick={() => navigate('/siya/memory')}>
              <span className="toggle-icon">⭐</span>
              <div className="toggle-text">
                <span className="toggle-name">SIYA'S MEMORY</span>
                <span className="toggle-desc">3D memory constellation</span>
              </div>
            </button>
          </div>
        )}

        {/* Chat panel */}
        <div className="chat-section">
          <div className="chat-history" ref={chatHistoryRef}>
            {messages.map(msg => (
              <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                <div className="bubble-content">{msg.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble ai typing">
                <div className="bubble-content">
                  <div className="dot" /><div className="dot" /><div className="dot" />
                </div>
              </div>
            )}
          </div>

          <div className="chat-controls-container">
            {/* Mode selector */}
            <div className="personality-bar">
              {MODES.map(mode => (
                <button
                  key={mode.key}
                  className={`persona-btn ${activeMode === mode.key ? 'active' : ''}`}
                  style={activeMode === mode.key ? { color: mode.color, borderBottomColor: mode.color } : {}}
                  onClick={() => setActiveMode(mode.key)}
                  title={mode.desc}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
              <button
                type="button"
                className={`voice-btn ${isVoiceEnabled ? 'active' : ''}`}
                onClick={() => { setIsVoiceEnabled(!isVoiceEnabled); window.speechSynthesis.cancel() }}
                title={isVoiceEnabled ? 'Mute Siya' : 'Unmute Siya'}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                  {isVoiceEnabled ? (
                    <path d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6 M17 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              </button>
              <input
                type="text"
                placeholder={`Talk to SHUNA[${MODES.find(m => m.key === activeMode)?.label}]...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button type="submit" className="send-btn" disabled={!inputText.trim()}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </ParasiteSIYA>
  )
}
