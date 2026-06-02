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

type ScoreboardEndpointMarker = {
  color: string
  dataIndex: number
  offsetX: number
  offsetY: number
  score: number
}

declare module 'chart.js' {
  interface Chart {
    $scoreboardRevealProgress?: number
    $scoreboardEndpointMarkers?: ScoreboardEndpointMarker[]
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
  startDate?: string
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

const scoreboardEndpointPlugin: Plugin<'line'> = {
  id: 'scoreboardEndpointMarkers',
  afterDatasetsDraw(chart) {
    const markers = chart.$scoreboardEndpointMarkers
    if (!markers?.length || (chart.$scoreboardRevealProgress ?? 1) < 1) return

    const { ctx, chartArea, scales } = chart
    const xScale = scales.x
    const yScale = scales.y
    if (!ctx || !chartArea || !xScale || !yScale) return

    ctx.save()
    markers.forEach((marker) => {
      const x = xScale.getPixelForValue(marker.dataIndex) + marker.offsetX
      const rawY = yScale.getPixelForValue(marker.score) + marker.offsetY
      const y = Math.max(chartArea.top + 5, Math.min(chartArea.bottom - 5, rawY))

      if (x < chartArea.left || x > chartArea.right || y < chartArea.top || y > chartArea.bottom) {
        return
      }

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = marker.color
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#f8fafc'
      ctx.stroke()
    })
    ctx.restore()
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
  scoreboardRevealPlugin,
  scoreboardEndpointPlugin
)

function buildChartData(series: ChartSeries[], startDate?: string) {
  const allDates = new Set<string>()
  const seriesMeta = series.map(s => {
    const sortedData = [...s.data].sort((a, b) => a.date.localeCompare(b.date))
    sortedData.forEach(p => allDates.add(p.date))

    return {
      name: s.name,
      data: sortedData,
    }
  })

  const firstSolveDate = Array.from(allDates).sort()[0]
  const baselineDate = getBaselineDate(startDate, firstSolveDate)
  if (baselineDate) allDates.add(baselineDate)

  const lastSolveDate = Array.from(allDates).sort().at(-1)
  const endPaddingDate = lastSolveDate ? addMinutesToDateString(lastSolveDate, 1) : undefined
  if (endPaddingDate) allDates.add(endPaddingDate)

  const sortedDates = Array.from(allDates).sort()

  return sortedDates.map((date) => {
    const point: BuiltChartPoint = { date }
    seriesMeta.forEach(s => {
      if (baselineDate && date === baselineDate) {
        point[s.name] = 0
        return
      }

      const pts = s.data.filter(p => p.date <= date)
      if (pts.length > 0) point[s.name] = pts[pts.length - 1].score
    })
    return point
  })
}

function addMinutesToDateString(dateString: string, minutes: number) {
  const parsedDate = new Date(dateString)
  if (Number.isNaN(parsedDate.getTime())) return undefined

  return toLocalMinuteString(new Date(parsedDate.getTime() + minutes * 60000))
}

function getBaselineDate(startDate?: string, firstSolveDate?: string) {
  if (!firstSolveDate) return startDate
  if (startDate && startDate < firstSolveDate) return startDate

  const dayStart = `${firstSolveDate.slice(0, 10)}T00:00`
  return dayStart < firstSolveDate ? dayStart : undefined
}

function getFirstSolveDate(series: ChartSeries) {
  return [...series.data].sort((a, b) => a.date.localeCompare(b.date))[0]?.date
}

function toLocalMinuteString(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function buildEndpointMarkers(series: ChartSeries[], builtData: BuiltChartPoint[], labels: string[]) {
  const endpointIndex = labels.length - 1
  const endpoint = builtData[endpointIndex]
  if (!endpoint) return []

  const groups = new Map<number, { color: string; index: number }[]>()

  series.forEach((s, index) => {
    const value = endpoint[s.name]
    if (typeof value !== 'number') return

    const group = groups.get(value) ?? []
    group.push({
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      index,
    })
    groups.set(value, group)
  })

  return Array.from(groups.entries()).flatMap(([score, group]) => {
    const sortedGroup = [...group].sort((a, b) => a.index - b.index)
    const center = (sortedGroup.length - 1) / 2
    const gap = sortedGroup.length > 5 ? 6 : 8

    return sortedGroup.map((entry, index) => ({
      color: entry.color,
      dataIndex: endpointIndex,
      offsetX: -8,
      offsetY: (index - center) * gap,
      score,
    }))
  })
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

export default function BaseScoreboardChart({
  title,
  series,
  yAxisTitle = 'Score',
  startDate,
}: BaseScoreboardChartProps) {
  const chartRef = React.useRef<ChartJS<'line', (number | null)[], string> | null>(null)

  const builtData = React.useMemo(() => buildChartData(series, startDate), [series, startDate])
  const labels = React.useMemo(() => builtData.map(point => point.date), [builtData])
  const endpointMarkers = React.useMemo(
    () => buildEndpointMarkers(series, builtData, labels),
    [builtData, labels, series]
  )
  const solveDateSets = React.useMemo(
    () => series.map(s => new Set(s.data.map(point => point.date))),
    [series]
  )
  const drawOrderByName = React.useMemo(() => {
    const orderedSeries = series
      .map((s, index) => ({
        name: s.name,
        index,
        firstSolveDate: getFirstSolveDate(s),
      }))
      .sort((a, b) => {
        if (!a.firstSolveDate && !b.firstSolveDate) return a.index - b.index
        if (!a.firstSolveDate) return 1
        if (!b.firstSolveDate) return -1
        return a.firstSolveDate.localeCompare(b.firstSolveDate) || a.index - b.index
      })

    return new Map(orderedSeries.map((s, index) => [s.name, index]))
  }, [series])
  const chartKey = React.useMemo(
    () => `${startDate ?? ''}|${series.map(s => `${s.name}:${s.data.map(p => `${p.date}:${p.score}`).join(',')}`).join('|')}`,
    [series, startDate]
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
        order: drawOrderByName.get(s.name) ?? i,
        stepped: 'before' as const,
        tension: 0,
        pointRadius(context) {
          const date = labels[context.dataIndex]
          return solveDateSets[context.datasetIndex]?.has(date) ? 3 : 0
        },
        pointHitRadius: 12,
        pointHoverRadius(context) {
          return context.dataIndex === labels.length - 1 ? 0 : 5
        },
        pointBackgroundColor: color,
        pointBorderColor: '#f8fafc',
        pointBorderWidth: 2,
        spanGaps: true,
      }
    }),
  }), [builtData, drawOrderByName, labels, series, solveDateSets])

  React.useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.$scoreboardEndpointMarkers = endpointMarkers

    return () => {
      chart.$scoreboardEndpointMarkers = undefined
    }
  }, [endpointMarkers])

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
