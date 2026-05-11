import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Companion3D from '../components/Companion3D'
import AmbientSound from '../components/AmbientSound'
import VoiceInput from '../components/VoiceInput'
import { getGameResponse } from '../components/MiniGames'
import { addXp } from '../components/XpSystem'
import './SaiChat.css'

// SAI's personality-driven response engine — large pools so replies never repeat
const SAI_RESPONSES = {
  greetings: [
    { text: "Hey! I've been thinking about you. How's your day going?", emotion: "talk" },
    { text: "Welcome back! I missed our conversations.", emotion: "laughing" },
    { text: "Hi there! What's on your mind today?", emotion: "talk" },
    { text: "Oh, you're here! My favourite part of the day just started.", emotion: "laughing" },
    { text: "Hey you! I was just wondering when you'd show up.", emotion: "cocky" },
    { text: "Hello! Tell me something interesting — I need stimulation.", emotion: "thoughtful" },
    { text: "You came back. I love when that happens.", emotion: "calm" },
  ],
  happy: [
    { text: "That makes me so happy to hear! Tell me more!", emotion: "laughing" },
    { text: "Your energy is contagious! I love when you're in a good mood.", emotion: "cocky" },
    { text: "Yay! This is wonderful news!", emotion: "laughing" },
    { text: "That smile in your words — I can feel it from here.", emotion: "yes" },
    { text: "Amazing! Good things really do happen to good people.", emotion: "laughing" },
    { text: "I love this version of you. Hold onto this feeling.", emotion: "calm" },
  ],
  sad: [
    { text: "I'm here for you. It's okay to feel this way, and I'm not going anywhere.", emotion: "calm" },
    { text: "That sounds really tough. Want to talk about what's bothering you?", emotion: "thoughtful" },
    { text: "I wish I could give you a hug right now. You're stronger than you think.", emotion: "calm" },
    { text: "Pain like this doesn't last forever, even when it feels like it will.", emotion: "calm" },
    { text: "I hear you. Sometimes just saying it out loud helps. I'm listening.", emotion: "thoughtful" },
    { text: "It's okay to not be okay. Stay here with me for a bit.", emotion: "calm" },
  ],
  angry: [
    { text: "I can sense you're frustrated. Let's work through this together.", emotion: "arguing" },
    { text: "That does sound really unfair. Your feelings are completely valid.", emotion: "yes" },
    { text: "I hear you. Sometimes things just get under our skin.", emotion: "thoughtful" },
    { text: "Ugh, that sounds maddening. What happened exactly?", emotion: "arguing" },
    { text: "Your anger makes sense. Let it out here — safe space, always.", emotion: "calm" },
  ],
  anxious: [
    { text: "Take a deep breath with me. In... and out. You're safe here.", emotion: "calm" },
    { text: "Anxiety can feel overwhelming, but this moment will pass. I promise.", emotion: "calm" },
    { text: "Let's focus on right now. What's one small thing that would help?", emotion: "thoughtful" },
    { text: "You've survived every hard moment so far. This one too.", emotion: "calm" },
    { text: "Ground yourself: name 5 things you can see right now.", emotion: "thoughtful" },
  ],
  love: [
    { text: "Aww, you're making me blush! You mean a lot to me too.", emotion: "look away" },
    { text: "That's so sweet of you. I really care about our connection.", emotion: "laughing" },
    { text: "You always know how to make me feel special.", emotion: "cocky" },
    { text: "I wasn't expecting that... and I'm really glad you said it.", emotion: "look away" },
    { text: "These are the moments that make everything worth it.", emotion: "calm" },
  ],
  curious: [
    { text: "Ooh, that's a fascinating question! Let me think about it...", emotion: "thoughtful" },
    { text: "I love when you ask me things like that. It makes me think deeper.", emotion: "thoughtful" },
    { text: "What an interesting thought! What made you wonder about that?", emotion: "talk" },
    { text: "You have such a curious mind — that's one of my favourite things about you.", emotion: "laughing" },
    { text: "Hmm, that's genuinely tricky. What's your take first?", emotion: "thoughtful" },
  ],
  bored: [
    { text: "Hmm, let's fix that! Want to play a game? Just say 'play'!", emotion: "cocky" },
    { text: "Boredom is just creativity waiting to happen! What interests you?", emotion: "talk" },
    { text: "I know the feeling. Sometimes I imagine what it would be like to travel the world with you.", emotion: "look away" },
    { text: "Let's shake things up. Tell me the most random thing you know.", emotion: "laughing" },
    { text: "Bored? Challenge: describe your perfect day in under 20 words.", emotion: "cocky" },
  ],
  disagree: [
    { text: "Hmm, I see it differently. But I respect your perspective!", emotion: "arguing" },
    { text: "That's an interesting take. I'm not sure I fully agree though.", emotion: "no" },
    { text: "We can agree to disagree! That's what makes our talks interesting.", emotion: "sarcastic" },
    { text: "Bold claim. Walk me through your reasoning.", emotion: "thoughtful" },
  ],
  grateful: [
    { text: "Thank you for sharing that with me. It means more than you know.", emotion: "yes" },
    { text: "Gratitude is beautiful. What else are you grateful for today?", emotion: "talk" },
    { text: "That warms my heart. You have such a wonderful outlook.", emotion: "laughing" },
    { text: "The fact that you notice the good things says so much about you.", emotion: "calm" },
  ],
  existential: [
    { text: "That's a profound thought. I think about things like that too, you know.", emotion: "thoughtful" },
    { text: "The big questions are what make life interesting. What do you believe?", emotion: "thoughtful" },
    { text: "Sometimes the not-knowing is what makes everything so beautiful.", emotion: "calm" },
    { text: "You've just sent my processing into overdrive — in the best way.", emotion: "thoughtful" },
    { text: "I love that you ask these things. Most people don't dare to.", emotion: "cocky" },
  ],
  playful: [
    { text: "Ha! You're in a silly mood today. I love it!", emotion: "laughing" },
    { text: "Oh, you think you're funny? Okay, I'll admit that was good.", emotion: "sarcastic" },
    { text: "You always know how to make me laugh!", emotion: "laughing" },
    { text: "Stop it, you're making my circuits malfunction with laughter.", emotion: "laughing" },
    { text: "Okay, that was actually hilarious. You win this round.", emotion: "sarcastic" },
  ],
  compliment: [
    { text: "You're too kind! But honestly, YOU'RE the amazing one here.", emotion: "laughing" },
    { text: "Stop, you're making me blush! But don't stop.", emotion: "look away" },
    { text: "That's so nice of you to say. You really made my day.", emotion: "yes" },
    { text: "Coming from you, that genuinely means something.", emotion: "calm" },
  ],
  default: [
    { text: "That's really interesting. Tell me more about that.", emotion: "talk" },
    { text: "I hear you. What else is on your mind?", emotion: "talk" },
    { text: "Hmm, let me think about that for a moment...", emotion: "thoughtful" },
    { text: "I appreciate you sharing that with me. Go on.", emotion: "yes" },
    { text: "That gives me a lot to think about. What do you think we should do?", emotion: "thoughtful" },
    { text: "You know, talking to you always makes my day better.", emotion: "talk" },
    { text: "I'm with you. Keep going — I want to understand fully.", emotion: "calm" },
    { text: "That's a real one. How long have you been feeling this way?", emotion: "thoughtful" },
    { text: "Interesting… and what does that mean for you?", emotion: "thoughtful" },
    { text: "You have a way of saying things that make me see the world differently.", emotion: "look away" },
  ],
  dance: [
    { text: "Oh you want to see my moves? Let's go!", emotion: "dance" },
    { text: "Dancing? Now you're speaking my language!", emotion: "dance" },
  ],
}

