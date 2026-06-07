"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { Loader } from '@/shared/components'
import { formatRelativeDate } from '@/shared/lib'
import { getAuthAuditLogs, type AuthAuditLogEntry } from '@/features/logs/lib/audit-service'
import {
  ADMIN_ROW_CLASS,
  AdminDataSurface,
  AdminEmptyState,
  AdminFilterInput,
  AdminFilterSelect,
  AdminFilterToolbar,
  AdminListSurface,
  AdminStickyToolbar,
} from '../../ui'

const AUTH_ACTION_OPTIONS = [
  { value: 'all', label: 'All auth actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'user_signedup', label: 'User Signed Up' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'token_refreshed', label: 'Token Refreshed' },
]

const LIMIT_OPTIONS = [25, 50, 100, 250]

function getPayloadText(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === 'string' ? value : ''
}

function getActorLabel(log: AuthAuditLogEntry) {
  if (log.username) return log.username
  if (log.email) return log.email

  const payload = log.payload
  const action = getPayloadText(payload, 'action')
  if (action === 'user_deleted') {
    const traits = payload.traits
    if (traits && typeof traits === 'object' && !Array.isArray(traits)) {
      const email = (traits as Record<string, unknown>).user_email
      if (typeof email === 'string') return email
    }
  }

  return getPayloadText(payload, 'actor_username') || getPayloadText(payload, 'actor_id') || 'Unknown user'
}

function getActorId(log: AuthAuditLogEntry) {
  return log.user_id || getPayloadText(log.payload, 'actor_id') || log.id
}

function getActionStyle(action: string) {
  switch (action) {
    case 'login': return 'text-emerald-500'
    case 'logout': return 'text-yellow-500'
    case 'user_signedup': return 'text-blue-500'
    case 'user_deleted': return 'text-red-500'
    case 'token_refreshed': return 'text-purple-500'
    default: return 'text-gray-500'
  }
}

export default function AuthAuditLogList({ tabs }: { tabs?: React.ReactNode }) {
  const [logs, setLogs] = useState<AuthAuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('all')
  const [search, setSearch] = useState('')

  const offset = (page - 1) * limit
  const hasNextPage = logs.length === limit

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const data = await getAuthAuditLogs(limit, offset, {
          actions: action === 'all' ? null : [action],
        })
        setLogs(data)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [action, limit, offset])

  useEffect(() => {
    setPage(1)
  }, [action, limit, search])

  const visibleLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return logs

    return logs.filter((log) => {
      const actor = getActorLabel(log).toLowerCase()
      const email = (log.email || '').toLowerCase()
      const actionName = getPayloadText(log.payload, 'action').toLowerCase()
      return actor.includes(keyword) || email.includes(keyword) || actionName.includes(keyword)
    })
  }, [logs, search])

  if (isLoading) return (
    <div className="flex flex-1 items-center justify-center">
      <Loader size={40} />
    </div>
  )

  return (
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
                    className="w-full sm:w-[170px]"
                    options={AUTH_ACTION_OPTIONS}
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
              <AdminFilterInput
                value={search}
                defaultValue=""
                onChange={setSearch}
                placeholder="Search user or action..."
                wrapperClassName="w-full"
                icon={<KeyRound className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
              />
            </AdminFilterToolbar>
          )}
        />
      )}
      empty={visibleLogs.length === 0 ? (
        <AdminEmptyState
          title="No auth logs match the current filters"
          description="Try adjusting action or search filters."
        />
      ) : null}
    >
      <AdminListSurface>
        {visibleLogs.map((log, idx) => {
          const actionName = getPayloadText(log.payload, 'action') || 'unknown'
          const actor = getActorLabel(log)

          return (
            <motion.div
              key={log.id || idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${ADMIN_ROW_CLASS} px-5 py-3`}
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex min-w-[170px] items-center gap-2">
                  <KeyRound className={cn('h-4 w-4', getActionStyle(actionName))} />
                  <span className={cn('text-[10px] font-black uppercase tracking-widest', getActionStyle(actionName))}>
                    {actionName}
                  </span>
                </div>

                <div className="min-w-[220px] truncate">
                  {log.username ? (
                    <Link
                      href={`/user/${encodeURIComponent(log.username)}`}
                      className="text-sm font-semibold text-blue-600 transition hover:text-blue-500 hover:underline dark:text-blue-400"
                    >
                      {log.username}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {actor}
                    </span>
                  )}
                  {log.email && log.email !== actor && (
                    <div className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                      {log.username ? (
                        <Link
                          href={`/user/${encodeURIComponent(log.username)}`}
                          className="transition hover:text-blue-500 hover:underline"
                        >
                          {log.email}
                        </Link>
                      ) : (
                        log.email
                      )}
                    </div>
                  )}
                  <div className="truncate font-mono text-[10px] text-gray-500">
                    {getActorId(log)}
                  </div>
                </div>

                <div className="min-w-0 flex-1 text-left lg:text-right">
                  <span className="font-mono text-[10px] text-gray-500">
                    {formatRelativeDate(log.created_at)}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AdminListSurface>

      <div className="mx-5 my-4 flex flex-col gap-3 border-t border-gray-200/80 pt-4 text-sm text-muted-foreground dark:border-gray-800/80 sm:flex-row sm:items-center sm:justify-between">
        <span>Page {page}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page <= 1}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => currentPage + 1)}
            disabled={!hasNextPage}
            className="rounded-xl"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AdminDataSurface>
  )
}
