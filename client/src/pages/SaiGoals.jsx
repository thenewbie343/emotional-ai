import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './SaiGoals.css'

const CATEGORIES = [
  { key: 'health',     emoji: '💪', label: 'Health',     color: '#10b981' },
  { key: 'mind',       emoji: '🧠', label: 'Mind',       color: '#7c5cfc' },
  { key: 'social',     emoji: '🤝', label: 'Social',     color: '#f59e0b' },
  { key: 'creative',   emoji: '🎨', label: 'Creative',   color: '#ec4899' },
  { key: 'career',     emoji: '🚀', label: 'Career',     color: '#00d4ff' },
  { key: 'wellbeing',  emoji: '🌿', label: 'Wellbeing',  color: '#a855f7' },
]

// Challenge pools per category (SAI generates one per day per goal)
const CHALLENGES = {
  health: [
    "Go for a 15-minute walk today — no phone allowed.",
    "Drink 8 glasses of water before the day ends.",
    "Do 10 minutes of stretching after you wake up.",
    "Skip one processed food and replace it with a fruit.",
    "Sleep before midnight tonight.",
    "Take 3 deep breaths every hour for the next 5 hours.",
    "Do 20 squats whenever you stand up today.",
    "Cook one meal at home instead of ordering.",
  ],
  mind: [
    "Read 10 pages of any book today.",
    "Write 3 things you're grateful for right now.",
    "Spend 10 minutes on a skill you've been meaning to learn.",
    "Watch one educational video instead of entertainment.",
    "Practice 5 minutes of mindful breathing.",
    "Write down one thing you want to understand better.",
    "Think of a problem in your life and brainstorm 5 solutions.",
    "Learn one new word or concept today.",
  ],
  social: [
    "Text someone you haven't spoken to in a while.",
    "Give someone a genuine compliment today.",
    "Have a conversation without looking at your phone.",
    "Tell someone you appreciate them today.",
    "Make plans with a friend for this week.",
    "Listen actively in your next conversation — no interrupting.",
    "Send a voice note instead of a text to someone today.",
    "Ask a friend 'how are you really doing?'",
  ],
  creative: [
    "Doodle or sketch something for 10 minutes.",
    "Write a short poem about your current emotion.",
    "Take one photo that you find genuinely beautiful.",
    "Rearrange something in your space to make it feel better.",
    "Describe your day in exactly 6 words.",
    "Invent a short story opening — just one paragraph.",
    "Listen to music you've never heard before.",
    "Create a simple playlist for your current mood.",
  ],
  career: [
    "Spend 20 minutes on your most important task without distractions.",
    "Write down your top 3 priorities for this week.",
    "Learn one keyboard shortcut you didn't know before.",
    "Send one professional email you've been postponing.",
    "Read one article relevant to your field.",
    "Set a timer for 25 minutes and work on just one thing.",
    "Organize one messy folder on your computer.",
    "Review your goals and adjust one that no longer fits.",
  ],
  wellbeing: [
    "Spend 20 minutes outside in natural light.",
    "Journal about one emotion you haven't processed yet.",
    "Do something that brings you pure joy for 15 minutes.",
    "Take a proper break — screen-free — for 20 minutes.",
    "Listen to a song that makes you feel at peace.",
    "Tidy one space that has been bothering you.",
    "Say 'no' to one thing you don't actually want to do today.",
    "Reflect: what would make today feel like a good day?",
  ],
}

function generateChallenge(category) {
  const pool = CHALLENGES[category] || CHALLENGES.wellbeing
  // Use today's date as seed for consistent daily challenge
  const seed = new Date().toISOString().split('T')[0]
  const idx = [...seed].reduce((acc, c) => acc + c.charCodeAt(0), 0) % pool.length
  return pool[idx]
}

