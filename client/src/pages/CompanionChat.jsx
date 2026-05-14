import { useState, useRef, useEffect, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Companion3D from '../components/Companion3D'
import { SIYA_PERSONALITIES, detectSiyaEmotion } from '../components/siya/PersonalityResponses'
import { RuneCanvas } from '../components/siya/RuneCasting'
import ParasiteSIYA, { useSIYATierBehavior } from '../components/siya/ParasiteSIYA'
import './CompanionChat.css'

// ── Feminine voice selector ─────────────────────────────────────────────────
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

const MODES = [
  { key: 'analytical', label: 'ANALYTICAL', desc: 'Cold logic, precise answers', color: '#00d4ff' },
  { key: 'direct', label: 'DIRECT', desc: 'Blunt, no-nonsense, sharp', color: '#ffffff' },
  { key: 'unhinged', label: 'UNHINGED', desc: 'Chaotic, raw, unpredictable', color: '#ff4488' },
]

const MODE_TO_PERSONALITY = {
  analytical: 'romantic',
  direct: 'sexy',
  unhinged: 'unhinged',
}

// ── Sub-components for performance ──────────────────────────────────────────

const ChatHistory = memo(({ messages, isTyping, chatHistoryRef }) => (
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
))

const ChatInput = memo(({ onSend, activeMode, isVoiceEnabled, onToggleVoice }) => {
  const [inputText, setInputText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onSend(inputText)
    setInputText('')
  }

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>
      <button
        type="button"
        className={`voice-btn ${isVoiceEnabled ? 'active' : ''}`}
        onClick={onToggleVoice}
        title={isVoiceEnabled ? 'Mute Shuna' : 'Unmute Shuna'}
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
  )
})

