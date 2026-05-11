import { useEffect, useState } from 'react'

export function RealWorldEnv({ active, children }) {
  const [timeOfDay, setTimeOfDay] = useState('day')

  useEffect(() => {
    if (!active) {
      setTimeOfDay('day')
      return
    }

    const updateTime = () => {
      const hour = new Date().getHours()
      
      // Professional environmental mapping based on real local time
      if (hour >= 5 && hour < 8) setTimeOfDay('dawn')
      else if (hour >= 8 && hour < 17) setTimeOfDay('day')
      else if (hour >= 17 && hour < 20) setTimeOfDay('dusk')
      else setTimeOfDay('night')
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [active])

  // We don't render actual meshes here, we just wrap and pass data or use Context
  // But for simplicity in this architecture, we will return standard lighting based on time
  
  if (!active) return null

  if (timeOfDay === 'night') {
    return (
      <group>
        <ambientLight intensity={0.1} />
        <directionalLight position={[5, 10, -5]} intensity={0.2} color="#4455ff" />
        <pointLight position={[0, 5, 0]} intensity={1} color="#ffffff" distance={20} />
      </group>
    )
  }
  
  if (timeOfDay === 'dawn' || timeOfDay === 'dusk') {
    return (
      <group>
        <ambientLight intensity={0.3} color="#ffbbaa" />
        <directionalLight position={timeOfDay === 'dawn' ? [10, 2, 10] : [-10, 2, 10]} intensity={1.5} color="#ffaa55" castShadow />
      </group>
    )
  }

  // Standard Day
  return (
    <group>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} color="#ffffff" castShadow />
    </group>
  )
}
