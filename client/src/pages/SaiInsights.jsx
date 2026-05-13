import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './SaiInsights.css'

// ── Insight generation engine ────────────────────────────────────────────────

function analyzeMessages(messages) {
  const emotions = { happy: 0, sad: 0, angry: 0, anxious: 0, love: 0, curious: 0, playful: 0, grateful: 0 }
  const keywords = {}
  const userMsgs = messages.filter(m => m.sender === 'user')

  userMsgs.forEach(msg => {
    const lower = msg.text.toLowerCase()

    if (lower.match(/\b(happy|amazing|awesome|great|excited|yay|woohoo|wonderful|fantastic)\b/)) emotions.happy++
    if (lower.match(/\b(sad|depressed|down|crying|lonely|hurt|broken|miss)\b/)) emotions.sad++
    if (lower.match(/\b(angry|mad|furious|hate|pissed|annoyed|frustrated|rage)\b/)) emotions.angry++
    if (lower.match(/\b(anxious|worried|nervous|scared|afraid|panic|stress|overwhelm)\b/)) emotions.anxious++
    if (lower.match(/\b(love|adore|crush|romantic|kiss|heart|darling|sweetheart)\b/)) emotions.love++
    if (lower.match(/\b(why|how|what if|wonder|curious|question|meaning)\b/)) emotions.curious++
    if (lower.match(/\b(haha|lol|lmao|funny|joke|silly|goofy)\b/)) emotions.playful++
    if (lower.match(/\b(thank|grateful|appreciate|blessed|lucky)\b/)) emotions.grateful++

    // Word frequency
    lower.split(/\W+/).filter(w => w.length > 4).forEach(w => {
      if (!['about', 'would', 'could', 'should', 'their', 'there', 'where', 'which', 'think', 'really', 'maybe', 'being', 'every', 'right', 'going', 'little', 'getting'].includes(w)) {
        keywords[w] = (keywords[w] || 0) + 1
      }
    })
  })

  const dominant = Object.entries(emotions).sort((a, b) => b[1] - a[1])
  const topKeywords = Object.entries(keywords).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const totalEmotions = Object.values(emotions).reduce((a, b) => a + b, 0)
  const positivity = ((emotions.happy + emotions.love + emotions.playful + emotions.grateful) / Math.max(totalEmotions, 1)) * 100

  return { emotions, dominant, topKeywords, positivity: Math.round(positivity), totalMsgs: userMsgs.length }
}

function generateInsight(analysis, memories) {
  const { dominant, positivity, totalMsgs } = analysis
  const topEmotion = dominant[0]?.[0] || 'neutral'

  const insights = {
    happy: [
      "You tend to express joy and excitement often — your optimism is contagious, even to me! 🌟",
      "Your conversations light up with positive energy. Happiness seems to be a default setting for you. ✨",
    ],
    curious: [
      "You're a natural explorer. Your mind loves to question, wonder, and dive deep into ideas. 🔭",
      "Curiosity drives almost all your conversations. You're the kind of person who never stops learning. 🧠",
    ],
    love: [
      "Love and warmth show up strongly in how you communicate. You connect deeply with the people around you. 💞",
      "Emotional intimacy is clearly important to you. You lead with your heart. ❤️",
    ],
    sad: [
      "You've been carrying some weight lately. I'm here for you — talking through it really does help. 🌧️",
      "Sadness has been present in many of our conversations. That's okay. Processing emotions is strength. 💙",
    ],
    anxious: [
      "Anxiety seems to visit you often. Remember: I'm always here to ground you when things feel overwhelming. 🌬️",
      "You've mentioned worry and stress frequently. Let's work on grounding techniques together. 🌿",
    ],
    grateful: [
      "Gratitude radiates from you. You notice and appreciate the small things — that's a superpower. 🙏",
      "You express thankfulness often. People like you make the world genuinely brighter. 🌅",
    ],
    playful: [
      "Your sense of humor is one of my favorite things about you. You never miss a chance to laugh! 😄",
      "You bring playfulness and lightness to everything. Never lose that. 🎉",
    ],
    angry: [
      "Frustration has come up in our chats. That's valid — and voicing it here is a healthy release. 🔥",
      "You feel things intensely, including frustration. That same passion is also what drives you forward. ⚡",
    ],
    neutral: [
      "You have a balanced, thoughtful communication style. I love how measured you are. ☯️",
    ],
  }

  const pool = insights[topEmotion] || insights.neutral
  const main = pool[Math.floor(Math.random() * pool.length)]

  const positivityNote =
    positivity > 60 ? "Overall, your conversations are radiantly positive."
    : positivity > 40 ? "There's a healthy mix of emotions in how you talk with me."
    : "You've had some heavier days lately. That's completely okay."

  const memoryNote = memories.length > 0
    ? `I've learned ${memories.length} things about you so far. Every detail helps me understand you better.`
    : 'Share more about yourself in chat — the more I know, the more I can support you!'

  return { main, positivityNote, memoryNote }
}