function ProgressRing({ progress, color, size = 52 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const filled = (progress / 100) * circ

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

export default function SaiGoals({ session }) {
  const [goals, setGoals] = useState([])
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // New goal form state
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCat, setNewCat] = useState('health')
  const [newTarget, setNewTarget] = useState('')
  const [saving, setSaving] = useState(false)

  const userId = session?.user?.id
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!userId) return
    loadAll()
  }, [userId])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: gs }, { data: cs }] = await Promise.all([
      supabase.from('sai_goals').select('*').eq('user_id', userId).eq('status', 'active').order('created_at'),
      supabase.from('sai_challenges').select('*').eq('user_id', userId).eq('date_key', today),
    ])
    setGoals(gs || [])

    // Sync challenges — ensure one challenge exists per active goal for today
    const existingGoalIds = new Set((cs || []).map(c => c.goal_id))
    const missing = (gs || []).filter(g => !existingGoalIds.has(g.id))

    if (missing.length > 0) {
      const newChallenges = missing.map(g => ({
        user_id: userId,
        goal_id: g.id,
        challenge_text: generateChallenge(g.category),
        date_key: today,
        completed: false,
      }))
      const { data: inserted } = await supabase.from('sai_challenges').insert(newChallenges).select()
      setChallenges([...(cs || []), ...(inserted || [])])
    } else {
      setChallenges(cs || [])
    }
    setLoading(false)
  }

  const handleAddGoal = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)

    const { data: goal } = await supabase.from('sai_goals').insert([{
      user_id: userId,
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCat,
      target_date: newTarget || null,
      progress: 0,
      status: 'active',
    }]).select().single()

    if (goal) {
      // Generate today's challenge immediately
      const challenge = {
        user_id: userId,
        goal_id: goal.id,
        challenge_text: generateChallenge(goal.category),
        date_key: today,
        completed: false,
      }
      const { data: ch } = await supabase.from('sai_challenges').insert([challenge]).select().single()
      setGoals(prev => [...prev, goal])
      if (ch) setChallenges(prev => [...prev, ch])
    }

    setNewTitle('')
    setNewDesc('')
    setNewCat('health')
    setNewTarget('')
    setSaving(false)
    setShowAddModal(false)
  }

  const handleUpdateProgress = async (goalId, newProgress) => {
    const clamped = Math.max(0, Math.min(100, newProgress))
    await supabase.from('sai_goals').update({ progress: clamped }).eq('id', goalId)
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress: clamped } : g))

    if (clamped === 100) {
      // Mark as completed
      setTimeout(async () => {
        await supabase.from('sai_goals').update({ status: 'completed' }).eq('id', goalId)
        setGoals(prev => prev.filter(g => g.id !== goalId))
        setChallenges(prev => prev.filter(c => c.goal_id !== goalId))
      }, 1200)
    }
  }

  const handleCompleteChallenge = async (challengeId) => {
    await supabase.from('sai_challenges').update({ completed: true }).eq('id', challengeId)
    setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, completed: true } : c))

    // Award a small progress bump to the linked goal
    const ch = challenges.find(c => c.id === challengeId)
    if (ch) {
      const goal = goals.find(g => g.id === ch.goal_id)
      if (goal) handleUpdateProgress(goal.id, (goal.progress || 0) + 10)
    }
  }

  const handleDeleteGoal = async (goalId) => {
    await supabase.from('sai_challenges').delete().eq('goal_id', goalId)
    await supabase.from('sai_goals').delete().eq('id', goalId)
    setGoals(prev => prev.filter(g => g.id !== goalId))
    setChallenges(prev => prev.filter(c => c.goal_id !== goalId))
  }

  const todayChallenges = challenges.filter(c => c.date_key === today)
  const completedToday = todayChallenges.filter(c => c.completed).length

  return (
    <div className="goals-page">
      {/* Header */}
      <div className="goals-header">
        <Link to="/sai" className="goals-back">←</Link>
        <div className="goals-title-block">
          <h1 className="goals-title">🎯 Goals</h1>
          <p className="goals-subtitle">Daily challenges · long-term growth</p>
        </div>
        <button className="goals-add-btn" onClick={() => setShowAddModal(true)}>+ New</button>
      </div>

      {/* Today's challenge summary */}
      {todayChallenges.length > 0 && (
        <div className="goals-today-banner">
          <div className="today-banner-left">
            <span className="today-emoji">⚡</span>
            <div>
              <div className="today-label">Today's Progress</div>
              <div className="today-count">{completedToday} / {todayChallenges.length} challenges done</div>
            </div>
          </div>
          <div className="today-prog-bar">
            <div className="today-prog-fill" style={{ width: `${todayChallenges.length ? (completedToday / todayChallenges.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Goals list */}
      <div className="goals-list">
        {loading ? (
          <div className="goals-empty"><div className="goals-spinner" /><p>Loading...</p></div>
        ) : goals.length === 0 ? (
          <div className="goals-empty">
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</div>
            <p className="goals-empty-title">No goals yet</p>
            <p className="goals-empty-hint">Set your first goal and SAI will give you a daily challenge to keep you moving.</p>
            <button className="goals-start-btn" onClick={() => setShowAddModal(true)}>🎯 Set First Goal</button>
          </div>
        ) : (
          goals.map(goal => {
            const cat = CATEGORIES.find(c => c.key === goal.category) || CATEGORIES[0]
            const ch = todayChallenges.find(c => c.goal_id === goal.id)
            const daysLeft = goal.target_date
              ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000))
              : null

            return (
              <div key={goal.id} className="goal-card" style={{ '--cat-color': cat.color }}>
                <div className="goal-card-top">
                  {/* Progress ring */}
                  <ProgressRing progress={goal.progress || 0} color={cat.color} size={56} />

                  <div className="goal-main">
                    <div className="goal-cat-row">
                      <span className="goal-cat-badge" style={{ background: `${cat.color}20`, color: cat.color }}>
                        {cat.emoji} {cat.label}
                      </span>
                      {daysLeft !== null && (
                        <span className="goal-days-left">
                          {daysLeft === 0 ? '🔴 Due today' : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                    <div className="goal-title">{goal.title}</div>
                    {goal.description && <div className="goal-desc">{goal.description}</div>}
                  </div>

                  <button className="goal-delete-btn" onClick={() => handleDeleteGoal(goal.id)} title="Remove goal">×</button>
                </div>

                {/* Progress slider */}
                <div className="goal-progress-row">
                  <span className="goal-progress-label">{goal.progress || 0}%</span>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={goal.progress || 0}
                    onChange={e => handleUpdateProgress(goal.id, Number(e.target.value))}
                    className="goal-slider"
                    style={{ '--color': cat.color }}
                  />
                </div>

                {/* Daily challenge */}
                {ch && (
                  <div className={`goal-challenge ${ch.completed ? 'done' : ''}`}>
                    <div className="challenge-label">⚡ Today's Challenge</div>
                    <div className="challenge-text">{ch.challenge_text}</div>
                    {!ch.completed ? (
                      <button className="challenge-done-btn" onClick={() => handleCompleteChallenge(ch.id)}
                        style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}bb)` }}>
                        ✓ Mark Complete
                      </button>
                    ) : (
                      <div className="challenge-completed-badge">✅ Completed today! +10% progress</div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="goals-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="goals-modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">🎯 New Goal</h2>
            <form onSubmit={handleAddGoal} className="modal-form">
              <label className="modal-label">Goal Title *</label>
              <input
                className="modal-input"
                placeholder="e.g. Run 5km without stopping"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                required maxLength={80}
              />

              <label className="modal-label">Description (optional)</label>
              <textarea
                className="modal-input modal-textarea"
                placeholder="What does success look like?"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                maxLength={200} rows={2}
              />

              <label className="modal-label">Category</label>
              <div className="modal-cat-grid">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`modal-cat-btn ${newCat === cat.key ? 'active' : ''}`}
                    style={newCat === cat.key ? { borderColor: cat.color, color: cat.color, background: `${cat.color}18` } : {}}
                    onClick={() => setNewCat(cat.key)}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>

              <label className="modal-label">Target Date (optional)</label>
              <input
                type="date"
                className="modal-input modal-date"
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                min={today}
              />

              <div className="modal-btn-row">
                <button type="button" className="modal-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal-submit" disabled={saving || !newTitle.trim()}>
                  {saving ? 'Saving...' : '🎯 Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
