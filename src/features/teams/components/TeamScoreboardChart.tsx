import BaseScoreboardChart, { type ChartSeries } from '@/features/scoreboard/components/base/BaseScoreboardChart'
import { TeamProgressSeries } from '../types'

interface TeamScoreboardChartProps {
  series: TeamProgressSeries[]
  isDark?: boolean
  scoreLabel?: string
}

function truncate(str: string, n: number) {
  return str.length > n ? `${str.slice(0, n)}...` : str
}

function adjustDate(dateStr: string) {
  const date = new Date(dateStr)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function TeamScoreboardChart({ series, scoreLabel = 'Score' }: TeamScoreboardChartProps) {
  const chartSeries: ChartSeries[] = series.slice(0, 10).map(entry => ({
    name: truncate(entry.team_name, 16),
    data: entry.history.map(p => ({ date: adjustDate(p.date), score: p.score })),
  }))

  return (
    <BaseScoreboardChart
      title="Top 10 Teams"
      series={chartSeries}
      yAxisTitle={scoreLabel}
    />
  )
}
