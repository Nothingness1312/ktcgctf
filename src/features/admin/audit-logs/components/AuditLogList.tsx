"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Eye, ShieldCheck } from 'lucide-react'
import { Loader } from '@/shared/components'
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { formatRelativeDate } from '@/shared/lib'
import { getAuditLogs, type AuditLogEntry } from '@/features/logs/lib/audit-service'
import {
  ACTION_OPTIONS,
  ENTITY_OPTIONS,
  LIMIT_OPTIONS,
  formatFieldLabel,
  getActionStyle,
  toIsoOrNull,
} from '../lib/audit-log-utils'
import AuditLogDetailDialog from './AuditLogDetailDialog'
import {
  ADMIN_ROW_CLASS,
  AdminDataSurface,
  AdminEmptyState,
  AdminFilterInput,
  AdminFilterSelect,
  AdminFilterToolbar,
  AdminStatusBadge,
  AdminStickyToolbar,
  AdminTableSurface,
} from '../../ui'

interface AuditLogListProps {
  logs?: AuditLogEntry[]
  isLoading?: boolean
  tabs?: React.ReactNode
}

const AuditLogList: React.FC<AuditLogListProps> = ({ logs: propLogs, isLoading: propLoading, tabs }) => {
  const [internalLogs, setInternalLogs] = useState<AuditLogEntry[]>([])
  const [internalLoading, setInternalLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [action, setAction] = useState('all')
  const [entityType, setEntityType] = useState('all')
  const [actorSearch, setActorSearch] = useState('')
  const [entityId, setEntityId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const logs = propLogs || internalLogs
  const displayLogs = logs
  const isLoading = propLoading ?? internalLoading
  const pageCount = Math.max(1, Math.ceil(totalCount / limit))
  const safePage = Math.min(page, pageCount)
  const offset = (safePage - 1) * limit

  useEffect(() => {
    if (propLogs) return

    const fetchLogs = async () => {
      setInternalLoading(true)
      try {
        const result = await getAuditLogs(limit, offset, {
          actorSearch: actorSearch.trim() || null,
          actions: action === 'all' ? null : [action],
          entityType: entityType === 'all' ? null : entityType,
          entityId: entityId.trim() || null,
          from: toIsoOrNull(fromDate),
          to: toIsoOrNull(toDate),
        })
        setInternalLogs(result.logs)
        setTotalCount(result.totalCount)
      } finally {
        setInternalLoading(false)
      }
    }

    fetchLogs()
  }, [action, actorSearch, entityId, entityType, fromDate, limit, offset, propLogs, toDate])

  useEffect(() => {
    setPage(1)
  }, [action, actorSearch, entityId, entityType, fromDate, limit, toDate])

  const resultLabel = useMemo(() => {
    if (displayLogs.length === 0) return 'Showing 0 logs'
    const first = offset + 1
    const last = Math.min(offset + displayLogs.length, totalCount)
    return `Showing ${first}-${last} of ${totalCount}`
  }, [displayLogs.length, offset, totalCount])

  if (isLoading) return (
    <div className="flex flex-1 items-center justify-center">
      <Loader size={40} />
    </div>
  )

  return (
    <>
      <AdminDataSurface
        toolbar={(
          <AdminStickyToolbar
            tabs={tabs}
            filters={(
              <AdminFilterToolbar
                actions={(
                  <>
                    <AdminFilterSelect
                      value={action}
                      defaultValue="all"
                      onValueChange={setAction}
                      className="w-full sm:w-[150px]"
                      options={ACTION_OPTIONS}
                    />
                    <AdminFilterSelect
                      value={entityType}
                      defaultValue="all"
                      onValueChange={setEntityType}
                      className="w-full sm:w-[160px]"
                      options={ENTITY_OPTIONS}
                    />
                    <AdminFilterSelect
                      value={String(limit)}
                      defaultValue="50"
                      onValueChange={(value) => setLimit(Number(value))}
                      className="w-full sm:w-[110px]"
                      options={LIMIT_OPTIONS.map((value) => ({ value: String(value), label: `${value} rows` }))}
                    />
                  </>
                )}
              >
                <div className="grid w-full gap-2 md:grid-cols-2 xl:grid-cols-5">
                  <AdminFilterInput
                    value={actorSearch}
                    defaultValue=""
                    onChange={setActorSearch}
                    placeholder="Admin name/email..."
                    wrapperClassName="max-w-none"
                    icon={<ShieldCheck className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
                  />
                  <AdminFilterInput
                    value={entityId}
                    defaultValue=""
                    onChange={setEntityId}
                    placeholder="Entity ID..."
                    wrapperClassName="max-w-none"
                  />
                  <Input
                    type="datetime-local"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="h-9 rounded-xl text-xs font-semibold"
                  />
                  <Input
                    type="datetime-local"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="h-9 rounded-xl text-xs font-semibold"
                  />

                </div>
              </AdminFilterToolbar>
            )}
          />
        )}
        empty={displayLogs.length === 0 ? (
          <AdminEmptyState
            title='No admin audit logs match the current filters'
            description="Try adjusting actor, action, entity, or date filters."
          />
        ) : null}
      >
        <AdminTableSurface>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200/80 hover:bg-transparent dark:border-gray-800">
                <TableHead className="px-5">Action</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="w-[86px] px-5 text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLogs.map((log, idx) => {
                const style = getActionStyle(log.action)

                return (
                  <motion.tr
                    key={log.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={ADMIN_ROW_CLASS}
                  >
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(style.color, 'font-black')}>{style.icon}</span>
                        <AdminStatusBadge tone={style.tone}>{log.action}</AdminStatusBadge>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="max-w-[220px] truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {log.actor_snapshot}
                      </div>
                      <AdminStatusBadge tone={log.actor_role === 'global_admin' ? 'info' : 'neutral'} className="mt-1">
                        {log.actor_role}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{log.entity_type}</div>
                      <div className="max-w-[220px] truncate font-mono text-[10px] text-gray-500">{log.entity_id || '-'}</div>
                    </TableCell>
                    <TableCell className="max-w-[320px] py-3">
                      {log.changed_fields.length > 0 && (
                        <div className="truncate text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {log.changed_fields.join(', ')}
                        </div>
                      )}
                      <div className="truncate font-mono text-[10px] text-gray-500">
                        {log.ip_address || 'unknown ip'}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] text-gray-500">
                      {formatRelativeDate(log.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl"
                        onClick={() => setSelectedLog(log)}
                        aria-label="View audit log details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
        </AdminTableSurface>

        <div className="mx-5 my-4 flex flex-col gap-3 border-t border-gray-200/80 pt-4 text-sm text-muted-foreground dark:border-gray-800/80 sm:flex-row sm:items-center sm:justify-between">
          <span>{resultLabel}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={safePage <= 1}
              className="rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="min-w-20 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">
              {safePage} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((currentPage) => Math.min(pageCount, currentPage + 1))}
              disabled={safePage >= pageCount}
              className="rounded-xl"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AdminDataSurface>

      <AuditLogDetailDialog log={selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)} />
    </>
  )
}

export default AuditLogList
