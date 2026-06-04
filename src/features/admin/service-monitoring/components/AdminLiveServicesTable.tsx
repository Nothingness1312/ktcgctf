import { Clock, Copy, ExternalLink, Loader2, Play, Power, PowerOff, RefreshCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
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
import type { AdminLiveServiceRow, AdminNxctlActionTarget, AdminServiceAction } from '../types'
import AdminServiceStatusBadge from './AdminServiceStatusBadge'

type AdminLiveServicesTableProps = {
  rows: AdminLiveServiceRow[]
  isGlobalAdmin: boolean
  actionLoading: Record<string, AdminServiceAction | null>
  globalActionLoading: 'up' | 'down' | null
  onNxctlAction: (target: AdminNxctlActionTarget, action: AdminServiceAction) => void
  onGlobalAction: (action: 'up' | 'down') => void
}

function copyEndpoint(text: string) {
  navigator.clipboard?.writeText(text)
  toast.success('Copied endpoint')
}

function getRawEndpoint(row: AdminLiveServiceRow) {
  const exports = row.details.exports || []
  const first = exports[0] as any
  return String(first?.endpoint || first?.url || '').trim()
}

function getEndpointPort(endpoint: string) {
  if (!endpoint) return ''

  try {
    const parsed = new URL(endpoint)
    return parsed.port
  } catch {
    const match = endpoint.match(/:(\d+)(?:\/)?$/)
    return match?.[1] || ''
  }
}

function getActionTarget(row: AdminLiveServiceRow): AdminNxctlActionTarget | null {
  const platformEntry = row.platformEntries.find((entry) => entry.key) || row.platformEntries[0]
  if (!platformEntry) return null

  return {
    id: `live:${row.id}:${platformEntry.id}`,
    name: row.name,
    key: platformEntry.key,
    details: row.details,
    error: null,
    fetchedAt: row.fetchedAt,
  }
}

function getExtendState(row: AdminLiveServiceRow) {
  const remaining = row.details.runtime.remaining_seconds
  const extend = row.details.runtime.extend && typeof row.details.runtime.extend === 'object'
    ? row.details.runtime.extend as Record<string, unknown>
    : {}
  const thresholdSeconds = Number(extend.threshold_seconds || 300)
  const cooldownSeconds = Math.max(0, Number(row.details.runtime.extend_cooldown || 0))
  const backendCanExtend = extend.can_extend === true

  return {
    remaining,
    canExtend: remaining !== null && (backendCanExtend || (remaining <= thresholdSeconds && cooldownSeconds === 0)),
  }
}

function LiveNxctlActions({
  row,
  target,
  isGlobalAdmin,
  loadingAction,
  onAction,
}: {
  row: AdminLiveServiceRow
  target: AdminNxctlActionTarget
  isGlobalAdmin: boolean
  loadingAction: AdminServiceAction | null
  onAction: (target: AdminNxctlActionTarget, action: AdminServiceAction) => void
}) {
  const isRunning = row.status === 'running'
  const isBusy = loadingAction !== null
  const hasKey = target.key.trim() !== ''
  const restartCooldown = Math.max(0, Number(row.details.runtime.restart_cooldown || 0))
  const restartEnabled = row.details.runtime.can_restart !== false
  const extendState = getExtendState(row)
  const actionButtonClass = 'h-8 rounded-lg px-2.5 text-xs'

  const renderIcon = (action: AdminServiceAction, fallback: ReactNode) => (
    loadingAction === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : fallback
  )

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={actionButtonClass}
        onClick={() => onAction(target, 'up')}
        disabled={isBusy || isRunning || !hasKey}
        title={!hasKey ? 'Challenge key is missing from NXCTL admin config' : isRunning ? 'Service is already running' : 'Start service'}
      >
        {renderIcon('up', <Play className="h-3.5 w-3.5" />)}
        Start
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={actionButtonClass}
        onClick={() => onAction(target, 'restart')}
        disabled={isBusy || !isRunning || !hasKey || !restartEnabled || restartCooldown > 0}
        title={!restartEnabled ? 'Restart disabled for this service' : 'Restart service'}
      >
        {renderIcon('restart', <RefreshCcw className="h-3.5 w-3.5" />)}
        Restart
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={actionButtonClass}
        onClick={() => onAction(target, 'extend')}
        disabled={isBusy || !isRunning || !hasKey || !extendState.canExtend}
        title={extendState.remaining === null ? 'No expiration data available' : 'Extend service time'}
      >
        {renderIcon('extend', <Clock className="h-3.5 w-3.5" />)}
        Extend
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={actionButtonClass}
        onClick={() => onAction(target, 'down')}
        disabled={isBusy || !isRunning || !isGlobalAdmin}
        title={isGlobalAdmin ? 'Stop service' : 'Only global admins can stop services'}
      >
        {renderIcon('down', <PowerOff className="h-3.5 w-3.5" />)}
        Stop
      </Button>
    </div>
  )
}

