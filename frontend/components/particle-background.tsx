"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  opacity: number
  speed: number
}

export function ParticleBackground() {
  const [particles, setParticles] = useState<Particle[]>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    // Set initial dimensions
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    })

    // Generate particles
    const particleCount = Math.min(Math.floor(window.innerWidth / 10), 150)
    const newParticles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3 + 1,
        color: getRandomColor(),
        opacity: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 0.5 + 0.1,
      })
    }

    setParticles(newParticles)

    // Handle resize
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  function getRandomColor() {
    const colors = [
      "#8b5cf6", // Purple
      "#c026d3", // Fuchsia
      "#7c3aed", // Violet
      "#a855f7", // Purple
      "#d946ef", // Fuchsia
      "#6366f1", // Indigo (used sparingly)
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,0,80,0.15)_0%,rgba(0,0,0,0)_70%)]" />

      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.opacity,
          }}
          initial={{ x: particle.x, y: particle.y }}
          animate={{
            y: [particle.y, particle.y + 50, particle.y],
            opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
          }}
          transition={{
            duration: 10 / particle.speed,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}

      {/* Glow effects */}
      <div className="absolute left-1/4 top-1/4 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/20 blur-3xl" />
      <div className="absolute right-1/4 bottom-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-900/10 blur-3xl" />
    </div>
  )
}
