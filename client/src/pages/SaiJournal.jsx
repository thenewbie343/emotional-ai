import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './SaiJournal.css'

const MOODS = [
  { emoji: '🤩', label: 'Amazing', color: '#ffd700' },
  { emoji: '😊', label: 'Good', color: '#00ff88' },
  { emoji: '😐', label: 'Okay', color: '#88aacc' },
  { emoji: '😢', label: 'Sad', color: '#5577cc' },
  { emoji: '😡', label: 'Angry', color: '#ff4466' },
]

const SHUNA_MOOD_COMMENTS = {
  '🤩': [
    "That's incredible! I love seeing you on top of the world!",
    "Your positive energy is absolutely radiant right now!",
    "Amazing days deserve to be remembered. I'm so happy for you!",
  ],
  '😊': [
    "Good vibes! What made today special?",
    "I'm glad you're feeling good. You deserve it.",
    "A good day is a gift. Let's hold onto this feeling!",
  ],
  '😐': [
    "It's okay to have neutral days. They're part of life's rhythm.",
    "Even ordinary days have small moments worth noticing.",
    "Sometimes 'okay' is perfectly fine. I'm here if you need me.",
  ],
  '😢': [
    "I'm sorry you're feeling down. Remember, this feeling is temporary.",
    "It's brave to acknowledge sadness. I'm right here with you.",
    "Sending you all my warmth. Tomorrow is a new beginning.",
  ],
  '😡': [
    "I hear you. It's okay to feel angry — let it out here safely.",
    "Whatever happened, your feelings are valid. Want to talk about it?",
    "Take a deep breath. I'm here, no judgment, just support.",
  ],
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SaiJournal({ session }) {
  const [selectedMood, setSelectedMood] = useState(null)
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState([])
  const [shunaComment, setShunaComment] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load past mood entries
  useEffect(() => {
    if (!session?.user?.id) return
    const load = async () => {
      const { data } = await supabase
        .from('sai_moods')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setEntries(data)
    }
    load()
  }, [session])

  const handleMoodSelect = (emoji) => {
    setSelectedMood(emoji)
    // Shuna gives a comment
    const comments = SHUNA_MOOD_COMMENTS[emoji] || []
    const comment = comments[Math.floor(Math.random() * comments.length)]
    setShunaComment(comment)
  }

  const handleSave = async () => {
    if (!selectedMood || !session?.user?.id) return
    setSaving(true)

    const { data, error } = await supabase
      .from('sai_moods')
      .insert([{
        user_id: session.user.id,
        mood: selectedMood,
        note: note.trim() || null,
      }])
      .select()

    if (!error && data) {
      setEntries(prev => [data[0], ...prev])
    }

    setSelectedMood(null)
    setNote('')
    setShunaComment(null)
    setSaving(false)
  }

  return (
    <div className="sai-journal-page">
      {/* Header */}
      <div className="sai-journal-header">
        <Link to="/chat" className="back-link">←</Link>
        <h2>Mood Journal</h2>
        <div className="spacer"></div>
      </div>

      {/* Mood Selector */}
      <div className="mood-selector">
        <div className="prompt">How are you feeling right now?</div>
        <div className="mood-emojis">
          {MOODS.map(m => (
            <button
              key={m.emoji}
              className={`mood-emoji ${selectedMood === m.emoji ? 'selected' : ''}`}
              onClick={() => handleMoodSelect(m.emoji)}
              title={m.label}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Shuna's comment on the selected mood */}
      {shunaComment && (
        <div className="sai-comment">
          <div className="comment-bubble">💬 {shunaComment}</div>
        </div>
      )}

      {/* Note input (shown when a mood is selected) */}
      {selectedMood && (
        <div className="mood-note-area">
          <textarea
            placeholder="Add a note about how you're feeling (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '...' : 'Save'}
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="journal-divider">
        <div className="line"></div>
        <div className="text">Past Entries</div>
        <div className="line"></div>
      </div>

      {/* Timeline */}
      <div className="mood-timeline">
        {entries.length === 0 ? (
          <div className="empty-journal">
            No mood entries yet. Select a mood above to start tracking!
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="mood-entry">
              <div className="entry-emoji">{entry.mood}</div>
              <div className="entry-content">
                {entry.note && <div className="entry-note">{entry.note}</div>}
                <div className="entry-time">{formatTime(entry.created_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