export default function AdminLiveServicesTable({
  rows,
  isGlobalAdmin,
  actionLoading,
  globalActionLoading,
  onNxctlAction,
  onGlobalAction,
}: AdminLiveServicesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="p-5">
        <AdminEmptyState
          title="No live services found"
          description="Try adjusting filters, or refresh once NXCTL runtime data is available."
        />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-gray-200/70 px-5 py-3 dark:border-gray-800">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => onGlobalAction('up')}
          disabled={!isGlobalAdmin || globalActionLoading !== null}
          title={isGlobalAdmin ? 'Start all NXCTL services' : 'Only global admins can start all services'}
        >
          {globalActionLoading === 'up' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
          Up all
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-300"
          onClick={() => onGlobalAction('down')}
          disabled={!isGlobalAdmin || globalActionLoading !== null}
          title={isGlobalAdmin ? 'Stop all NXCTL services' : 'Only global admins can stop all services'}
        >
          {globalActionLoading === 'down' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
          Down all
        </Button>
      </div>
      <AdminTableSurface>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200/80 hover:bg-transparent dark:border-gray-800">
              <TableHead className="pl-6">Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const rawEndpoint = getRawEndpoint(row)
              const endpointPort = getEndpointPort(rawEndpoint)
              const actionTarget = getActionTarget(row)

              return (
                <TableRow
                  key={row.id}
                  className="border-b border-gray-100/80 transition-colors duration-150 ease-in-out last:border-b-0 hover:bg-blue-50/40 dark:border-gray-800/70 dark:hover:bg-blue-900/10"
                >
                  <TableCell className="pl-6">
                    <div className="min-w-[220px]">
                      <div className="truncate font-semibold text-gray-900 dark:text-gray-100">
                        {row.name}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <AdminServiceStatusBadge status={row.status} />
                  </TableCell>

                  <TableCell>
                    <div className="min-w-[260px]">
                      {rawEndpoint ? (
                        <div className="flex max-w-[320px] items-center gap-2">
                          <code className="min-w-0 truncate rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-700 dark:text-blue-300">
                            {rawEndpoint}
                          </code>
                          {endpointPort && (
                            <Badge variant="outline" className="border-gray-300/80 bg-gray-100/60 text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300">
                              :{endpointPort}
                            </Badge>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-lg"
                            onClick={() => copyEndpoint(rawEndpoint)}
                            aria-label="Copy endpoint"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {/^https?:\/\//i.test(rawEndpoint) && (
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg">
                              <a href={rawEndpoint} target="_blank" rel="noreferrer" aria-label="Open endpoint">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No endpoint</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="pr-6">
                    <div className="flex min-w-[250px] flex-wrap items-center justify-end gap-1.5">
                      {actionTarget ? (
                        <LiveNxctlActions
                          row={row}
                          target={actionTarget}
                          isGlobalAdmin={isGlobalAdmin}
                          loadingAction={actionLoading[actionTarget.id] ?? null}
                          onAction={onNxctlAction}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </AdminTableSurface>
    </>
  )
}
