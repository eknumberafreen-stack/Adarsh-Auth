'use client'

import { useEffect, useRef } from 'react'

interface ParticleFieldProps {
  className?: string
  particleColor?: string
  lineColor?: string
  count?: number
}

export default function ParticleField({
  className = 'absolute inset-0 pointer-events-none',
  particleColor = 'rgba(148, 163, 184, 0.24)',
  lineColor = 'rgba(99, 102, 241, 0.1)',
  count = 70,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let frameId = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.4 + 0.3,
      dx: (Math.random() - 0.5) * 0.25,
      dy: (Math.random() - 0.5) * 0.25,
    }))

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            context.beginPath()
            context.strokeStyle = lineColor
            context.globalAlpha = 0.15 * (1 - distance / 120)
            context.lineWidth = 0.5
            context.moveTo(particles[i].x, particles[i].y)
            context.lineTo(particles[j].x, particles[j].y)
            context.stroke()
            context.globalAlpha = 1
          }
        }
      }

      particles.forEach((particle) => {
        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fillStyle = particleColor
        context.fill()

        particle.x += particle.dx
        particle.y += particle.dy

        if (particle.x < 0 || particle.x > canvas.width) particle.dx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.dy *= -1
      })

      frameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
    }
  }, [count, lineColor, particleColor])

  return <canvas ref={canvasRef} className={className} />
}
