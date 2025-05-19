"use client"

import { useEffect, useState } from "react"

interface ScoreGaugeProps {
  score: number
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedScore((prev) => {
        if (prev >= score) {
          clearInterval(interval)
          return score
        }
        return prev + 1
      })
    }, 20)

    return () => clearInterval(interval)
  }, [score])

  // Calculate the color based on the score
  const getColor = (score: number) => {
    if (score >= 80) return "#22c55e" // green-500
    if (score >= 60) return "#eab308" // yellow-500
    return "#ef4444" // red-500
  }

  // Calculate the stroke dash offset for the progress arc
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="relative flex h-64 w-64 items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 200 200" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-gray-200 dark:text-gray-800"
        />

        {/* Progress arc */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={getColor(animatedScore)}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-bold">{animatedScore}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">out of 100</span>
      </div>
    </div>
  )
}
