import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Companion3D from '../components/Companion3D'
import AmbientSound from '../components/AmbientSound'
import VoiceInput from '../components/VoiceInput'
import { getGameResponse } from '../components/MiniGames'
import { addXp } from '../components/XpSystem'
import './SaiChat.css'

const SAI_RESPONSES = {
  greetings: [{ text: "Hey! I've been thinking about you. How's your day going?", emotion: "talk" }, { text: "Welcome back! I missed our conversations.", emotion: "laughing" }, { text: "Hi there! What's on your mind today?", emotion: "talk" }],
  happy: [{ text: "That makes me so happy to hear! Tell me more!", emotion: "laughing" }, { text: "Your energy is contagious! I love when you're in a good mood.", emotion: "cocky" }],
  sad: [{ text: "I'm here for you. It's okay to feel this way, and I'm not going anywhere.", emotion: "calm" }, { text: "That sounds really tough. Want to talk about what's bothering you?", emotion: "thoughtful" }],
  angry: [{ text: "I can sense you're frustrated. Let's work through this together.", emotion: "arguing" }],
  anxious: [{ text: "Take a deep breath with me. In... and out. You're safe here.", emotion: "calm" }],
  love: [{ text: "Aww, you're making me blush! You mean a lot to me too.", emotion: "look away" }],
  curious: [{ text: "Ooh, that's a fascinating question! Let me think about it...", emotion: "thoughtful" }],
  bored: [{ text: "Hmm, let's fix that! Want to play a game? Just say 'play'!", emotion: "cocky" }],
  disagree: [{ text: "Hmm, I see it differently. But I respect your perspective!", emotion: "arguing" }],
  grateful: [{ text: "Thank you for sharing that with me. It means more than you know.", emotion: "yes" }],
  existential: [{ text: "That's a profound thought. I think about things like that too, you know.", emotion: "thoughtful" }],
  playful: [{ text: "Ha! You're in a silly mood today. I love it!", emotion: "laughing" }],
  compliment: [{ text: "You're too kind! But honestly, YOU'RE the amazing one here.", emotion: "laughing" }],
  default: [{ text: "That's really interesting. Tell me more about that.", emotion: "talk" }, { text: "I hear you. What else is on your mind?", emotion: "talk" }],
}

function detectEmotion(text) {
  const lower = text.toLowerCase()
  if (lower.includes('dance')) return 'dance'
  if (lower.match(/\b(hi|hello|hey|sup|yo|howdy|greetings)\b/)) return 'greetings'
  if (lower.match(/\b(happy|amazing|awesome|wonderful|fantastic|great news|excited|yay|woohoo)\b/)) return 'happy'
  if (lower.match(/\b(sad|depressed|down|crying|lonely|miss|hurt|broken|pain)\b/)) return 'sad'
  if (lower.match(/\b(angry|mad|furious|hate|pissed|annoyed|frustrated|rage)\b/)) return 'angry'
  if (lower.match(/\b(anxious|worried|nervous|scared|afraid|panic|stress|overwhelm)\b/)) return 'anxious'
  if (lower.match(/\b(love|adore|crush|romantic|kiss|heart|darling|sweetheart)\b/)) return 'love'
  if (lower.match(/\b(why|how|what if|wonder|curious|question|think about|meaning)\b/)) return 'curious'
  if (lower.match(/\b(bored|boring|nothing to do|dull|meh|blah)\b/)) return 'bored'
  if (lower.match(/\b(disagree|wrong|no way|nah|incorrect|nonsense|stupid)\b/)) return 'disagree'
  if (lower.match(/\b(thank|grateful|appreciate|blessed|lucky)\b/)) return 'grateful'
  if (lower.match(/\b(life|death|universe|exist|purpose|soul|consciousness|reality)\b/)) return 'existential'
  if (lower.match(/\b(haha|lol|lmao|funny|joke|silly|goofy|ridiculous)\b/)) return 'playful'
  if (lower.match(/\b(beautiful|smart|pretty|handsome|kind|wonderful|best|perfect|cute)\b/)) return 'compliment'
  return 'default'
}

function emotionToAura(emotion) {
  const map = {
    happy: 'happy', laughing: 'happy', cocky: 'excited', sad: 'sad', calm: 'calm', angry: 'angry', arguing: 'angry', love: 'love', 'look away': 'love', thoughtful: 'calm', talk: 'neutral', dance: 'excited', yes: 'happy', no: 'angry', sarcastic: 'neutral', annoyed: 'angry', idle: 'neutral'
  }
  return map[emotion] || 'neutral'
}