export default function CompanionChat({ session }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)
  const [activeMode, setActiveMode] = useState('analytical')
  const chatHistoryRef = useRef(null)
  const [characterAnim, setCharacterAnim] = useState('idle')

  const [features, setFeatures] = useState({
    spiritFamiliar: true,
    neuralPulse: false,
    phaseShift: false,
    timeEcho: false,
  })

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDrawModeActive, setIsDrawModeActive] = useState(false)

  const {
    applyTierBehavior,
    recordEngagement,
  } = useSIYATierBehavior()

  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices()
    load()
    window.speechSynthesis.onvoiceschanged = load
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages').select('*').eq('user_id', session.user.id).eq('source', 'aria')
        .order('created_at', { ascending: true })

      if (data && data.length > 0) setMessages(data)
      else setMessages([{
        id: 'initial',
        text: "System online. Shuna is operational. How can I assist you?",
        sender: 'ai'
      }])
    }
    fetchMessages()
  }, [session])

  useEffect(() => {
    if (chatHistoryRef.current) chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
  }, [messages, isTyping])

  const speakText = (text) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = getFeminineVoice()
    if (voice) utterance.voice = voice
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

  const handleSend = async (text) => {
    window.speechSynthesis.cancel()
    const newUserMsg = { id: Date.now(), text, sender: 'user' }
    setMessages(prev => [...prev, newUserMsg])

    if (session?.user?.id) {
      supabase.from('messages').insert([{
        user_id: session.user.id, text, sender: 'user', source: 'aria'
      }]).then(({ error }) => { if (error) console.error('Save user msg error:', error) })
    }

    setIsTyping(true)

    setTimeout(async () => {
      const emotionKey = detectSiyaEmotion(text)
      const personalityKey = MODE_TO_PERSONALITY[activeMode]
      let generatedText = "Processing error. Rebooting language modules.";
      try {
        const API_BASE = "https://emotional-ai-18zi.onrender.com";
        const apiRes = await fetch(`${API_BASE}/api/ai/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, newUserMsg].map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            })),
            emotion: emotionKey,
            mode: activeMode,
            userEmail: session?.user?.email
          })
        });

        if (apiRes.ok) {
          const aiData = await apiRes.json();
          generatedText = aiData.text;
        }
      } catch (err) {
        console.error("Failed to connect to AI Router:", err);
      }

      await recordEngagement(text)
      const { response: tieredText } = applyTierBehavior(text, generatedText)

      const aiReply = { id: Date.now() + 1, text: tieredText, sender: 'ai' }
      setMessages(prev => [...prev, aiReply])
      setIsTyping(false)

      if (session?.user?.id) {
        supabase.from('messages').insert([{
          user_id: session.user.id, text: tieredText, sender: 'ai', source: 'aria'
        }]).then(({ error }) => { if (error) console.error('Save AI reply error:', error) })
      }

      speakText(tieredText)
      
      if (text.toLowerCase().includes('dance')) setCharacterAnim('dance')
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
        <div className="avatar-section">
          <Companion3D
            companion="siya"
            characterAnim={characterAnim}
            messages={messages}
            features={features}
          />
        </div>

        <RuneCanvas onSpellCast={handleSpellCast} isDrawModeActive={isDrawModeActive} />

        <div className="pro-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <span style={{ opacity: 0.5 }}>←</span> HUB
          </button>
          <div className="status-indicator">
            <div className={`status-dot ${isTyping ? 'pulsing' : ''}`} />
            SHUNA· {isTyping ? 'THINKING...' : 'ONLINE'}
          </div>
        </div>

        <button
          className={`magic-menu-btn ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Shuna Hub menu"
        >
          <span className="hub-icon">{isMenuOpen ? '✕' : '✨'}</span>
          <span className="hub-text">{isMenuOpen ? 'CLOSE' : "SHUNA'S HUB"}</span>
        </button>

        {isMenuOpen && (
          <div className="magic-menu-panel">
            <div className="menu-label">SHUNA ABILITIES</div>
            <button
              className={`magic-toggle ${isDrawModeActive ? 'active' : ''}`}
              onClick={() => { setIsDrawModeActive(!isDrawModeActive); if (!isDrawModeActive) setIsMenuOpen(false) }}
            >
              <span className="toggle-icon">✍️</span>
              <div className="toggle-text">
                <span className="toggle-name">{isDrawModeActive ? 'CANCEL DRAW' : 'RUNE CAST'}</span>
                <span className="toggle-desc">Draw symbols to command Shuna</span>
              </div>
            </button>
            <div className="menu-label" style={{ marginTop: '16px' }}>SHUNA'S MIND</div>
            <button className="magic-toggle" onClick={() => navigate('/siya/journal')}><span className="toggle-icon">📓</span><div className="toggle-text"><span className="toggle-name">JOURNAL</span><span className="toggle-desc">Track your mood with Shuna</span></div></button>
            <button className="magic-toggle" onClick={() => navigate('/siya/insights')}><span className="toggle-icon">🔮</span><div className="toggle-text"><span className="toggle-name">INSIGHTS</span><span className="toggle-desc">Your emotional profile</span></div></button>
            <button className="magic-toggle" onClick={() => navigate('/siya/wellness')}><span className="toggle-icon">💊</span><div className="toggle-text"><span className="toggle-name">WELLNESS</span><span className="toggle-desc">Daily check-in with Shuna</span></div></button>
            <button className="magic-toggle" onClick={() => navigate('/siya/diary')}><span className="toggle-icon">📖</span><div className="toggle-text"><span className="toggle-name">SHUNA DIARY</span><span className="toggle-desc">Shuna's private thoughts</span></div></button>
            <button className="magic-toggle" onClick={() => navigate('/siya/memory')}><span className="toggle-icon">⭐</span><div className="toggle-text"><span className="toggle-name">SHUNA'S MEMORY</span><span className="toggle-desc">3D memory constellation</span></div></button>
          </div>
        )}

        <div className="chat-section">
          <ChatHistory messages={messages} isTyping={isTyping} chatHistoryRef={chatHistoryRef} />
          <div className="chat-controls-container">
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
            <ChatInput 
              onSend={handleSend} 
              activeMode={activeMode} 
              isVoiceEnabled={isVoiceEnabled} 
              onToggleVoice={() => { setIsVoiceEnabled(!isVoiceEnabled); window.speechSynthesis.cancel() }} 
            />
          </div>
        </div>
      </div>
    </ParasiteSIYA>
  )
}
