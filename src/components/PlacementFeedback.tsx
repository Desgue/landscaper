import { useEffect, useRef } from 'react'
import { usePlacementFeedbackStore } from '../store/usePlacementFeedbackStore'

const DISMISS_MS = 2000

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 48,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '6px 14px',
  borderRadius: 6,
  background: 'var(--ls-surface-overlay, rgba(0,0,0,0.75))',
  color: 'var(--ls-text-on-overlay, #fff)',
  fontSize: 13,
  fontWeight: 500,
  pointerEvents: 'none',
  zIndex: 50,
  whiteSpace: 'nowrap',
}

export default function PlacementFeedback() {
  const { message, timestamp } = usePlacementFeedbackStore((s) => ({
    message: s.message,
    timestamp: s.timestamp,
  }))
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (!message) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      usePlacementFeedbackStore.getState().clearFeedback()
    }, DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [message, timestamp])

  if (!message) return null

  return <div style={overlayStyle}>{message}</div>
}
