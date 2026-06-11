'use client'

import { useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Coins, Sparkles, Trophy, Rocket } from 'lucide-react'

import { APP } from '@/config'
import Loader from '@/shared/components/Loader'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import PageBackground from '@/shared/components/PageBackground'
import EventSelect from '@/features/events/components/EventSelect'
import { AppTabs, Card, CardContent } from '@/shared/ui'
import {
  PAGE_MAIN_CONTAINER_6XL,
  SURFACE_GLASS_CARD_INTERACTIVE_BLUE_CLASS,
  THEME_PRIMARY_SELECTION_CLASS,
} from '@/shared/styles'
import { useAuth } from '@/shared/contexts/AuthContext'
import { useTheme } from '@/shared/contexts/ThemeContext'
import { useEventContext } from '@/features/events/contexts/EventContext'

import TeamScoreboardChart from './TeamScoreboardChart'
import TeamScoreboardTable from './TeamScoreboardTable'
import { useTeamScoreboard } from '../hooks/useTeamScoreboard'
import ScoreboardExportActions from '@/features/scoreboard/components/ScoreboardExportActions'
import { buildScoreboard, getOrderedProgressSeries } from '@/features/scoreboard/lib/build-scoreboard'
import type { ScoreboardExportSnapshot } from '@/features/scoreboard/lib/scoreboard-export-data'
import {
  getTeamScoreboard,
  getTopTeamProgressByNames,
  getTopTeamUniqueProgressByNames,
} from '../services/team.service'
import type { TeamProgressSeries, TeamScoreboardEntry } from '../types'

import { cn } from '@/shared/lib/utils'

