import { useEffect, useRef, useState } from 'react'

export default function EyeTracking() {
  const eyeRef = useRef<HTMLDivElement>(null)
  const [gaze, setGaze] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!eyeRef.current) return

      const rect = eyeRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const x = Math.max(-1, Math.min(1, (event.clientX - centerX) / 250))
      const y = Math.max(-1, Math.min(1, (event.clientY - centerY) / 180))

      setGaze({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="eye-tracking" ref={eyeRef}>
      <div className="eye-label">AI VISION SYSTEM</div>

      <div className="eyes">
        {[0, 1].map((eye) => (
          <div className="cyber-eye" key={eye}>
            <div className="eye-pupil"
              style={{
                left: `${50 + gaze.x * 17}%`,
                top: `${50 + gaze.y * 17}%`,
              }}
            >
              <div className="pupil-core" />
            </div>
            <div className="eye-shine" />
          </div>
        ))}
      </div>

      <div className="eye-status">
        <span />
        SYSTEM ONLINE · TRACKING ACTIVE
      </div>
    </div>
  )
}