"use client"

import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Server } from 'lucide-react'
import APP from '@/config'
import { SegmentedTabs } from '@/shared/components'
import { AdminContentLoading, AdminPageShell, AdminPageSurface, AdminTabsBar } from '@/features/admin/ui'
import {
  buildLiveServiceRows,
  buildPlatformChallengeGroups,
  getFilteredLiveRows,
  getFilteredPlatformGroups,
  getUniqueOptions,
} from '../lib/admin-services-utils'
import { useAdminServicesData } from '../hooks/useAdminServicesData'
import { useChallengeForm } from '../../challenges/hooks/useChallengeForm'
import type { AdminServiceRow, AdminServicesFilters, AdminServiceTab } from '../types'
import { FlagPreviewDialog } from '../../challenges/components/FlagPreviewDialog'
import ChallengeFormDialogHost from '../../challenges/components/ChallengeFormDialogHost'
import AdminLiveServicesTable from './AdminLiveServicesTable'
import AdminPlatformChallengesTable from './AdminPlatformChallengesTable'
import AdminServicesToolbar from './AdminServicesToolbar'

const DEFAULT_FILTERS: AdminServicesFilters = {
  search: '',
  key: 'all',
  enabled: 'all',
  requiresKey: 'all',
  keyAvailable: 'all',
  validity: 'all',
  source: 'all',
  runtimeStatus: 'all',
}

function SafeStatusNotice({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <AdminPageSurface className="border-amber-500/25 bg-amber-500/10">
      <div className="flex gap-3 px-5 py-4 text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="break-words text-xs text-amber-700 dark:text-amber-200/80">
            {message}
          </div>
        </div>
      </div>
    </AdminPageSurface>
  )
}

export default function AdminServicesPage() {
  const {
    user,
    authLoading,
    accessReady,
    isAllowed,
    isGlobalAdmin,
    events,
    serviceRows,
    platformEntries,
    platformError,
    runtimeStatus,
    isLoading,
    isRefreshing,
    statusLoading,
    actionLoading,
    globalActionLoading,
    refresh,
    runNxctlAction,
    runGlobalServiceAction,
  } = useAdminServicesData()

  const [activeTab, setActiveTab] = useState<AdminServiceTab>('platform')
  const [filters, setFilters] = useState<AdminServicesFilters>(DEFAULT_FILTERS)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [openForm, setOpenForm] = useState(false)
  const challengeForm = useChallengeForm()

  const {
    loadChallengeForEdit,
    flagPreviewOpen,
    setFlagPreviewOpen,
    fetchedFlag,
    setFetchedFlag,
  } = challengeForm

  useEffect(() => {
    if (serviceRows.length === 0 && runtimeStatus.details.length === 0 && platformEntries.length === 0) return
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [platformEntries.length, runtimeStatus.details.length, serviceRows.length])

  const platformGroups = useMemo(
    () => buildPlatformChallengeGroups(
      platformEntries,
      serviceRows,
      runtimeStatus.details,
      runtimeStatus.fetchedAt,
      nowTick
    ),
    [nowTick, platformEntries, runtimeStatus.details, runtimeStatus.fetchedAt, serviceRows]
  )

  const enrichedPlatformEntries = useMemo(
    () => platformGroups.flatMap((group) => group.entries),
    [platformGroups]
  )

  const livePlatformEntries = useMemo(() => {
    const entriesById = new Map<string, typeof platformEntries[number]>()
    ;[...platformEntries, ...enrichedPlatformEntries].forEach((entry) => {
      if (!entriesById.has(entry.id)) entriesById.set(entry.id, entry)
    })
    return Array.from(entriesById.values())
  }, [enrichedPlatformEntries, platformEntries])

  const liveRows = useMemo(
    () => buildLiveServiceRows(
      runtimeStatus.details,
      serviceRows,
      livePlatformEntries,
      runtimeStatus.fetchedAt,
      nowTick
    ),
    [livePlatformEntries, nowTick, runtimeStatus.details, runtimeStatus.fetchedAt, serviceRows]
  )

  const filteredPlatformGroups = useMemo(
    () => getFilteredPlatformGroups(platformGroups, filters, nowTick),
    [filters, nowTick, platformGroups]
  )
  const filteredLiveRows = useMemo(
    () => getFilteredLiveRows(liveRows, filters),
    [filters, liveRows]
  )
  const keyOptions = useMemo(
    () => getUniqueOptions([
      ...platformEntries.map((entry) => entry.key),
      ...serviceRows.map((row) => row.service.key),
    ]),
    [platformEntries, serviceRows]
  )

  const handleOpenEdit = async (row: AdminServiceRow) => {
    await loadChallengeForEdit(row.challenge)
    setOpenForm(true)
  }

  if (authLoading || !accessReady) return <AdminContentLoading variant="services" />
  if (!user || !isAllowed) return null

  if (isLoading) {
    return (
      <AdminPageShell>
        <AdminContentLoading variant="services" />
      </AdminPageShell>
    )
  }

  return (
    <>
      <AdminPageShell>
        <div className="space-y-5">
          {platformError && (
            <SafeStatusNotice
              title="Platform config unavailable"
              message={platformError}
            />
          )}

          {runtimeStatus.error && (
            <SafeStatusNotice
              title={runtimeStatus.isComplete ? 'Runtime status warning' : 'Full live inventory unavailable'}
              message={runtimeStatus.isComplete ? runtimeStatus.error : `${runtimeStatus.error}. Showing any fallback runtime data that could be loaded.`}
            />
          )}

          <AdminTabsBar
            tabs={
              <SegmentedTabs
                value={activeTab}
                onChange={setActiveTab}
                variant="panel"
                items={[
                  {
                    value: 'platform',
                    label: 'Platform Services',
                    icon: Server,
                  },
                  {
                    value: 'live',
                    label: 'Live Services',
                    icon: Activity,
                  },
                ]}
              />
            }
          />

          <AdminPageSurface>
            <AdminServicesToolbar
              filters={filters}
              keyOptions={keyOptions}
              isRefreshing={isRefreshing}
              statusLoading={statusLoading}
              onFiltersChange={setFilters}
              onRefresh={() => void refresh()}
            />

            {activeTab === 'platform' ? (
              <AdminPlatformChallengesTable
                groups={filteredPlatformGroups}
                onEditChallenge={(row) => void handleOpenEdit(row)}
              />
            ) : (
              <AdminLiveServicesTable
                rows={filteredLiveRows}
                isGlobalAdmin={isGlobalAdmin}
                actionLoading={actionLoading}
                globalActionLoading={globalActionLoading}
                onNxctlAction={(target, action) => void runNxctlAction(target, action)}
                onGlobalAction={(action) => void runGlobalServiceAction(action)}
              />
            )}
          </AdminPageSurface>
        </div>
      </AdminPageShell>

      <ChallengeFormDialogHost
        open={openForm}
        onOpenChange={setOpenForm}
        challengeForm={challengeForm}
        categories={APP.challengeCategories || []}
        events={events}
        hideMainEventOption={!isGlobalAdmin}
        onSubmitSuccess={() => { void refresh() }}
      />

      <FlagPreviewDialog
        open={flagPreviewOpen}
        onOpenChange={(value) => {
          if (!value) {
            setFlagPreviewOpen(false)
            setFetchedFlag(null)
          }
        }}
        fetchedFlag={fetchedFlag}
      />
    </>
  )
}
