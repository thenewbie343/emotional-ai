import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './SaiMemories.css'

const CATEGORY_META = {
  name:     { emoji: '👤', label: 'Identity',    color: '#7c5cfc' },
  age:      { emoji: '🎂', label: 'Age',         color: '#f59e0b' },
  love:     { emoji: '❤️',  label: 'Loves',       color: '#ef4444' },
  interest: { emoji: '⭐', label: 'Interests',   color: '#10b981' },
  location: { emoji: '📍', label: 'Location',    color: '#00d4ff' },
  identity: { emoji: '🌟', label: 'About You',   color: '#a855f7' },
  favorite: { emoji: '🏆', label: 'Favorites',   color: '#f97316' },
  work:     { emoji: '💼', label: 'Work',        color: '#64748b' },
}

// Tag colors (cycling palette)
const TAG_COLORS = ['#7c5cfc','#ef4444','#10b981','#f59e0b','#00d4ff','#a855f7','#f97316','#ec4899','#14b8a6']

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SaiMemories({ session }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeTag, setActiveTag] = useState(null)   // selected custom tag
  const [deletingId, setDeletingId] = useState(null)
  const [tagInputId, setTagInputId] = useState(null) // which memory's tag field is open
  const [tagDraft, setTagDraft] = useState('')
  const tagInputRef = useRef(null)

  useEffect(() => {
    if (!session?.user?.id) return
    const load = async () => {
      const { data, error } = await supabase
        .from('sai_memories')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) console.error('Load memories error:', error)
      if (data) setMemories(data)
      setLoading(false)
    }
    load()
  }, [session])

  // Focus tag input when opened
  useEffect(() => {
    if (tagInputId && tagInputRef.current) tagInputRef.current.focus()
  }, [tagInputId])

  const handleDelete = async (id) => {
    setDeletingId(id)
    await supabase.from('sai_memories').delete().eq('id', id)
    setMemories(prev => prev.filter(m => m.id !== id))
    setDeletingId(null)
  }

  // Save a custom tag to a memory
  const handleAddTag = async (memId) => {
    const tag = tagDraft.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag) { setTagInputId(null); setTagDraft(''); return }
    const mem = memories.find(m => m.id === memId)
    const existingTags = mem?.tags || []
    if (existingTags.includes(tag)) { setTagInputId(null); setTagDraft(''); return }
    const newTags = [...existingTags, tag]
    await supabase.from('sai_memories').update({ tags: newTags }).eq('id', memId)
    setMemories(prev => prev.map(m => m.id === memId ? { ...m, tags: newTags } : m))
    setTagInputId(null)
    setTagDraft('')
  }

  const handleRemoveTag = async (memId, tag) => {
    const mem = memories.find(m => m.id === memId)
    const newTags = (mem?.tags || []).filter(t => t !== tag)
    await supabase.from('sai_memories').update({ tags: newTags }).eq('id', memId)
    setMemories(prev => prev.map(m => m.id === memId ? { ...m, tags: newTags } : m))
    if (activeTag === tag) setActiveTag(null)
  }

  // Collect all unique tags across all memories
  const allTags = [...new Set(memories.flatMap(m => m.tags || []))]

  const categories = ['all', ...Object.keys(CATEGORY_META)]
  const counts = memories.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1
    return acc
  }, {})

  const filtered = memories.filter(m => {
    const matchSearch = search
      ? m.fact.toLowerCase().includes(search.toLowerCase()) ||
        (m.tags || []).some(t => t.includes(search.toLowerCase()))
      : true
    const matchFilter = activeFilter === 'all' || m.category === activeFilter
    const matchTag = activeTag ? (m.tags || []).includes(activeTag) : true
    return matchSearch && matchFilter && matchTag
  })

  return (
    <div className="sai-memories-page">
      {/* Header */}
      <div className="mem-header">
        <Link to="/sai" className="mem-back">←</Link>
        <div className="mem-title-block">
          <h1 className="mem-title">🧠 Memory Vault</h1>
          <p className="mem-subtitle">Everything SAI knows about you</p>
        </div>
        <div className="mem-count-badge">{memories.length} memories</div>
      </div>

      {/* Search */}
      <div className="mem-search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search memories or tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mem-search-input"
        />
        {search && (
          <button className="mem-search-clear" onClick={() => setSearch('')}>×</button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="mem-filters">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat]
          const count = cat === 'all' ? memories.length : (counts[cat] || 0)
          return (
            <button
              key={cat}
              className={`mem-filter-pill ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => { setActiveFilter(cat); setActiveTag(null) }}
              style={activeFilter === cat && meta ? { borderColor: meta.color, color: meta.color } : {}}
            >
              {meta ? `${meta.emoji} ${meta.label}` : '✨ All'}
              {count > 0 && <span className="pill-count">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Custom Tag Filter Row */}
      {allTags.length > 0 && (
        <div className="mem-tag-row">
          <span className="tag-row-label">Tags:</span>
          {activeTag && (
            <button
              className="mem-custom-tag active"
              style={{ background: TAG_COLORS[allTags.indexOf(activeTag) % TAG_COLORS.length] + '33',
                       color: TAG_COLORS[allTags.indexOf(activeTag) % TAG_COLORS.length],
                       borderColor: TAG_COLORS[allTags.indexOf(activeTag) % TAG_COLORS.length] }}
              onClick={() => setActiveTag(null)}
            >
              #{activeTag} ×
            </button>
          )}
          {allTags.filter(t => t !== activeTag).map((tag, i) => (
            <button
              key={tag}
              className="mem-custom-tag"
              style={{ color: TAG_COLORS[(allTags.indexOf(tag)) % TAG_COLORS.length] }}
              onClick={() => setActiveTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Memory Grid */}
      <div className="mem-grid">
        {loading ? (
          <div className="mem-empty">
            <div className="mem-spinner" />
            <p>Loading memories...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mem-empty">
            <div className="mem-empty-icon">🫧</div>
            <p className="mem-empty-title">No memories yet</p>
            <p className="mem-empty-hint">
              {memories.length === 0
                ? 'Chat with SAI and share things about yourself — she\'ll remember!'
                : 'No memories match your search or filter.'}
            </p>
            {memories.length === 0 && (
              <Link to="/sai/chat" className="mem-chat-btn">
                💬 Start Chatting
              </Link>
            )}
          </div>
        ) : (
          filtered.map(mem => {
            const meta = CATEGORY_META[mem.category] || { emoji: '💭', label: mem.category, color: '#7c5cfc' }
            const memTags = mem.tags || []
            return (
              <div key={mem.id} className="mem-card" style={{ '--cat-color': meta.color }}>
                <div className="mem-card-top">
                  <span className="mem-cat-badge" style={{ background: `${meta.color}22`, color: meta.color }}>
                    {meta.emoji} {meta.label}
                  </span>
                  <button
                    className={`mem-delete-btn ${deletingId === mem.id ? 'deleting' : ''}`}
                    onClick={() => handleDelete(mem.id)}
                    title="Forget this memory"
                  >
                    {deletingId === mem.id ? '...' : '×'}
                  </button>
                </div>
                <p className="mem-fact">"{mem.fact}"</p>

                {/* Tags */}
                <div className="mem-tags-row">
                  {memTags.map((tag, i) => (
                    <span
                      key={tag}
                      className="mem-tag-chip"
                      style={{
                        background: TAG_COLORS[i % TAG_COLORS.length] + '22',
                        color: TAG_COLORS[i % TAG_COLORS.length],
                        borderColor: TAG_COLORS[i % TAG_COLORS.length] + '55',
                      }}
                    >
                      #{tag}
                      <button
                        className="mem-tag-remove"
                        onClick={() => handleRemoveTag(mem.id, tag)}
                        title="Remove tag"
                      >×</button>
                    </span>
                  ))}

                  {/* Add tag button / input */}
                  {tagInputId === mem.id ? (
                    <form
                      className="mem-tag-form"
                      onSubmit={e => { e.preventDefault(); handleAddTag(mem.id) }}
                    >
                      <input
                        ref={tagInputRef}
                        className="mem-tag-input"
                        value={tagDraft}
                        onChange={e => setTagDraft(e.target.value)}
                        placeholder="tag name..."
                        maxLength={20}
                      />
                      <button type="submit" className="mem-tag-save">✓</button>
                      <button type="button" className="mem-tag-cancel"
                        onClick={() => { setTagInputId(null); setTagDraft('') }}>×</button>
                    </form>
                  ) : (
                    <button
                      className="mem-add-tag-btn"
                      onClick={() => { setTagInputId(mem.id); setTagDraft('') }}
                      title="Add tag"
                    >
                      + tag
                    </button>
                  )}
                </div>

                <span className="mem-time">{timeAgo(mem.created_at)}</span>
              </div>
            )
          })
        )}
      </div>

      {memories.length >= 3 && (
        <div className="mem-insight-banner">
          <span className="mem-insight-icon">✨</span>
          <span>
            SAI has learned <strong>{memories.length} things</strong> about you across{' '}
            <strong>{Object.keys(counts).length} categories</strong>. The more you share, the better she understands you.
          </span>
        </div>
      )}
    </div>
  )
}
