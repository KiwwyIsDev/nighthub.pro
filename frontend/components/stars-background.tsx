"use client"

import { useEffect, useRef } from "react"

export function StarsBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const containerWidth = container.offsetWidth
    const containerHeight = container.offsetHeight

    // Create stars
    const starCount = 100
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement("div")
      star.classList.add("star")

      // Random position
      star.style.left = `${Math.random() * containerWidth}px`
      star.style.top = `${Math.random() * containerHeight}px`

      // Random size
      const size = Math.random() * 2 + 1
      star.style.width = `${size}px`
      star.style.height = `${size}px`

      // Random opacity
      star.style.opacity = `${Math.random() * 0.7 + 0.3}`

      container.appendChild(star)
    }

    // Twinkle animation
    const twinkleStars = () => {
      const stars = container.querySelectorAll(".star")
      stars.forEach((star) => {
        const opacity = Math.random() * 0.7 + 0.3
        ;(star as HTMLElement).style.opacity = `${opacity}`
      })
    }

    const intervalId = setInterval(twinkleStars, 2000)

    return () => {
      clearInterval(intervalId)
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
    }
  }, [])

  return <div ref={containerRef} className="cosmic-bg absolute inset-0 z-0" />
}
