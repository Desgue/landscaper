import { useRef, useState, useEffect } from 'react'

interface UseInViewOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

export function useInView(options: UseInViewOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px', once = true } = options
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [isInView, setIsInView] = useState(prefersReducedMotion)

  useEffect(() => {
    // Respect reduced motion preference - immediately show content
    if (prefersReducedMotion) return

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (once) {
            observer.unobserve(element)
          }
        } else if (!once) {
          setIsInView(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once, prefersReducedMotion])

  return { ref, isInView }
}