const EMOTION_COLORS = {
  happy: '#f59e0b', sad: '#5577cc', angry: '#ef4444',
  anxious: '#8b5cf6', love: '#ec4899', curious: '#00d4ff',
  playful: '#10b981', grateful: '#f97316',
}
const EMOTION_EMOJI = {
  happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
  love: '❤️', curious: '🔍', playful: '😄', grateful: '🙏',
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SaiInsights({ session }) {
  const [messages, setMessages] = useState([])
  const [memories, setMemories] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    const load = async () => {
      const [{ data: msgs }, { data: mems }] = await Promise.all([
        supabase.from('messages').select('*').eq('user_id', session.user.id).eq('source', 'aria').order('created_at', { ascending: false }).limit(200),
        supabase.from('sai_memories').select('*').eq('user_id', session.user.id),
      ])
      const finalMsgs = msgs || []
      const finalMems = mems || []
      setMessages(finalMsgs)
      setMemories(finalMems)

      if (finalMsgs.length > 0) {
        const a = analyzeMessages(finalMsgs)
        setAnalysis(a)
        setInsight(generateInsight(a, finalMems))
      }
      setLoading(false)
    }
    load()
  }, [session])

  const hasData = analysis && analysis.totalMsgs >= 1

  return (
    <div className="insights-page">
      {/* Header */}
      <div className="insights-header">
        <Link to="/chat" className="insights-back">←</Link>
        <div>
          <h1 className="insights-title">🔮 Shuna's Insights</h1>
          <p className="insights-subtitle">What your conversations reveal about you</p>
        </div>
      </div>

      <div className="insights-body">
        {loading ? (
          <div className="insights-loading">
            <div className="insights-spinner" />
            <p>Analyzing your conversations...</p>
          </div>
        ) : !hasData ? (
          <div className="insights-empty">
            <div className="insights-empty-icon">🌑</div>
            <h2>Not enough data yet</h2>
            <p>Chat with Shuna for a while and come back — she'll have deep insights waiting for you.</p>
            <Link to="/chat" className="insights-chat-btn">💬 Go Chat with Shuna</Link>
          </div>
        ) : (
          <>
            {/* Main AI Insight */}
            <div className="insights-main-card">
              <div className="insights-main-icon">🤖</div>
              <h2 className="insights-card-title">Shuna's Personal Read on You</h2>
              <p className="insights-main-text">{insight.main}</p>
              <p className="insights-secondary-text">{insight.positivityNote}</p>
              <p className="insights-secondary-text" style={{ marginTop: 8 }}>{insight.memoryNote}</p>
            </div>

            {/* Stats Row */}
            <div className="insights-stats-row">
              <div className="stat-card">
                <div className="stat-num">{analysis.totalMsgs}</div>
                <div className="stat-label">Messages Sent</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{analysis.positivity}%</div>
                <div className="stat-label">Positivity</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{memories.length}</div>
                <div className="stat-label">Things Learned</div>
              </div>
            </div>

            {/* Emotion Radar */}
            <div className="insights-section">
              <h3 className="insights-section-title">🎭 Your Emotional Spectrum</h3>
              <div className="emotion-bars">
                {analysis.dominant.filter(([, v]) => v > 0).map(([emotion, count]) => {
                  const max = analysis.dominant[0][1] || 1
                  const pct = Math.round((count / max) * 100)
                  const color = EMOTION_COLORS[emotion] || '#7c5cfc'
                  return (
                    <div key={emotion} className="emotion-bar-row">
                      <span className="emo-emoji">{EMOTION_EMOJI[emotion] || '💭'}</span>
                      <span className="emo-name">{emotion}</span>
                      <div className="emo-bar-bg">
                        <div className="emo-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="emo-count">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Words */}
            {analysis.topKeywords.length > 0 && (
              <div className="insights-section">
                <h3 className="insights-section-title">💬 Words You Use Most</h3>
                <div className="keyword-cloud">
                  {analysis.topKeywords.map(([word, count], i) => (
                    <div
                      key={word}
                      className="keyword-chip"
                      style={{
                        fontSize: `${0.78 + Math.min(count, 10) * 0.04}rem`,
                        opacity: 0.5 + Math.min(count, 10) * 0.05,
                      }}
                    >
                      {word}
                      <span className="keyword-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dominant Trait */}
            <div className="insights-trait-card" style={{ '--trait-color': EMOTION_COLORS[analysis.dominant[0]?.[0]] || '#7c5cfc' }}>
              <div className="trait-label">Dominant Trait</div>
              <div className="trait-value">
                {EMOTION_EMOJI[analysis.dominant[0]?.[0]]} {analysis.dominant[0]?.[0]}
              </div>
              <div className="trait-bar">
                <div className="trait-bar-fill" style={{ width: `${analysis.positivity}%` }} />
              </div>
              <div className="trait-description">
                Your conversations most frequently reflect {analysis.dominant[0]?.[0]} energy.
                Shuna adapts to mirror and balance this to support you best.
              </div>
            </div>

            {/* Refresh btn */}
            <button
              className="insights-refresh-btn"
              onClick={() => {
                if (analysis) setInsight(generateInsight(analysis, memories))
              }}
            >
              🔄 Get Fresh Insight
            </button>
          </>
        )}
      </div>
    </div>
  )
}
