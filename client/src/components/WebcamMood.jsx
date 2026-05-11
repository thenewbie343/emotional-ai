import { useState, useRef, useEffect } from 'react'

export default function WebcamMood({ onMoodDetected, enabled = false }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [detected, setDetected] = useState(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120, facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setIsActive(true)
      analyzeLoop()
    } catch (err) {
      console.log('Camera not available')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsActive(false)
    setDetected(null)
  }

  const analyzeLoop = () => {
    const analyze = () => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current) return
      
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0, 160, 120)
      
      const imageData = ctx.getImageData(0, 0, 160, 120)
      const data = imageData.data
      
      // Analyze brightness and color temperature
      let totalBrightness = 0
      let totalRed = 0
      let totalBlue = 0
      let motionScore = 0
      
      for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
        const r = data[i], g = data[i+1], b = data[i+2]
        totalBrightness += (r + g + b) / 3
        totalRed += r
        totalBlue += b
      }
      
      const pixelCount = data.length / 16
      const avgBrightness = totalBrightness / pixelCount
      const avgRed = totalRed / pixelCount
      const avgBlue = totalBlue / pixelCount
      
      // Determine energy based on brightness
      let mood = 'neutral'
      let comment = ''
      
      if (avgBrightness > 150) {
        mood = 'energetic'
        comment = "You're in a bright, well-lit space. You seem lively today!"
      } else if (avgBrightness > 100) {
        mood = 'calm'
        comment = "Nice cozy lighting. You seem relaxed right now."
      } else if (avgBrightness > 50) {
        mood = 'mellow'
        comment = "It's a bit dim there. Are you winding down for the night?"
      } else {
        mood = 'tired'
        comment = "It's quite dark. You might be feeling tired. Want to take it easy?"
      }
      
      setDetected({ mood, comment, brightness: Math.round(avgBrightness) })
      if (onMoodDetected) onMoodDetected({ mood, comment })
    }
    
    // Analyze every 5 seconds
    const interval = setInterval(analyze, 5000)
    // Initial analysis after 2 seconds
    setTimeout(analyze, 2000)
    
    return () => clearInterval(interval)
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  if (!enabled) return null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      padding: '14px', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
          📸 Webcam Mood
        </span>
        <button
          onClick={isActive ? stopCamera : startCamera}
          style={{
            padding: '4px 12px', borderRadius: '10px', fontSize: '0.7rem',
            background: isActive ? 'rgba(255,68,102,0.15)' : 'rgba(124,92,252,0.15)',
            border: `1px solid ${isActive ? 'rgba(255,68,102,0.3)' : 'rgba(124,92,252,0.3)'}`,
            color: isActive ? '#ff4466' : '#7c5cfc',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          {isActive ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Hidden video + canvas for analysis */}
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
      <canvas ref={canvasRef} width={160} height={120} style={{ display: 'none' }} />

      {detected && (
        <div style={{
          fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)',
          textAlign: 'center', lineHeight: 1.4, padding: '4px 8px',
          background: 'rgba(255,255,255,0.03)', borderRadius: '8px', width: '100%'
        }}>
          💡 {detected.comment}
        </div>
      )}
    </div>
  )
}