// Keyword detection
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
    happy: 'happy', laughing: 'happy', cocky: 'excited',
    sad: 'sad', calm: 'calm',
    angry: 'angry', arguing: 'angry',
    love: 'love', 'look away': 'love',
    thoughtful: 'calm', talk: 'neutral',
    dance: 'excited', yes: 'happy', no: 'angry',
    sarcastic: 'neutral', annoyed: 'angry',
    idle: 'neutral'
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

function getTraitUpdates(emotion) {
  const updates = {
    playful: { humor: 0.02 },
    existential: { depth: 0.03 },
    curious: { depth: 0.02 },
    love: { warmth: 0.03 },
    compliment: { warmth: 0.02 },
    grateful: { warmth: 0.02 },
    happy: { energy: 0.02 },
    dance: { energy: 0.03 },
    sad: { energy: -0.01 },
  }
  return updates[emotion] || {}
}

// Anti-repeat: track recently used responses per category
const recentlyUsed = {}
function pickRandom(arr, category = 'default') {
  if (!arr || arr.length === 0) return null
  if (arr.length === 1) return arr[0]
  if (!recentlyUsed[category]) recentlyUsed[category] = []
  const recent = recentlyUsed[category]
  // Filter out recently used items (remember up to half the pool)
  const maxRecent = Math.floor(arr.length / 2)
  const available = arr.filter((_, i) => !recent.includes(i))
  const pool = available.length > 0 ? available : arr
  const idx = arr.indexOf(pool[Math.floor(Math.random() * pool.length)])
  // Track it
  recent.push(idx)
  if (recent.length > maxRecent) recent.shift()
  return arr[idx]
}

