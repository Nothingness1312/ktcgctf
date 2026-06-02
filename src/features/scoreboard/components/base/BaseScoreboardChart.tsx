'use client'

import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartData, ChartOptions, Plugin, TooltipItem } from 'chart.js'

import BaseScoreboardCard from './BaseScoreboardCard'

declare module 'chart.js' {
  interface Chart {
    $scoreboardRevealProgress?: number
  }
}

const SERIES_COLORS = [
  '#60a5fa', '#34d399', '#f472b6', '#fb923c', '#a78bfa',
  '#facc15', '#4ade80', '#f87171', '#22d3ee', '#c084fc',
]

const clippedCharts = new WeakSet<ChartJS>()

export type ChartSeries = {
  name: string
  data: { date: string; score: number }[]
}

type BuiltChartPoint = {
  date: string
  [seriesName: string]: string | number | undefined
}

type BaseScoreboardChartProps = {
  title: string
  series: ChartSeries[]
  yAxisTitle?: string
}

const scoreboardRevealPlugin: Plugin<'line'> = {
  id: 'scoreboardRevealClip',
  beforeDatasetsDraw(chart) {
    const progress = chart.$scoreboardRevealProgress ?? 1
    if (progress >= 1) return

    const { ctx, chartArea } = chart
    if (!ctx || !chartArea) return

    const width = (chartArea.right - chartArea.left) * Math.max(0, progress)

    ctx.save()
    clippedCharts.add(chart)
    ctx.beginPath()
    ctx.rect(chartArea.left, chartArea.top, width, chartArea.bottom - chartArea.top)
    ctx.clip()
  },
  afterDatasetsDraw(chart) {
    if (!clippedCharts.has(chart)) return

    clippedCharts.delete(chart)
    chart.ctx?.restore()
  },
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  scoreboardRevealPlugin
)

function buildChartData(series: ChartSeries[]) {
  const allDates = new Set<string>()
  const seriesMeta = series.map(s => {
    const sortedData = [...s.data].sort((a, b) => a.date.localeCompare(b.date))
    sortedData.forEach(p => allDates.add(p.date))

    const firstDate = sortedData[0]?.date
    const baselineDate = firstDate ? getBaselineDate(firstDate) : undefined
    const hasBaseline = Boolean(baselineDate && baselineDate !== firstDate)

    if (hasBaseline && baselineDate) allDates.add(baselineDate)

    return {
      name: s.name,
      data: sortedData,
      baselineDate: hasBaseline ? baselineDate : undefined,
    }
  })

  const sortedDates = Array.from(allDates).sort()

  return sortedDates.map((date) => {
    const point: BuiltChartPoint = { date }
    seriesMeta.forEach(s => {
      if (s.baselineDate && date === s.baselineDate) {
        point[s.name] = 0
        return
      }

      const pts = s.data.filter(p => p.date <= date)
      if (pts.length > 0) point[s.name] = pts[pts.length - 1].score
    })
    return point
  })
}

function toLocalMinuteString(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function getBaselineDate(firstDate: string) {
  const parsedDate = new Date(firstDate)
  if (Number.isNaN(parsedDate.getTime())) return firstDate

  return toLocalMinuteString(new Date(parsedDate.getTime() - 60000))
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

export default function BaseScoreboardChart({
  title,
  series,
  yAxisTitle = 'Score',
}: BaseScoreboardChartProps) {
  const chartRef = React.useRef<ChartJS<'line', (number | null)[], string> | null>(null)

  const builtData = React.useMemo(() => buildChartData(series), [series])
  const labels = React.useMemo(() => builtData.map(point => point.date), [builtData])
  const solveDateSets = React.useMemo(
    () => series.map(s => new Set(s.data.map(point => point.date))),
    [series]
  )
  const chartKey = React.useMemo(
    () => series.map(s => `${s.name}:${s.data.map(p => `${p.date}:${p.score}`).join(',')}`).join('|'),
    [series]
  )

  const chartData = React.useMemo<ChartData<'line', (number | null)[], string>>(() => ({
    labels,
    datasets: series.map((s, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length]

      return {
        label: s.name,
        data: builtData.map(point => {
          const value = point[s.name]
          return typeof value === 'number' ? value : null
        }),
        borderColor: color,
        backgroundColor: color,
        borderWidth: i === 0 ? 2.6 : 2,
        borderCapStyle: 'round' as const,
        borderJoinStyle: 'round' as const,
        order: i,
        stepped: 'after' as const,
        tension: 0,
        pointRadius(context) {
          const date = labels[context.dataIndex]
          return solveDateSets[context.datasetIndex]?.has(date) ? 3 : 0
        },
        pointHitRadius: 12,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: '#f8fafc',
        pointBorderWidth: 2,
        spanGaps: true,
      }
    }),
  }), [builtData, labels, series, solveDateSets])

  const options = React.useMemo<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    transitions: {
      active: {
        animation: {
          duration: 160,
        },
      },
      resize: {
        animation: {
          duration: 250,
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'category',
        grid: {
          color: 'rgba(148,163,184,0.15)',
          tickColor: 'transparent',
        },
        border: {
          color: 'rgba(148,163,184,0.45)',
        },
        ticks: {
          color: 'rgb(148,163,184)',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 50,
          callback(value) {
            return labels[Number(value)]?.slice(0, 10) ?? ''
          },
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: yAxisTitle,
          color: 'rgb(148,163,184)',
          font: { size: 10, weight: 600 },
        },
        grid: {
          color: 'rgba(148,163,184,0.15)',
          tickColor: 'transparent',
        },
        border: {
          color: 'rgba(148,163,184,0.45)',
        },
        ticks: {
          color: 'rgb(148,163,184)',
          font: { size: 10 },
          padding: 8,
          precision: 0,
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          boxWidth: 12,
          boxHeight: 8,
          color: 'rgb(148,163,184)',
          font: { size: 10 },
          padding: 14,
          sort(a, b) {
            return (a.datasetIndex ?? 0) - (b.datasetIndex ?? 0)
          },
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(2,6,23,0.96)',
        borderColor: 'rgba(148,163,184,0.25)',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        padding: 10,
        boxPadding: 6,
        bodySpacing: 5,
        cornerRadius: 8,
        itemSort(a, b) {
          return a.datasetIndex - b.datasetIndex
        },
        callbacks: {
          title(items) {
            return labels[items[0]?.dataIndex ?? 0]?.slice(0, 16) ?? ''
          },
          label(context: TooltipItem<'line'>) {
            return `${context.dataset.label}: ${context.parsed.y}`
          },
        },
      },
    },
  }), [labels, yAxisTitle])

  React.useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    let frameId = 0
    const start = performance.now()
    const duration = 750

    const tick = (now: number) => {
      if (chartRef.current !== chart || !chart.ctx || !chart.canvas) return

      const rawProgress = Math.min((now - start) / duration, 1)
      chart.$scoreboardRevealProgress = easeOutCubic(rawProgress)
      chart.draw()

      if (rawProgress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    chart.$scoreboardRevealProgress = 0
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      chart.$scoreboardRevealProgress = 1
    }
  }, [chartKey])

  return (
    <BaseScoreboardCard
      title={title}
      headerClassName="justify-center border-b-0 pb-1"
      titleClassName="text-center"
      contentClassName="px-3 pt-0 sm:px-5"
    >
      <div className="h-[300px] w-full">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </BaseScoreboardCard>
  )
}
