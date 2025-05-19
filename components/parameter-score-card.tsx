import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Lock } from "lucide-react"

interface ParameterScoreCardProps {
  name: string
  score: number
  description: string
  isPremium?: boolean
}

export function ParameterScoreCard({ name, score, description, isPremium = false }: ParameterScoreCardProps) {
  // Calculate the color class based on the score
  const getColorClass = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  return (
    <Card className={isPremium ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          {isPremium && <Lock className="h-4 w-4 text-gray-400" />}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPremium ? (
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Upgrade to Premium to view this score</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getColorClass(score)}`}>{score}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">out of 100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
