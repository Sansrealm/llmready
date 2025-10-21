"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

type Analysis = {
  id: string;
  overallScore: number;
  analyzedAt: string;
};

type HistoryData = {
  analyses: Analysis[];
  total: number;
  firstAnalysis: string | null;
  latestScore: number;
  firstScore: number;
  trend: "improving" | "declining" | "stable";
  change: number;
};

export default function ScoreHistoryWidget({
  url,
  isPremium,
  isLoading: premiumLoading,
}: {
  url: string;
  isPremium: boolean;
  isLoading: boolean;
}) {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!isPremium || premiumLoading) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/analysis-history?url=${encodeURIComponent(url)}&limit=10`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch history");
        }

        const data = await response.json();
        setHistoryData(data);
      } catch (err) {
        console.error("Error fetching history:", err);
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [url, isPremium, premiumLoading]);

  // Show upgrade prompt for non-premium users
  if (!isPremium && !premiumLoading) {
    return (
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle>Track Your Progress Over Time</CardTitle>
            </div>
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Premium Only
            </span>
          </div>
          <CardDescription>
            See how your LLM readiness score changes with each analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <span className="mr-2">📈</span>
                <span>Score history chart showing trends over time</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📊</span>
                <span>Detailed analysis of improvements and declines</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🎯</span>
                <span>Track the impact of your optimization efforts</span>
              </li>
            </ul>
            <Button className="w-full bg-orange-600 hover:bg-orange-700" asChild>
              <Link href="/pricing">Upgrade to Premium</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading || premiumLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // First-time analysis
  if (!historyData || historyData.total === 0 || historyData.analyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score History for this URL</CardTitle>
          <CardDescription>
            Track your progress over time as you optimize for LLM readiness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">This is your first analysis of this URL</p>
            <p className="text-sm mt-2">
              Analyze this URL again in the future to see how your score changes over time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data (reverse to show oldest first)
  const chartData = [...historyData.analyses]
    .reverse()
    .map((analysis) => ({
      date: format(new Date(analysis.analyzedAt), "MMM d"),
      score: analysis.overallScore,
      fullDate: format(new Date(analysis.analyzedAt), "MMM d, yyyy"),
    }));

  // Get trend icon and color
  const getTrendIcon = () => {
    if (historyData.trend === "improving") {
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    } else if (historyData.trend === "declining") {
      return <TrendingDown className="h-5 w-5 text-red-600" />;
    }
    return <Minus className="h-5 w-5 text-gray-600" />;
  };

  const getTrendText = () => {
    const absChange = Math.abs(historyData.change);
    if (historyData.trend === "improving") {
      return `↑ +${absChange} improvement from first analysis`;
    } else if (historyData.trend === "declining") {
      return `↓ -${absChange} decline from first analysis`;
    }
    return "No significant change";
  };

  const getTrendColor = () => {
    if (historyData.trend === "improving") return "text-green-600 dark:text-green-400";
    if (historyData.trend === "declining") return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <CardTitle>Score History for this URL</CardTitle>
          </div>
          <span className="text-sm text-gray-500">
            {historyData.total} {historyData.total === 1 ? "analysis" : "analyses"}
          </span>
        </div>
        <CardDescription>
          You've analyzed this URL {historyData.total} times since{" "}
          {historyData.firstAnalysis
            ? format(new Date(historyData.firstAnalysis), "MMM d, yyyy")
            : "unknown"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trend Summary */}
        <div className={`text-sm font-medium ${getTrendColor()}`}>
          {getTrendText()}
        </div>

        {/* Chart - only show if more than 1 data point */}
        {chartData.length > 1 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  domain={[0, 100]}
                  className="text-xs"
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Analyses Table */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Recent Analyses</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-center p-3 font-medium">Score</th>
                  <th className="text-right p-3 font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historyData.analyses.slice(0, 5).map((analysis, index) => {
                  const prevScore =
                    index < historyData.analyses.length - 1
                      ? historyData.analyses[index + 1].overallScore
                      : null;
                  const change = prevScore !== null ? analysis.overallScore - prevScore : null;
                  const isLatest = index === 0;

                  return (
                    <tr key={analysis.id} className={isLatest ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                      <td className="p-3">
                        {format(new Date(analysis.analyzedAt), "MMM d, yyyy")}
                        {isLatest && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="text-center p-3 font-semibold">{analysis.overallScore}</td>
                      <td className="text-right p-3">
                        {change !== null ? (
                          <span
                            className={
                              change > 0
                                ? "text-green-600 dark:text-green-400"
                                : change < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                            }
                          >
                            {change > 0 ? `↑ +${change}` : change < 0 ? `↓ ${change}` : "↔ 0"}
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
