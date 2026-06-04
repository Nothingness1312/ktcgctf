"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { Loader } from '@/shared/components'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { formatRelativeDate } from '@/shared/lib'
import { getAuditLogs } from '@/features/logs/lib/audit-service'
import type { AuditLogEntry } from '@/features/logs/lib/audit-service'
import type { ActionType } from '../../overview/types'
import { EmailWithUsernameTooltip } from './AuditLog/EmailWithUsernameTooltip'
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

interface AuditLogListProps {
  logs?: AuditLogEntry[]
  isLoading?: boolean
}

const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'user_signedup', label: 'Sign Up' },
  { value: 'user_deleted', label: 'Deleted' },
  { value: 'token_refreshed', label: 'Session Renewed' },
]

const LIMIT_OPTIONS = [50, 100, 250, 500, 1000]

const getActionStyle = (action: string) => {
  switch (action) {
    case 'login': return { color: 'text-green-500', icon: '->' }
    case 'logout': return { color: 'text-yellow-500', icon: '<-' }
    case 'user_signedup': return { color: 'text-blue-500', icon: '+' }
    case 'user_deleted': return { color: 'text-red-500', icon: 'x' }
    case 'token_refreshed': return { color: 'text-purple-500', icon: '~' }
    default: return { color: 'text-gray-500', icon: '-' }
  }
}

const formatActionLabel = (action: string) => {
  if (action === 'token_refreshed') return 'Session Renewed'

  return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

const AuditLogList: React.FC<AuditLogListProps> = ({ logs: propLogs, isLoading: propLoading }) => {
  const [internalLogs, setInternalLogs] = useState<AuditLogEntry[]>([])
  const [internalLoading, setInternalLoading] = useState(false)
  const [limit, setLimit] = useState(50)
  const [selectedActions, setSelectedActions] = useState<ActionType[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [usernameCache, setUsernameCache] = useState<Map<string, string | null>>(new Map())

  const logs = propLogs || internalLogs
  const isLoading = propLoading ?? internalLoading

  useEffect(() => {
    if (propLogs) return
    const fetchLogs = async () => {
      setInternalLoading(true)
      try {
        const data = await getAuditLogs(limit, selectedActions)
        setInternalLogs(data || [])
      } finally {
        setInternalLoading(false)
      }
    }
    fetchLogs()
  }, [limit, selectedActions, propLogs])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (log.payload.action === 'token_revoked') return false
      const email = log.payload.action === 'user_deleted' ? log.payload.traits?.user_email : log.payload.actor_username
      const matchesSearch = !searchQuery || email?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [logs, searchQuery])

  const handleUsernameLoaded = useCallback((email: string, username: string | null) => {
    setUsernameCache(prev => new Map(prev).set(email, username))
  }, [])

  if (isLoading) return (
    <AdminDataSurface>
      <div className="flex justify-center py-12">
        <Loader />
      </div>
    </AdminDataSurface>
  )

  return (
    <AdminDataSurface
      toolbar={(
        <AdminStickyToolbar
          filters={(
            <AdminFilterToolbar
              actions={(
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {ACTION_OPTIONS.map(opt => (
                      <Button
                        key={opt.value}
                        variant={selectedActions.includes(opt.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedActions(prev => prev.includes(opt.value) ? prev.filter(a => a !== opt.value) : [...prev, opt.value])}
                        className="h-8 rounded-lg border-gray-200/50 px-2 text-[9px] font-bold uppercase tracking-widest hover:border-blue-500/40 dark:border-gray-800/50"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <AdminFilterSelect
                    value={String(limit)}
                    onValueChange={(value) => setLimit(Number(value))}
                    triggerClassName="sm:w-[120px]"
                    options={LIMIT_OPTIONS.map((value) => ({
                      value: String(value),
                      label: `Last ${value}`,
                    }))}
                  />
                </>
              )}
            >
              <AdminFilterInput
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter by actor email..."
                wrapperClassName="max-w-xs"
                icon={<ShieldCheck className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
              />
            </AdminFilterToolbar>
          )}
        />
      )}
      empty={filteredLogs.length === 0 ? (
        <AdminEmptyState
          title="No audit logs match the current filters"
          description="Try adjusting search, action filter, or limit."
        />
      ) : null}
    >
      <AdminListSurface>
        {filteredLogs.map((log, idx) => {
          const isUserDeleted = log.payload.action === 'user_deleted'
          const userEmail = isUserDeleted ? log.payload.traits?.user_email : log.payload.actor_username
          const style = getActionStyle(log.payload.action)

          return (
            <motion.div
              key={log.id || idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${ADMIN_ROW_CLASS} px-5 py-3`}
            >
              <div className="flex items-center gap-4">
                <div className="flex min-w-[140px] items-center gap-2">
                  <span className={cn(style.color, 'font-black text-lg')}>{style.icon}</span>
                  <span className={cn(style.color, 'text-[10px] font-black uppercase tracking-widest')}>
                    {formatActionLabel(log.payload.action)}
                  </span>
                </div>

                <div className="flex flex-1 items-center gap-2">
                  {userEmail ? (
                    <EmailWithUsernameTooltip
                      email={userEmail}
                      cachedUsername={usernameCache.get(userEmail)}
                      onUsernameLoaded={handleUsernameLoaded}
                    />
                  ) : <span className="text-sm italic text-gray-500">Unknown</span>}
                </div>

                <span className="font-mono text-[10px] text-gray-500">
                  {formatRelativeDate(log.created_at)}
                </span>
              </div>
            </motion.div>
          )
        })}
      </AdminListSurface>
    </AdminDataSurface>
  )
}

export default AuditLogList
