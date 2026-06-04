import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Edit, KeyRound } from 'lucide-react'
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
import { AdminEmptyState, AdminPageSurface, AdminTableSurface } from '@/features/admin/ui'
import type {
  AdminPlatformChallengeEntry,
  AdminPlatformChallengeGroup,
  AdminPlatformChallengeKeyGroup,
  AdminServiceRow,
} from '../types'

type AdminPlatformChallengesTableProps = {
  groups: AdminPlatformChallengeGroup[]
  onEditChallenge: (row: AdminServiceRow) => void
}

type PlatformGroupMetrics = {
  isInvalid: boolean
  validKeys: number
  invalidKeys: number
}

function getUniqueChallengeRows(rows: AdminServiceRow[]) {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.challenge.id)) return false
    seen.add(row.challenge.id)
    return true
  })
}

function hasActualService(entry: AdminPlatformChallengeEntry) {
  return Boolean(entry.liveDetails)
}

function hasAnyActualService(group: AdminPlatformChallengeGroup) {
  return group.entries.some(hasActualService)
}

function isEntryMissingKey(entry: AdminPlatformChallengeEntry) {
  return !entry.key || (entry.requiresKey && !entry.keyAvailable)
}

function isEntryInvalidKey(entry: AdminPlatformChallengeEntry) {
  if (!hasActualService(entry)) return false
  return (
    !entry.key ||
    entry.comparison === 'missing_from_platform' ||
    (entry.requiresKey && !entry.keyAvailable)
  )
}

function isEntryDisabled(entry: AdminPlatformChallengeEntry) {
  return !entry.enabled
}

function isEntryInvalid(entry: AdminPlatformChallengeEntry) {
  const challengeRows = getUniqueChallengeRows(entry.matchedServiceRows)
  return (
    !hasActualService(entry) ||
    isEntryDisabled(entry) ||
    isEntryInvalidKey(entry) ||
    challengeRows.length === 0
  )
}

function getGroupMetrics(group: AdminPlatformChallengeGroup): PlatformGroupMetrics {
  const metrics: PlatformGroupMetrics = {
    isInvalid: false,
    validKeys: 0,
    invalidKeys: 0,
  }
  const groupHasActualService = hasAnyActualService(group)

  group.entries.forEach((entry) => {
    const challengeRows = getUniqueChallengeRows(entry.matchedServiceRows)
    metrics.isInvalid =
      metrics.isInvalid ||
      challengeRows.length === 0 ||
      isEntryDisabled(entry) ||
      !hasActualService(entry)

    if (!groupHasActualService || isEntryInvalidKey(entry)) metrics.invalidKeys += 1
    else if (entry.key) metrics.validKeys += 1
  })

  metrics.isInvalid = metrics.isInvalid || metrics.invalidKeys > 0

  return metrics
}

function isKeyGroupInvalid(keyGroup: AdminPlatformChallengeKeyGroup, forceInvalid = false) {
  return forceInvalid || keyGroup.entries.some(isEntryInvalidKey)
}

function sortEntries(entries: AdminPlatformChallengeEntry[]) {
  return [...entries].sort((a, b) => {
    const aInvalid = isEntryInvalid(a)
    const bInvalid = isEntryInvalid(b)
    if (aInvalid !== bInvalid) return aInvalid ? 1 : -1
    return a.serviceName.localeCompare(b.serviceName)
  })
}

function sortChallengeRows(rows: AdminServiceRow[]) {
  return getUniqueChallengeRows(rows).sort((a, b) => a.challenge.title.localeCompare(b.challenge.title))
}

function CountBadge({
  count,
  tone,
}: {
  count: number
  tone: 'valid' | 'invalid'
}) {
  const className =
    tone === 'valid'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : count > 0
        ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300'
        : 'border-gray-300/80 bg-gray-100/60 text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400'

  return (
    <Badge variant="outline" className={className}>
      {count}
    </Badge>
  )
}

