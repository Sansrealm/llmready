import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import Link from "next/link"

interface RecommendationCardProps {
  title: string
  description: string
  difficulty: "Easy" | "Medium" | "Hard"
  impact: "Low" | "Medium" | "High"
  isPremium?: boolean
}

export function RecommendationCard({
  title,
  description,
  difficulty,
  impact,
  isPremium = false,
}: RecommendationCardProps) {
  // Get color for difficulty badge
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "Hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return ""
    }
  }

  // Get color for impact badge
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "Low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "Medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "High":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return ""
    }
  }

  return (
    <Card className={isPremium ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {isPremium && <Lock className="h-4 w-4 text-gray-400" />}
        </div>
      </CardHeader>
      <CardContent>
        {isPremium ? (
          <div className="flex flex-col items-center justify-center py-4">
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Upgrade to Premium to view this recommendation
            </p>
            <Button asChild>
              <Link href="/pricing">Upgrade to Premium</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge className={getDifficultyColor(difficulty)} variant="outline">
                {difficulty} Difficulty
              </Badge>
              <Badge className={getImpactColor(impact)} variant="outline">
                {impact} Impact
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
