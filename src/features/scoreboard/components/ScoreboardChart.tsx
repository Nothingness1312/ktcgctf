import { LeaderboardEntry } from '@/shared/types'
import BaseScoreboardChart, { type ChartSeries } from './base/BaseScoreboardChart'

interface ScoreboardChartProps {
  leaderboard: LeaderboardEntry[]
  isDark?: boolean
}

function truncate(str: string, n: number) {
  return str.length > n ? `${str.slice(0, n)}...` : str
}

function adjustDate(dateStr: string) {
  const date = new Date(dateStr)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function ScoreboardChart({ leaderboard }: ScoreboardChartProps) {
  const series: ChartSeries[] = leaderboard.slice(0, 10).map((entry) => {
    const shortName = truncate(entry.username, 16)

    return {
      name: shortName,
      data: entry.progress.map((point) => ({
        date: adjustDate(point.date),
        score: point.score,
      })),
    }
  })

  return <BaseScoreboardChart title="Top 10 Users" series={series} />
}
