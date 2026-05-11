import { supabase } from '../lib/supabaseClient'

const XP_LEVELS = [
  { level: 1, xpNeeded: 0, title: 'Stranger' },
  { level: 2, xpNeeded: 20, title: 'Acquaintance' },
  { level: 3, xpNeeded: 50, title: 'Companion' },
  { level: 4, xpNeeded: 100, title: 'Friend' },
  { level: 5, xpNeeded: 200, title: 'Close Friend' },
  { level: 6, xpNeeded: 400, title: 'Best Friend' },
  { level: 7, xpNeeded: 750, title: 'Confidant' },
  { level: 8, xpNeeded: 1200, title: 'Kindred Spirit' },
  { level: 9, xpNeeded: 2000, title: 'Soulmate' },
  { level: 10, xpNeeded: 3500, title: 'Eternal Bond' }
]

export function getLevelInfo(xp) {
  let currentLevel = XP_LEVELS[0]
  let nextLevel = XP_LEVELS[1]

  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i].xpNeeded) {
      currentLevel = XP_LEVELS[i]
      nextLevel = XP_LEVELS[i + 1] || null
    } else {
      break
    }
  }

  const progress = nextLevel 
    ? ((xp - currentLevel.xpNeeded) / (nextLevel.xpNeeded - currentLevel.xpNeeded)) * 100
    : 100

  return { currentLevel, nextLevel, progress }
}

export async function addXp(userId, amount) {
  if (!userId) return null
  
  const { data: currentData } = await supabase
    .from('sai_xp')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!currentData) {
    // Initialize
    await supabase.from('sai_xp').insert([{ user_id: userId, xp: amount, level: 1 }])
    return { leveledUp: false, title: 'Stranger' }
  }

  // Calculate streak bonus
  let bonus = 0
  const now = new Date()
  const lastActive = new Date(currentData.last_active || 0)
  const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24))

  let newStreak = currentData.streak_days || 0
  if (diffDays === 1) {
    newStreak += 1
    bonus = Math.min(20, newStreak * 2) // Cap bonus at +20
  } else if (diffDays > 1) {
    newStreak = 1 // Reset streak
  }

  const newXp = currentData.xp + amount + bonus
  const info = getLevelInfo(newXp)
  
  const leveledUp = info.currentLevel.level > currentData.level

  await supabase
    .from('sai_xp')
    .update({ 
      xp: newXp, 
      level: info.currentLevel.level, 
      streak_days: newStreak, 
      last_active: now.toISOString() 
    })
    .eq('user_id', userId)

  return { leveledUp, title: info.currentLevel.title, newXp, bonus }
}

export async function fetchXp(userId) {
  if (!userId) return null
  const { data } = await supabase.from('sai_xp').select('*').eq('user_id', userId).maybeSingle()
  return data
}

export function XpBar({ xpData }) {
  if (!xpData) return null

  const info = getLevelInfo(xpData.xp)

  return (
    <div style={{
      width: '100%', padding: '16px', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Level {info.currentLevel.level}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#7c5cfc' }}>
            {info.currentLevel.title}
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
          {xpData.xp} XP {info.nextLevel && `/ ${info.nextLevel.xpNeeded} XP`}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${info.progress}%`,
          background: 'linear-gradient(90deg, #7c5cfc, #00d4ff)',
          borderRadius: '3px', transition: 'width 0.5s ease-out'
        }}></div>
      </div>
      
      {xpData.streak_days > 1 && (
        <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#ff4466', fontWeight: 600 }}>
          🔥 {xpData.streak_days} Day Streak Active!
        </div>
      )}
    </div>
  )
}