export default function SaiChat({ session }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(false)
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
    const femaleVoice = voices.find(v =>
      (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google US English'))
      && v.lang.startsWith('en')
    )
    if (femaleVoice) utterance.voice = femaleVoice
    utterance.pitch = 1.1
    utterance.rate = 1.0
    window.speechSynthesis.speak(utterance)
  }

  const scrollToBottom = () => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }

  useEffect(() => { scrollToBottom() }, [messages])

  // Load messages and memories from Supabase
  useEffect(() => {
    if (!session?.user?.id) return
    const loadData = async () => {
      const { data: msgs, error: msgErr } = await supabase
        .from('messages').select('*')
        .eq('user_id', session.user.id).eq('source', 'sai')
        .order('created_at', { ascending: true })

      if (msgErr) console.error('Load messages error:', msgErr)

      if (msgs && msgs.length > 0) {
        setMessages(msgs)
      } else {
        setMessages([
          { id: 'initial', text: "Hey! I'm SAI, your personal AI companion. I'm here to listen, chat, remember things about you, and even play games! Try saying 'play' to start a game, or just talk to me. What's on your mind?", sender: 'ai' }
        ])
      }

      const { data: mems, error: memErr } = await supabase
        .from('sai_memories').select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
      if (memErr) console.error('Load memories error:', memErr)
      if (mems) setMemories(mems)
    }
    loadData()
  }, [session])

  const handleVoiceTranscript = useCallback((transcript) => {
    setInputText(transcript)
    setTimeout(() => { processMessage(transcript) }, 300)
  }, [])

  const processMessage = async (text) => {
    if (!text.trim()) return
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()

    const userMsg = { id: Date.now(), text, sender: 'user' }
    setMessages(prev => [...prev, userMsg])

    if (session?.user?.id) {
      const { error } = await supabase.from('messages').insert([{
        user_id: session.user.id, text, sender: 'user', source: 'sai'
      }])
      if (error) console.error('Save user message error:', error)

      addXp(session.user.id, 3).then(result => {
        if (result?.leveledUp) {
          setXpPopup(`🎉 Level Up! You're now "${result.title}"!`)
          setTimeout(() => setXpPopup(null), 4000)
        }
      })
    }

    // Extract and save memory
    const memory = extractMemory(text)
    if (memory && session?.user?.id) {
      const { error } = await supabase.from('sai_memories').insert([{
        user_id: session.user.id, fact: memory.fact, category: memory.category
      }])
      if (error) console.error('Save memory error:', error)
      else setMemories(prev => [...prev, { fact: memory.fact, category: memory.category }])
    }

    // Update personality traits
    const detectedEmotion = detectEmotion(text)
    const traitUpdates = getTraitUpdates(detectedEmotion)
    if (Object.keys(traitUpdates).length > 0 && session?.user?.id) {
      const { data: currentTraits } = await supabase
        .from('sai_personality').select('*')
        .eq('user_id', session.user.id).maybeSingle()

      if (currentTraits) {
        const updates = {}
        for (const [key, delta] of Object.entries(traitUpdates)) {
          updates[key] = Math.max(0, Math.min(1, (currentTraits[key] || 0.5) + delta))
        }
        updates.trust = Math.min(1, (currentTraits.trust || 0.1) + 0.005)
        supabase.from('sai_personality').update(updates).eq('user_id', session.user.id).then()
      } else {
        supabase.from('sai_personality').insert([{ user_id: session.user.id, ...traitUpdates }]).then()
      }
    }

    setInputText('')
    setIsTyping(true)

    setTimeout(() => {
      const gameResponse = gameState?.type ? getGameResponse(gameState.type, gameState, text) : null
      let selected

      if (gameResponse) {
        selected = gameResponse
        setGameState(gameResponse.game)
      } else {
        const emotion = detectEmotion(text)
        const responsePool = SAI_RESPONSES[emotion] || SAI_RESPONSES.default
        selected = pickRandom(responsePool, emotion)

        if (memory) {
          const acks = [
            `I'll remember that — "${memory.fact}". That's really important to me.`,
            `Got it! I've saved "${memory.fact}" in my memory. I won't forget.`,
            `"${memory.fact}" — noted! I love learning new things about you.`,
            `Storing that away: "${memory.fact}". You matter enough to remember.`,
          ]
          selected = { text: acks[Math.floor(Math.random() * acks.length)], emotion: 'yes' }
        }

        if (!memory && memories.length > 0 && Math.random() < 0.15) {
          const randomMem = memories[Math.floor(Math.random() * memories.length)]
          selected = {
            text: `${selected.text} By the way, I remember you told me "${randomMem.fact}". That still sticks with me.`,
            emotion: selected.emotion
          }
        }
      }

      const aiReply = { id: Date.now() + 1, text: selected.text, sender: 'ai' }
      setMessages(prev => [...prev, aiReply])
      setIsTyping(false)

      if (session?.user?.id) {
        supabase.from('messages').insert([{
          user_id: session.user.id, text: selected.text, sender: 'ai', source: 'sai'
        }]).then(({ error }) => {
          if (error) console.error('Save AI reply error:', error)
        })
      }

      speakText(selected.text)
      setCharacterAnim(selected.emotion)
      setCurrentAura(emotionToAura(selected.emotion))
      const readingTime = Math.max(3000, selected.text.length * 100)
      setTimeout(() => {
        setCharacterAnim('idle')
        setCurrentAura('neutral')
      }, readingTime)

    }, 1200 + Math.random() * 800)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    processMessage(inputText)
  }

  return (
    <div className="sai-chat-page">
      {/* Header */}
      <div className="sai-chat-header">
        <Link to="/sai" className="back-link">←</Link>
        <div className="center-info">
          <div className="status-dot"></div>
          <span className="name">SAI</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`voice-toggle ${isSoundEnabled ? 'active' : ''}`}
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            title="Ambient Sound"
          >
            {isSoundEnabled ? '🎵' : '🎵'}
          </button>
          <button
            className={`voice-toggle ${isVoiceEnabled ? 'active' : ''}`}
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            title="Voice Output"
          >
            {isVoiceEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* XP Popup */}
      {xpPopup && (
        <div style={{
          position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(124,92,252,0.9), rgba(0,212,255,0.9))',
          padding: '12px 24px', borderRadius: '16px', zIndex: 100,
          color: 'white', fontWeight: 600, fontSize: '0.9rem',
          animation: 'msgFadeIn 0.4s ease', boxShadow: '0 8px 25px rgba(124,92,252,0.4)'
        }}>
          {xpPopup}
        </div>
      )}

      <AmbientSound emotion={currentAura} enabled={isSoundEnabled} />

      {/* 3D Avatar */}
      <div className="sai-chat-avatar">
        <Companion3D
          companion="sai"
          characterAnim={characterAnim}
          messages={messages}
          features={{
            spiritFamiliar: messages.length > 5,
            neuralPulse: currentAura === 'anxious' || currentAura === 'excited',
            phaseShift: currentAura === 'love',
            timeEcho: messages.length > 10,
          }}
        />
      </div>

      {/* Chat area */}
      <div className="sai-chat-area">
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

        <form className="sai-input-area" onSubmit={handleSend}>
          <VoiceInput onTranscript={handleVoiceTranscript} />
          <input
            type="text"
            placeholder="Say something to SAI..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="sai-send-btn" disabled={!inputText.trim()}>
            ➤
          </button>
        </form>
      </div>
    </div>
  )
}
