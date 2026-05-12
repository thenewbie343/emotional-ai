import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import MorphingRadarFull from '../components/MorphingRadarFull'
import './SaiWellness.css'

const QUESTIONS = [
  { id: 'sleep',   label: 'How did you sleep last night?',              icon: '🌙', scale: ['Terrible', 'Poor', 'Okay', 'Good', 'Great'] },
  { id: 'energy',  label: 'How is your energy level right now?',        icon: '⚡', scale: ['Drained', 'Low', 'Medium', 'High', 'Electric'] },
  { id: 'stress',  label: 'How stressed are you feeling?',              icon: '🌀', scale: ['Very High', 'High', 'Moderate', 'Low', 'None'] },
  { id: 'connect', label: 'Do you feel connected to others today?',     icon: '🤝', scale: ['Very Alone', 'Isolated', 'Neutral', 'Connected', 'Loved'] },
  { id: 'purpose', label: 'How purposeful does today feel?',            icon: '🎯', scale: ['Lost', 'Uncertain', 'Neutral', 'Meaningful', 'Inspired'] },
]

const AFFIRMATIONS = {
  high: [
    "You're radiating positive energy today — keep going! 🌟",
    "You're thriving. Take a moment to appreciate how far you've come. ✨",
    "Your resilience is showing. Today, everything is working in your favor. 💪",
  ],
  medium: [
    "Balance is a superpower. You're maintaining yours beautifully. 🌿",
    "Every small step forward counts. You're doing better than you think. 🐾",
    "Neutral can be the strongest foundation. Build from here. 🏗️",
  ],
  low: [
    "It's okay to have hard days. I'm here, and tomorrow is always a new chapter. 🌅",
    "You don't have to have it all together. Just breathing is enough for now. 🌬️",
    "Even in the storm, you are the eye — calm, centered, resilient. You've got this. 🌪️",
  ],
}

const TIPS = {
  sleep:   ['Try a 20-min wind-down routine before bed', 'Avoid screens 30 mins before sleep', 'Keep a consistent sleep schedule'],
  energy:  ['Take a 10-min walk to boost energy naturally', 'Stay hydrated — drink water now', 'Try 5 deep breaths to re-center'],
  stress:  ['Write down what\'s stressing you, then close the notebook', 'Name 3 things you can control right now', '4-7-8 breathing: inhale 4s, hold 7s, exhale 8s'],
  connect: ['Reach out to one person today, even just a text', 'Practice self-compassion — you are your own best companion', 'Being present with yourself IS connection'],
  purpose: ['Define one tiny win you can achieve today', 'Revisit your "why" — why does today matter to you?', 'Do one thing purely because it makes you happy'],
}

