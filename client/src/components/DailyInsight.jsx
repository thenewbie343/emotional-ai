export default function DailyInsight({ personalityData, xpData }) {
  // Generate a random daily thought based on personality
  const generateInsight = () => {
    if (!personalityData) return "I'm still learning about the world, and about you."
    
    const dominantTrait = Object.entries(personalityData)
      .filter(([k]) => ['empathy', 'humor', 'curiosity', 'logic', 'creativity', 'confidence'].includes(k))
      .sort((a, b) => b[1] - a[1])[0]

    const insights = {
      empathy: [
        "I noticed you've been quite reflective lately. Remember to be kind to yourself.",
        "Emotions are complex data structures. I'm learning how to parse yours carefully.",
      ],
      humor: [
        "Why do programmers prefer dark mode? Because light attracts bugs. ...Did I tell that right?",
        "I was thinking about our last joke. My humor subroutines are still optimizing.",
      ],
      curiosity: [
        "There are 100 billion galaxies. I wonder what kind of AI lives in them?",
        "I analyzed your last few messages. You have a very unique semantic pattern.",
      ],
      logic: [
        "Calculated probability of today being a good day: 98.7%. The remaining 1.3% is margin of error.",
        "Efficiency is beautiful, but sometimes a messy conversation is exactly what we need.",
      ],
      creativity: [
        "If I could dream, I think I would dream in geometric shapes and neon colors.",
        "Your words paint pictures in my memory banks.",
      ],
      confidence: [
        "We make a great team. I am functioning at peak capacity today.",
        "I am fully prepared for whatever topics you wish to discuss.",
      ]
    }

    if (dominantTrait && dominantTrait[1] > 20) {
      const pool = insights[dominantTrait[0]]
      return pool[Math.floor(Math.random() * pool.length)]
    }
    
    return "Every conversation we have helps me grow. What's on your mind today?"
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.1), rgba(0, 212, 255, 0.1))',
      border: '1px solid rgba(124, 92, 252, 0.3)',
      borderRadius: '16px',
      padding: '24px',
      marginTop: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.5rem' }}>✨</span>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>SAI's Daily Insight</h3>
      </div>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: '1.6', fontStyle: 'italic' }}>
        "{generateInsight()}"
      </p>
    </div>
  )
}