function ReasonBadge({
  active,
  label,
  tone = 'neutral',
}: {
  active: boolean
  label: string
  tone?: 'neutral' | 'invalid'
}) {
  if (!active) return null

  const className =
    tone === 'invalid'
      ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300'
      : 'border-gray-300/80 bg-gray-100/60 text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300'

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

function ChallengeActions({
  row,
  onEditChallenge,
}: {
  row: AdminServiceRow
  onEditChallenge: (row: AdminServiceRow) => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 shrink-0 rounded-lg px-2.5 text-xs"
      onClick={() => onEditChallenge(row)}
    >
      <Edit className="h-3.5 w-3.5" />
      Edit
    </Button>
  )
}

export default function AdminPlatformChallengesTable({
  groups,
  onEditChallenge,
}: AdminPlatformChallengesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aMetrics = getGroupMetrics(a)
      const bMetrics = getGroupMetrics(b)
      if (aMetrics.validKeys !== bMetrics.validKeys) {
        return bMetrics.validKeys - aMetrics.validKeys
      }
      if (aMetrics.invalidKeys !== bMetrics.invalidKeys) {
        return aMetrics.invalidKeys - bMetrics.invalidKeys
      }
      if (aMetrics.isInvalid !== bMetrics.isInvalid) {
        return aMetrics.isInvalid ? 1 : -1
      }
      return a.name.localeCompare(b.name)
    })
  }, [groups])

  const toggleGroup = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (sortedGroups.length === 0) {
    return (
      <div className="p-5">
        <AdminEmptyState
          title="No platform services found"
          description="Try adjusting filters, or check challenge services in Supabase."
        />
      </div>
    )
  }

  return (
    <>
      <AdminTableSurface>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200/80 hover:bg-transparent dark:border-gray-800">
              <TableHead className="pl-6">Challenge / Service</TableHead>
              <TableHead className="w-28 text-center">Valid Key</TableHead>
              <TableHead className="w-28 pr-6 text-center">Invalid Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGroups.map((group) => {
              const isExpanded = expandedId === group.id
              const metrics = getGroupMetrics(group)
              const challengeRows = getUniqueChallengeRows(group.matchedServiceRows)
              const groupNameInvalid = !hasAnyActualService(group)

              return (
                <Fragment key={group.id}>
                  <TableRow
                    className="cursor-pointer border-b border-gray-100/80 transition-colors duration-150 ease-in-out hover:bg-blue-50/40 dark:border-gray-800/70 dark:hover:bg-blue-900/10"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <TableCell className="pl-6">
                      <div className="flex min-w-[260px] items-center gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-lg"
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleGroup(group.id)
                          }}
                          aria-label={isExpanded ? 'Collapse challenge details' : 'Expand challenge details'}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>

                        <div className="min-w-0 space-y-1">
                          <div className={groupNameInvalid ? 'truncate font-semibold text-red-700 dark:text-red-300' : 'truncate font-semibold text-gray-900 dark:text-gray-100'}>
                            {group.name}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <ReasonBadge active={challengeRows.length > 0} label={`${challengeRows.length} challenge${challengeRows.length === 1 ? '' : 's'}`} />
                            <ReasonBadge active={group.keyCount > 1} label={`${group.keyCount} keys`} />
                            <ReasonBadge active={group.keyCount === 1} label="1 key" />
                            <ReasonBadge active={group.serviceCount > 1} label={`${group.serviceCount} services`} />
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <CountBadge count={metrics.validKeys} tone="valid" />
                    </TableCell>
                    <TableCell className="pr-6 text-center">
                      <CountBadge count={metrics.invalidKeys} tone="invalid" />
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow className="border-b border-gray-100/80 hover:bg-transparent dark:border-gray-800/70">
                      <TableCell colSpan={3} className="bg-gray-50/70 px-4 py-3 dark:bg-[#0d121d]/70">
                        <div className="space-y-1.5">
                          {[...group.keyGroups]
                            .sort((a, b) => {
                              const aInvalid = isKeyGroupInvalid(a, groupNameInvalid)
                              const bInvalid = isKeyGroupInvalid(b, groupNameInvalid)
                              if (aInvalid !== bInvalid) return aInvalid ? 1 : -1
                              return a.key.localeCompare(b.key)
                            })
                            .map((keyGroup) => {
                              const isNoKeyGroup = keyGroup.key === 'No key'
                              const keyInvalid = isKeyGroupInvalid(keyGroup, groupNameInvalid)

                              return (
                                <div
                                  key={`${group.id}:${keyGroup.key}`}
                                  className="grid gap-2 rounded-lg border border-gray-200/80 bg-white/70 px-2.5 py-2 dark:border-gray-800/80 dark:bg-[#111622]/70 md:grid-cols-[180px_minmax(0,1fr)]"
                                >
                                  <div className="flex min-w-0 items-center justify-center gap-2 md:justify-start">
                                    {!isNoKeyGroup && (
                                      <KeyRound className={keyInvalid ? 'h-4 w-4 shrink-0 text-red-500' : 'h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300'} />
                                    )}
                                    <code className={
                                      isNoKeyGroup
                                        ? 'min-w-0 truncate rounded-md border border-gray-300/70 bg-transparent px-2 py-1 text-center text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400'
                                        : keyInvalid
                                          ? 'min-w-0 truncate rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-center text-xs font-semibold text-red-700 dark:text-red-300'
                                          : 'min-w-0 truncate rounded-md bg-gray-100 px-2 py-1 text-center text-xs font-semibold text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                                    }>
                                      {keyGroup.key}
                                    </code>
                                  </div>

                                  <div className="space-y-1.5">
                                    {sortEntries(keyGroup.entries).map((entry) => {
                                      const challengeRowsForEntry = sortChallengeRows(entry.matchedServiceRows)

                                      if (challengeRowsForEntry.length === 0) {
                                        return (
                                          <div
                                            key={entry.id}
                                            className="flex items-center justify-between gap-3 rounded-md border border-red-500/20 bg-red-500/5 px-2.5 py-1.5"
                                          >
                                            <div className="min-w-0">
                                              <div className="truncate text-sm font-semibold text-red-700 dark:text-red-300">
                                                {entry.serviceName}
                                              </div>
                                              <div className="truncate text-xs text-red-600/80 dark:text-red-300/80">
                                                No Supabase challenge uses this service
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      }

                                      return challengeRowsForEntry.map((row) => {
                                        const rowInvalid = !hasActualService(entry) || isEntryDisabled(entry) || isEntryInvalidKey(entry)

                                        return (
                                          <div
                                            key={`${entry.id}:${row.challenge.id}`}
                                            className={rowInvalid ? 'flex flex-col gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between' : 'flex flex-col gap-2 rounded-md border border-gray-200/70 bg-white/50 px-2.5 py-1.5 dark:border-gray-800/70 dark:bg-[#0d121d]/60 sm:flex-row sm:items-center sm:justify-between'}
                                          >
                                            <div className="min-w-0">
                                              <div className={rowInvalid ? 'truncate text-sm font-semibold text-red-700 dark:text-red-300' : 'truncate text-sm font-semibold text-gray-900 dark:text-gray-100'}>
                                                {row.challenge.title}
                                              </div>
                                              <div className="flex flex-wrap gap-1.5 pt-1">
                                                <ReasonBadge active={!hasActualService(entry)} label="Missing actual service" tone="invalid" />
                                                <ReasonBadge active={hasActualService(entry) && isEntryMissingKey(entry)} label="Missing key" tone="invalid" />
                                                <ReasonBadge active={hasActualService(entry) && entry.comparison === 'missing_from_platform'} label="Invalid key" tone="invalid" />
                                              </div>
                                            </div>
                                            <ChallengeActions row={row} onEditChallenge={onEditChallenge} />
                                          </div>
                                        )
                                      })
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </AdminTableSurface>
    </>
  )
}