export default function TeamScoreboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()
  const { startedEvents, selectedEvent, setSelectedEvent } = useEventContext()

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const showTotalScore = useMemo(() => {
    return searchParams.get('tab') === 'total'
  }, [searchParams])
  const setShowTotalScore = useCallback((value: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('tab', 'total')
    } else {
      params.set('tab', 'unique')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!authLoading && user && !APP.teams.enabled) {
      router.replace('/scoreboard')
    }
  }, [authLoading, user, router])

  const { loading, entries, series, currentTeamName } = useTeamScoreboard(user, showTotalScore, selectedEvent)

  const isDark = theme === 'dark'
  const scoreLabel = showTotalScore ? 'Total Score' : 'Unique Score'
  const selectedScoreboardEvent = selectedEvent === 'all' || selectedEvent === 'main'
    ? undefined
    : startedEvents.find((event) => String(event.id) === String(selectedEvent))
  const exportEventLabel = selectedEvent === 'all'
    ? 'All Events'
    : selectedEvent === 'main'
      ? 'Main Scoreboard'
      : String(selectedScoreboardEvent?.name ?? 'Selected Event')
  const exportType = showTotalScore ? 'total_score' : 'unique_score'

  const fetchTeamExportSnapshot = useCallback(async ({
    fromRank,
    toRank,
    sourceUrl,
  }: {
    fromRank: number
    toRank: number
    sourceUrl: string
  }): Promise<ScoreboardExportSnapshot> => {
    const p_event_id = (selectedEvent === 'all' || selectedEvent === 'main') ? null : String(selectedEvent)
    const p_event_mode = selectedEvent === 'all' ? 'any' : selectedEvent === 'main' ? 'main' : 'event'
    const safeFromRank = Math.max(1, Math.floor(fromRank))
    const safeToRank = Math.max(safeFromRank, Math.floor(toRank))
    const fetchLimit = Math.max(10, safeToRank)
    const scoreKey = showTotalScore ? 'total_score' : 'unique_score'
    const { entries: data } = await getTeamScoreboard(fetchLimit, 0, p_event_id, p_event_mode)
    const result = buildScoreboard(data || [], {
      nameKey: 'team_name',
      scoreKey,
      filterZero: true,
      limit: fetchLimit,
    })
    const teamEntries: TeamScoreboardEntry[] = result.entries.map((entry) => {
      const original = (data || []).find((item) => item.team_name === entry.username)
      return {
        ...original,
        team_id: entry.id,
        team_name: entry.username,
        [scoreKey]: entry.score,
      } as TeamScoreboardEntry
    })
    const progressData = showTotalScore
      ? await getTopTeamProgressByNames(result.topNames, p_event_id, p_event_mode)
      : await getTopTeamUniqueProgressByNames(result.topNames, p_event_id, p_event_mode)

    return {
      tableEntries: teamEntries.slice(safeFromRank - 1, safeToRank),
      chartEntries: getOrderedProgressSeries(result.topNames, progressData) as TeamProgressSeries[],
      exportedAt: new Date().toISOString(),
      mode: 'points',
      eventLabel: exportEventLabel,
      sourceUrl,
      scope: 'team',
      fileType: exportType,
      fromRank: safeFromRank,
      toRank: safeToRank,
    }
  }, [exportEventLabel, exportType, selectedEvent, showTotalScore])

  if (authLoading) {
    return <Loader fullscreen color="text-blue-500" />
  }

  if (!user || !APP.teams.enabled) return null

  return (
    <PageBackground
      selectionClassName={THEME_PRIMARY_SELECTION_CLASS}
      contentClassName={cn(PAGE_MAIN_CONTAINER_6XL, "space-y-4 py-4 sm:py-6")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Event Filter */}
        <div className="w-full sm:w-auto">
          <EventSelect
            value={String(selectedEvent)}
            onChange={setSelectedEvent as any}
            events={startedEvents}
            className="w-full max-w-full sm:w-[180px]"
            defaultValue="all"
            clearable
            getEventLabel={(ev: any) => String(ev?.name ?? ev?.title ?? 'Untitled')}
          />
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {entries.length > 0 && (
            <ScoreboardExportActions
              selectedEvent={selectedEvent}
              eventLabel={exportEventLabel}
              mode="points"
              modeLabel={scoreLabel}
              fetchSnapshot={fetchTeamExportSnapshot}
              renderChart={(snapshot) => (
                <TeamScoreboardChart
                  series={snapshot.chartEntries as TeamProgressSeries[]}
                  isDark={isDark}
                  scoreLabel={scoreLabel}
                />
              )}
              renderTable={(snapshot) => (
                <TeamScoreboardTable
                  entries={snapshot.tableEntries as TeamScoreboardEntry[]}
                  showTotalScore={showTotalScore}
                  rankOffset={snapshot.fromRank - 1}
                />
              )}
            />
          )}
          <AppTabs
            items={[
              { value: 'unique', label: 'Unique Score', icon: Sparkles },
              ...(!APP.teams.hidescoreboardTotal
                ? [{ value: 'total' as const, label: 'Total Score', icon: Coins }]
                : []),
            ]}
            value={showTotalScore ? 'total' : 'unique'}
            onValueChange={(tab) => setShowTotalScore(tab === 'total')}
            variant="panel"
            size="sm"
            className="w-full sm:w-fit"
            stretch
            ariaLabel="Team scoreboard mode"
          />
        </div>
      </div>

      <div
        key={`${showTotalScore}-${selectedEvent}`}
        className="space-y-6"
      >
        {series.length > 0 && !showTotalScore && (
          <TeamScoreboardChart
            series={series}
            isDark={isDark}
            scoreLabel={scoreLabel}
          />
        )}

        {loading && entries.length === 0 ? (
          <PageLoader />
        ) : entries.length === 0 ? (
          <Card className={SURFACE_GLASS_CARD_INTERACTIVE_BLUE_CLASS}>
            <CardContent>
              <EmptyState
                icon={<Trophy className="w-full h-full text-blue-500" />}
                title="No teams on the board yet."
                description={
                  <>
                    No team submissions yet for this event. Start solving challenges with your team!
                    <Rocket size={14} className="inline-block ml-1 text-blue-400/70" />
                  </>
                }
                containerHeight="py-12"
              />
            </CardContent>
          </Card>
        ) : (
          <TeamScoreboardTable
            entries={entries}
            showTotalScore={showTotalScore}
            currentTeamName={currentTeamName}
          />
        )}
      </div>
    </PageBackground>
  )
}