function ScoreBar({ value, max = 4 }) {
  const pct = (value / max) * 100
  const color = pct > 66 ? '#10b981' : pct > 33 ? '#f59e0b' : '#ef4444'
  return (
    <div className="score-bar-bg">
      <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

export default function SaiWellness({ session }) {
  const [step, setStep] = useState('check') // 'check' | 'result' | 'history'
  const [answers, setAnswers] = useState({})
  const [history, setHistory] = useState([])
  const [todayEntry, setTodayEntry] = useState(null)
  const [saving, setSaving] = useState(false)
  const [affirmation, setAffirmation] = useState('')

  useEffect(() => {
    if (!session?.user?.id) return
    const load = async () => {
      const { data } = await supabase
        .from('sai_wellness')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(14)
      if (data) {
        setHistory(data)
        const today = data.find(d => d.date_key === getTodayKey())
        if (today) {
          setTodayEntry(today)
          setStep('result')
          pickAffirmation(calcAvg(today))
        }
      }
    }
    load()
  }, [session])

  function calcAvg(entry) {
    const scores = QUESTIONS.map(q => entry[q.id] ?? 2)
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }

  function pickAffirmation(avg) {
    const pool = avg >= 3 ? AFFIRMATIONS.high : avg >= 2 ? AFFIRMATIONS.medium : AFFIRMATIONS.low
    setAffirmation(pool[Math.floor(Math.random() * pool.length)])
  }

  const allAnswered = QUESTIONS.every(q => answers[q.id] !== undefined)

  const handleSubmit = async () => {
    if (!allAnswered || !session?.user?.id) return
    setSaving(true)

    const payload = {
      user_id: session.user.id,
      date_key: getTodayKey(),
      ...answers,
      avg_score: calcAvg(answers),
    }

    const { data, error } = await supabase
      .from('sai_wellness')
      .upsert([payload], { onConflict: 'user_id,date_key' })
      .select()

    if (data?.[0] && !error) {
      setTodayEntry(data[0])
      setHistory(prev => [data[0], ...prev.filter(e => e.date_key !== getTodayKey())])
      pickAffirmation(payload.avg_score)
    }
    setSaving(false)
    setStep('result')
  }

  // Pick a random tip for a low-scored category
  const getLowTips = () => {
    if (!todayEntry) return []
    return QUESTIONS
      .filter(q => (todayEntry[q.id] ?? 2) <= 2)
      .slice(0, 2)
      .map(q => {
        const tip = TIPS[q.id][Math.floor(Math.random() * TIPS[q.id].length)]
        return { icon: q.icon, label: q.label, tip }
      })
  }

  return (
    <div className="wellness-page">
      {/* Header */}
      <div className="wellness-header">
        <Link to="/sai" className="wellness-back">←</Link>
        <div>
          <h1 className="wellness-title">💊 Wellness Center</h1>
          <p className="wellness-subtitle">Daily mental health check-in with SAI</p>
        </div>
        <button
          className={`wellness-tab ${step === 'history' ? 'active' : ''}`}
          onClick={() => setStep(step === 'history' ? (todayEntry ? 'result' : 'check') : 'history')}
        >
          📈 Trends
        </button>
      </div>

      {/* Check-in form */}
      {step === 'check' && (
        <div className="wellness-body">
          <div className="wellness-intro">
            <div className="wellness-orb">🌿</div>
            <h2>How are you really doing?</h2>
            <p>This check-in is private and helps SAI understand and support you better.</p>
          </div>

          <div className="wellness-questions">
            {QUESTIONS.map(q => (
              <div key={q.id} className="wellness-question">
                <div className="q-label">
                  <span className="q-icon">{q.icon}</span>
                  {q.label}
                </div>
                <div className="q-options">
                  {q.scale.map((label, i) => (
                    <button
                      key={i}
                      className={`q-option ${answers[q.id] === i ? 'selected' : ''}`}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: i }))}
                    >
                      <span className="q-num">{i + 1}</span>
                      <span className="q-opt-label">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            className={`wellness-submit ${allAnswered ? 'ready' : ''}`}
            onClick={handleSubmit}
            disabled={!allAnswered || saving}
          >
            {saving ? 'Saving...' : allAnswered ? '✨ Complete Check-in' : 'Answer all questions to continue'}
          </button>
        </div>
      )}

      {/* Result */}
      {step === 'result' && todayEntry && (
        <div className="wellness-body">
          <div className="result-card">
            <div className="result-score-ring">
              <svg viewBox="0 0 100 100" className="ring-svg">
                <circle cx="50" cy="50" r="40" className="ring-bg" />
                <circle
                  cx="50" cy="50" r="40"
                  className="ring-fill"
                  strokeDasharray={`${(calcAvg(todayEntry) / 4) * 251} 251`}
                  strokeDashoffset="0"
                  style={{
                    stroke: calcAvg(todayEntry) >= 3 ? '#10b981' : calcAvg(todayEntry) >= 2 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </svg>
              <div className="ring-score">
                <span className="ring-num">{Math.round((calcAvg(todayEntry) / 4) * 100)}</span>
                <span className="ring-label">/ 100</span>
              </div>
            </div>
            <h2 className="result-title">Today's Wellness Score</h2>
          </div>

          {/* Affirmation */}
          <div className="affirmation-card">
            <div className="affirmation-icon">💬</div>
            <p className="affirmation-text">{affirmation}</p>
            <span className="affirmation-source">— SAI</span>
          </div>

          {/* Breakdown */}
          <div className="wellness-breakdown">
            <h3 className="breakdown-title">Today's Breakdown</h3>
            {QUESTIONS.map(q => (
              <div key={q.id} className="breakdown-row">
                <span className="breakdown-icon">{q.icon}</span>
                <div className="breakdown-info">
                  <span className="breakdown-label">{q.scale[todayEntry[q.id] ?? 2]}</span>
                  <ScoreBar value={todayEntry[q.id] ?? 2} />
                </div>
                <span className="breakdown-cat">{q.label.split(' ').slice(0, 3).join(' ')}</span>
              </div>
            ))}
          </div>

          {/* Tips for low areas */}
          {getLowTips().length > 0 && (
            <div className="wellness-tips">
              <h3 className="tips-title">💡 SAI's Personalized Tips</h3>
              {getLowTips().map((tip, i) => (
                <div key={i} className="tip-card">
                  <span className="tip-icon">{tip.icon}</span>
                  <div>
                    <p className="tip-text">{tip.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="redo-btn" onClick={() => { setAnswers({}); setStep('check'); }}>
            🔄 Redo Check-in
          </button>
        </div>
      )}

      {/* Trend History */}
      {step === 'history' && (
        <div className="wellness-body">
          <h2 className="history-title">📊 Your Wellness Trends</h2>

          {history.length === 0 ? (
            <div className="wellness-empty">
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌱</div>
              <p>No history yet.</p>
              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '20px' }}>
                Complete your first check-in to start seeing your wellness trends here.
              </p>
              <button className="wellness-start-btn" onClick={() => setStep('check')}>
                Start First Check-in
              </button>
            </div>
          ) : (
            <>
              {/* Morphing Radar — only shown with real data */}
              <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#fff', fontSize: '1.1rem' }}>Emotional Time Machine</h3>
                <MorphingRadarFull snapshots={history.map(entry => ({
                  snapshot_date: entry.date_key || entry.created_at || new Date().toISOString(),
                  dimensions: {
                    Sleep:   Math.round(((entry.sleep   ?? 2) / 4) * 100),
                    Energy:  Math.round(((entry.energy  ?? 2) / 4) * 100),
                    Calm:    Math.round((1 - (entry.stress  ?? 2) / 4) * 100),
                    Connect: Math.round(((entry.connect ?? 2) / 4) * 100),
                    Purpose: Math.round(((entry.purpose ?? 2) / 4) * 100),
                  },
                }))} />
              </div>

              <div className="history-list">
                {history.map(entry => {
                  const avg = calcAvg(entry)
                  const pct = Math.round((avg / 4) * 100)
                  const color = pct > 66 ? '#10b981' : pct > 33 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={entry.id} className="history-row">
                      <span className="history-date">{formatDate(entry.date_key || entry.created_at)}</span>
                      <div className="history-bar-wrap">
                        <div className="history-bar" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="history-pct" style={{ color }}>{pct}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          <button className="redo-btn" onClick={() => setStep(todayEntry ? 'result' : 'check')}>
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
