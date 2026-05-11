

export default function PersonalityRadar({ personalityData }) {

  const traits = [
    { name: 'Empathy', value: personalityData?.empathy || 0 },
    { name: 'Humor', value: personalityData?.humor || 0 },
    { name: 'Curiosity', value: personalityData?.curiosity || 0 },
    { name: 'Logic', value: personalityData?.logic || 0 },
    { name: 'Creativity', value: personalityData?.creativity || 0 },
    { name: 'Confidence', value: personalityData?.confidence || 0 }
  ]


  return (
    <div style={{ width: '100%', height: '300px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, color: 'white' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#ff00aa' }}>Evolving Personality Matrix</h3>
        <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Based on your conversations</p>
      </div>
      
      {/* 2D representation for now, 3D Canvas requires heavy setup here */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="200" height="200" viewBox="-100 -100 200 200">
          {/* Background Web */}
          {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
            <polygon 
              key={scale}
              points={traits.map((_, i) => {
                const angle = (i / traits.length) * Math.PI * 2
                return `${Math.cos(angle) * 80 * scale},${Math.sin(angle) * 80 * scale}`
              }).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
            />
          ))}
          
          {/* Trait Labels */}
          {traits.map((trait, i) => {
            const angle = (i / traits.length) * Math.PI * 2
            const x = Math.cos(angle) * 95
            const y = Math.sin(angle) * 95
            return (
              <text key={trait.name} x={x} y={y} fontSize="8" fill="rgba(255,255,255,0.6)" textAnchor="middle" dominantBaseline="middle">
                {trait.name}
              </text>
            )
          })}

          {/* Data Polygon */}
          <polygon
            points={traits.map((trait, i) => {
              const angle = (i / traits.length) * Math.PI * 2
              const val = Math.max(0.1, trait.value / 100)
              return `${Math.cos(angle) * 80 * val},${Math.sin(angle) * 80 * val}`
            }).join(' ')}
            fill="rgba(124, 92, 252, 0.4)"
            stroke="#7c5cfc"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}