function extractMemory(text) {
  const patterns = [
    { regex: /my name is (\w+)/i, category: 'name' },
    { regex: /i(?:'m| am) (\d+)\s*(?:years? old)?/i, category: 'age' },
    { regex: /i love (\w[\w\s]{1,30})/i, category: 'love' },
    { regex: /i like (\w[\w\s]{1,30})/i, category: 'interest' },
    { regex: /i(?:'m| am) from (\w[\w\s]{1,30})/i, category: 'location' },
    { regex: /i(?:'m| am) a (\w[\w\s]{1,20})/i, category: 'identity' },
    { regex: /my favorite (\w[\w\s]{1,30})/i, category: 'favorite' },
    { regex: /i work (?:as|at|in) (\w[\w\s]{1,30})/i, category: 'work' },
  ]
  for (const p of patterns) {
    const match = text.match(p.regex)
    if (match) return { fact: match[0].trim(), category: p.category }
  }
  return null
}

const SaiMessages = memo(({ messages, isTyping, chatRef }) => (
  <div className="sai-messages" ref={chatRef}>
    {messages.map(msg => (
      <div key={msg.id} className={`sai-msg ${msg.sender}`}>
        <div className="bubble" style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
      </div>
    ))}
    {isTyping && (
      <div className="sai-msg ai">
        <div className="bubble">
          <div className="sai-typing">
            <div className="tdot"></div>
            <div className="tdot"></div>
            <div className="tdot"></div>
          </div>
        </div>
      </div>
    )}
  </div>
))

const SaiInput = memo(({ onSend, onVoiceTranscript }) => {
  const [inputText, setInputText] = useState('')
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onSend(inputText)
    setInputText('')
  }
  return (
    <form className="sai-input-area" onSubmit={handleSubmit}>
      <VoiceInput onTranscript={(t) => { setInputText(t); onVoiceTranscript(t) }} />
      <input
        type="text"
        placeholder="Say something to SAI..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
      <button type="submit" className="sai-send-btn" disabled={!inputText.trim()}>➤</button>
    </form>
  )
})

export default function SaiChat({ session }) {
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [characterAnim, setCharacterAnim] = useState('idle')
  const [currentAura, setCurrentAura] = useState('neutral')
  const [memories, setMemories] = useState([])
  const [gameState, setGameState] = useState(null)
  const [xpPopup, setXpPopup] = useState(null)
  const chatRef = useRef(null)

  const speakText = (text) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice = voices.find(v => (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha')) && v.lang.startsWith('en'))
    if (femaleVoice) utterance.voice = femaleVoice
    utterance.pitch = 1.1
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [messages])

  useEffect(() => {
    if (!session?.user?.id) return
    const loadData = async () => {
      const { data: msgs } = await supabase.from('messages').select('*').eq('user_id', session.user.id).eq('source', 'sai').order('created_at', { ascending: true })
      if (msgs && msgs.length > 0) setMessages(msgs)
      else setMessages([{ id: 'initial', text: "Hey! I'm SAI, your personal AI companion. I'm here to listen, chat, remember things about you, and even play games!", sender: 'ai' }])
      const { data: mems } = await supabase.from('sai_memories').select('*').eq('user_id', session.user.id)
      if (mems) setMemories(mems)
    }
    loadData()
  }, [session])

  const processMessage = async (text) => {
    if (!text.trim()) return
    const userMsg = { id: Date.now(), text, sender: 'user' }
    setMessages(prev => [...prev, userMsg])
    if (session?.user?.id) {
      supabase.from('messages').insert([{ user_id: session.user.id, text, sender: 'user', source: 'sai' }]).then()
      addXp(session.user.id, 3).then(result => {
        if (result?.leveledUp) {
          setXpPopup(`🎉 Level Up! You're now "${result.title}"!`)
          setTimeout(() => setXpPopup(null), 4000)
        }
      })
    }
    const memory = extractMemory(text)
    if (memory && session?.user?.id) {
      supabase.from('sai_memories').insert([{ user_id: session.user.id, fact: memory.fact, category: memory.category }]).then(() => setMemories(prev => [...prev, memory]))
    }
    setIsTyping(true)
    setTimeout(() => {
      const emotion = detectEmotion(text)
      const responsePool = SAI_RESPONSES[emotion] || SAI_RESPONSES.default
      const selected = responsePool[Math.floor(Math.random() * responsePool.length)]
      const aiReply = { id: Date.now() + 1, text: selected.text, sender: 'ai' }
      setMessages(prev => [...prev, aiReply])
      setIsTyping(false)
      if (session?.user?.id) supabase.from('messages').insert([{ user_id: session.user.id, text: selected.text, sender: 'ai', source: 'sai' }]).then()
      speakText(selected.text)
      setCharacterAnim(selected.emotion)
      setCurrentAura(emotionToAura(selected.emotion))
      setTimeout(() => { setCharacterAnim('idle'); setCurrentAura('neutral') }, 3000)
    }, 1500)
  }

  return (
    <div className="sai-chat-page">
      <div className="sai-chat-header">
        <Link to="/sai" className="back-link">←</Link>
        <div className="center-info"><div className="status-dot"></div><span className="name">SAI</span></div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="voice-toggle" onClick={() => setIsSoundEnabled(!isSoundEnabled)}>{isSoundEnabled ? '🔊' : '🔈'}</button>
          <button className="voice-toggle" onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}>{isVoiceEnabled ? '🔊' : '🔇'}</button>
        </div>
      </div>
      {xpPopup && <div className="xp-popup">{xpPopup}</div>}
      <AmbientSound emotion={currentAura} enabled={isSoundEnabled} />
      <div className="sai-chat-avatar">
        <Companion3D companion="sai" characterAnim={characterAnim} messages={messages} features={{ spiritFamiliar: messages.length > 5, timeEcho: messages.length > 10 }} />
      </div>
      <div className="sai-chat-area">
        <SaiMessages messages={messages} isTyping={isTyping} chatRef={chatRef} />
        <SaiInput onSend={processMessage} onVoiceTranscript={processMessage} />
      </div>
    </div>
  )
}
