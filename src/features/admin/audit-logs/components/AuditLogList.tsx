"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Copy, Eye, ShieldCheck } from 'lucide-react'
import { Loader } from '@/shared/components'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  AppTabs,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
import { DIALOG_CONTENT_CLASS_4XL } from '@/shared/styles/dialog'
import { cn } from '@/shared/lib/utils'
import { formatRelativeDate } from '@/shared/lib'
import { getAuditLogs, type AuditLogEntry } from '@/features/logs/lib/audit-service'
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

const ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'PUBLISH', label: 'Publish' },
  { value: 'UNPUBLISH', label: 'Unpublish' },
  { value: 'GRANT_ADMIN', label: 'Grant Admin' },
  { value: 'REVOKE_ADMIN', label: 'Revoke Admin' },
  { value: 'ADD_MEMBER', label: 'Add Member' },
  { value: 'REMOVE_MEMBER', label: 'Remove Member' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
]

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All entities' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'event', label: 'Event' },
  { value: 'event_member', label: 'Event Member' },
  { value: 'event_join_request', label: 'Join Request' },
  { value: 'role', label: 'Role' },
  { value: 'solve', label: 'Solve' },
]

const LIMIT_OPTIONS = [25, 50, 100, 250]
const SENSITIVE_FIELD_PATTERN = /(password|token|session|secret|credential|flag|join_key|key)$/i
const SENSITIVE_FIELD_NAMES = new Set(['flag', 'flag_hash', 'join_key', 'services'])
type AuditDetailTab = 'summary' | 'changes' | 'data' | 'metadata'

const AUDIT_DETAIL_TABS = [
  { value: 'summary' as const, label: 'Summary' },
  { value: 'changes' as const, label: 'Changes' },
  { value: 'data' as const, label: 'Data' },
  { value: 'metadata' as const, label: 'Metadata' },
]


function getActionStyle(action: string) {
  switch (action) {
    case 'CREATE': return { tone: 'success' as const, color: 'text-green-500', icon: '+' }
    case 'UPDATE': return { tone: 'info' as const, color: 'text-blue-500', icon: '~' }
    case 'DELETE': return { tone: 'danger' as const, color: 'text-red-500', icon: 'x' }
    case 'PUBLISH': return { tone: 'success' as const, color: 'text-emerald-500', icon: '^' }
    case 'UNPUBLISH': return { tone: 'warning' as const, color: 'text-yellow-500', icon: 'v' }
    case 'APPROVE': return { tone: 'success' as const, color: 'text-emerald-500', icon: 'ok' }
    case 'REJECT': return { tone: 'danger' as const, color: 'text-red-500', icon: '!' }
    default: return { tone: 'neutral' as const, color: 'text-gray-500', icon: '-' }
  }
}

function toIsoOrNull(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function getFieldValue(data: Record<string, unknown> | null, field: string) {
  if (!data || !(field in data)) return null
  return data[field]
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSensitiveField(field: string) {
  const normalized = field.toLowerCase()
  return SENSITIVE_FIELD_NAMES.has(normalized) || SENSITIVE_FIELD_PATTERN.test(normalized)
}

function sanitizeRecord(data: Record<string, unknown> | null) {
  if (!data) return null
  return Object.fromEntries(Object.entries(data).filter(([key]) => !isSensitiveField(key)))
}

function formatPrimitive(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return String(value)
}

function formatFieldLabel(field: string) {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatJakartaDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    timeZoneName: 'short',
  }).format(date)
}

function shortenValue(value: string | null | undefined, start = 8, end = 5) {
  if (!value) return '-'
  if (value.length <= start + end + 3) return value
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

function parseUserAgent(userAgent: string | null | undefined) {
  const ua = userAgent || ''
  if (!ua) return { browser: 'Unknown browser', os: 'Unknown OS' }

  const edge = ua.match(/Edg\/([\d.]+)/)
  const chrome = ua.match(/Chrome\/([\d.]+)/)
  const firefox = ua.match(/Firefox\/([\d.]+)/)
  const safari = ua.match(/Version\/([\d.]+).*Safari/)

  const browser = edge
    ? `Edge ${edge[1].split('.')[0]}`
    : chrome
      ? `Chrome ${chrome[1].split('.')[0]}`
      : firefox
        ? `Firefox ${firefox[1].split('.')[0]}`
        : safari
          ? `Safari ${safari[1].split('.')[0]}`
          : 'Unknown browser'

  const os = /Windows NT 10/.test(ua)
    ? 'Windows 10/11'
    : /Windows NT 6\.3/.test(ua)
      ? 'Windows 8.1'
      : /Windows NT 6\.1/.test(ua)
        ? 'Windows 7'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Android/.test(ua)
            ? 'Android'
            : /iPhone|iPad/.test(ua)
              ? 'iOS'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'Unknown OS'

  return { browser, os }
}

function CopyableValue({ value, compact = true }: { value: string | null | undefined; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const display = compact ? shortenValue(value) : (value || '—')
  const canCopy = Boolean(value)

  const handleCopy = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 align-middle" title={value || undefined}>
      <span className="min-w-0 truncate font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">
        {display}
      </span>
      {canCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-blue-500/10 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:text-blue-300"
          aria-label="Copy value"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </span>
  )
}

function AuditSummary({
  log,
  parsedUserAgent,
}: {
  log: AuditLogEntry
  parsedUserAgent: ReturnType<typeof parseUserAgent>
}) {
  const rows = [
    { label: 'Actor name', value: log.actor_snapshot },
    { label: 'Actor role', value: log.actor_role === 'global_admin' ? 'Global Admin' : 'Admin' },
    { label: 'Actor ID', value: <CopyableValue value={log.actor_user_id} /> },
    { label: 'Action', value: log.action },
    { label: 'Entity type', value: formatFieldLabel(log.entity_type) },
    { label: 'Entity ID', value: <CopyableValue value={log.entity_id} /> },
    { label: 'IP address', value: log.ip_address || '—' },
    { label: 'Created time', value: formatJakartaDate(log.created_at) },
    { label: 'Browser', value: `${parsedUserAgent.browser} - ${parsedUserAgent.os}` },
  ]

  return (
    <section className="rounded-2xl border border-gray-200/70 bg-white/70 shadow-sm dark:border-gray-800/70 dark:bg-[#0d121d]/70">
      <div className="border-b border-gray-200/70 px-4 py-3 dark:border-gray-800/70">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Activity Summary</h3>
      </div>
      <dl className="grid gap-px bg-gray-200/60 dark:bg-gray-800/70 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0 bg-white/80 px-4 py-3 dark:bg-[#0d121d]/85">
            <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{row.label}</dt>
            <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function AuditSummaryCards({
  log,
  parsedUserAgent,
}: {
  log: AuditLogEntry
  parsedUserAgent: ReturnType<typeof parseUserAgent>
}) {
  const groups = [
    {
      title: 'Actor',
      rows: [
        { label: 'Name', value: log.actor_snapshot },
        { label: 'Role', value: log.actor_role === 'global_admin' ? 'Global Admin' : 'Admin' },
        { label: 'User ID', value: <CopyableValue value={log.actor_user_id} /> },
      ],
    },
    {
      title: 'Action',
      rows: [
        { label: 'Action', value: log.action },
        { label: 'Entity', value: formatFieldLabel(log.entity_type) },
        { label: 'Entity ID', value: <CopyableValue value={log.entity_id} /> },
      ],
    },
    {
      title: 'Request',
      rows: [
        { label: 'Created', value: formatJakartaDate(log.created_at) },
        { label: 'IP address', value: log.ip_address || 'Not captured' },
        { label: 'Client', value: `${parsedUserAgent.browser} - ${parsedUserAgent.os}` },
      ],
    },
  ]

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {groups.map((group) => (
        <div key={group.title} className="rounded-2xl border border-gray-200/70 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-[#0d121d]/70">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{group.title}</h3>
          <dl className="mt-3 space-y-3">
            {group.rows.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{row.label}</dt>
                <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}

function AuditValue({ value, tone = 'neutral' }: { value: unknown; tone?: 'before' | 'after' | 'neutral' }) {
  const toneClass = tone === 'before'
    ? 'border-gray-200/80 bg-gray-50/80 text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
    : tone === 'after'
      ? 'border-blue-500/20 bg-blue-500/5 text-gray-800 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-gray-100'
      : 'border-gray-200/70 bg-gray-50/70 dark:border-gray-800 dark:bg-[#0d121d]/70'

  if (typeof value === 'boolean') {
    return (
      <AdminStatusBadge tone={value ? 'success' : 'muted'}>
        {value ? 'Yes' : 'No'}
      </AdminStatusBadge>
    )
  }

  if (Array.isArray(value) || isPlainRecord(value)) {
    return (
      <pre className={cn('whitespace-pre-wrap break-words rounded-xl border p-3 font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-200', toneClass)}>
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }

  return (
    <div className={cn('min-h-10 break-words rounded-xl border px-3 py-2 text-sm font-semibold', toneClass)}>
      {formatPrimitive(value)}
    </div>
  )
}

function AuditInlineValue({ value }: { value: unknown }) {
  if (typeof value === 'boolean') {
    return (
      <AdminStatusBadge tone={value ? 'success' : 'muted'}>
        {value ? 'Yes' : 'No'}
      </AdminStatusBadge>
    )
  }

  if (Array.isArray(value) || isPlainRecord(value)) {
    return (
      <code className="block max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200/70 bg-gray-50/70 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200 scroll-hidden">
        {JSON.stringify(value, null, 2)}
      </code>
    )
  }

  return (
    <span className="break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
      {formatPrimitive(value)}
    </span>
  )
}

function ChangedFields({ log, fields }: { log: AuditLogEntry; fields: string[] }) {
  const visibleFields = fields.filter((field) => !isSensitiveField(field))

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-1 border-b border-gray-200/70 pb-2 dark:border-gray-800/70 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Changed Fields</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Only fields that changed are shown.</p>
        </div>
        <AdminStatusBadge tone={visibleFields.length > 0 ? 'info' : 'muted'}>
          {visibleFields.length} fields
        </AdminStatusBadge>
      </div>

      {visibleFields.length > 0 ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
          {visibleFields.map((field) => (
            <div key={field} className="grid gap-2 py-3 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-start">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-gray-600 dark:text-gray-300">{formatFieldLabel(field)}</div>
              </div>
              <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start">
                <div className="min-w-0 rounded-lg bg-gray-50/70 px-3 py-2 dark:bg-gray-900/35">
                  <AuditInlineValue value={getFieldValue(log.before_data, field)} />
                </div>
                <span className="hidden pt-2 text-xs font-bold text-gray-400 sm:block">to</span>
                <div className="min-w-0 rounded-lg bg-blue-500/5 px-3 py-2 dark:bg-blue-500/10">
                  <AuditInlineValue value={getFieldValue(log.after_data, field)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No changed fields were recorded.</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This action may only contain metadata.</p>
        </div>
      )}
    </section>
  )
}

function FieldListCard({
  title,
  entries,
}: {
  title: string
  entries: Array<[string, unknown]>
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white/70 shadow-sm dark:border-gray-800/70 dark:bg-[#0d121d]/70">
      <div className="border-b border-gray-200/70 px-4 py-3 dark:border-gray-800/70">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      {entries.length > 0 ? (
        <dl className="divide-y divide-gray-100 dark:divide-gray-800">
          {entries.map(([key, value]) => (
            <div key={key} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start">
              <dt className="min-w-0">
                <div className="truncate text-xs font-bold text-gray-700 dark:text-gray-200">{formatFieldLabel(key)}</div>
              </dt>
              <dd className="min-w-0 break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
                <AuditInlineValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No data available.</div>
      )}
    </section>
  )
}

function FieldRowSection({
  title,
  entries,
}: {
  title: string
  entries: Array<[string, unknown]>
}) {
  return (
    <section className="min-w-0">
      <div className="border-b border-gray-200/70 pb-2 dark:border-gray-800/70">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      {entries.length > 0 ? (
        <dl className="divide-y divide-gray-100 dark:divide-gray-800/80">
          {entries.map(([key, value]) => (
            <div key={key} className="grid gap-2 py-2.5 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start">
              <dt className="truncate text-xs font-bold text-gray-600 dark:text-gray-300">
                {formatFieldLabel(key)}
              </dt>
              <dd className="min-w-0 break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
                <AuditInlineValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="py-4 text-sm text-gray-500 dark:text-gray-400">No data available.</div>
      )}
    </section>
  )
}

function SnapshotCards({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const beforeData = sanitizeRecord(before)
  const afterData = sanitizeRecord(after)
  const beforeEntries = beforeData ? Object.entries(beforeData).filter(([key]) => !isSensitiveField(key)) : []
  const afterEntries = afterData ? Object.entries(afterData).filter(([key]) => !isSensitiveField(key)) : []

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FieldListCard title="Before Snapshot" entries={beforeEntries} />
      <FieldListCard title="After Snapshot" entries={afterEntries} />
    </div>
  )
}

function ChangesDetails({ log, fields }: { log: AuditLogEntry; fields: string[] }) {
  const visibleFields = fields.filter((field) => !isSensitiveField(field))

  return (
    <div className="max-w-none">
      <ChangedFields log={log} fields={visibleFields} />
    </div>
  )
}

function DataDetails({ log }: { log: AuditLogEntry }) {
  return (
    <div className="max-w-none">
      <SnapshotViewer before={log.before_data} after={log.after_data} />
    </div>
  )
}

function MetadataDetails({
  log,
  parsedUserAgent,
}: {
  log: AuditLogEntry
  parsedUserAgent: ReturnType<typeof parseUserAgent>
}) {
  const requestEntries: Array<[string, unknown]> = [
    ['ip_address', log.ip_address || 'Not captured'],
    ['browser', parsedUserAgent.browser],
    ['operating_system', parsedUserAgent.os],
    ['user_agent', log.user_agent || 'Not captured'],
  ]

  return (
    <div className="max-w-none">
      <FieldRowSection title="Request Context" entries={requestEntries} />
    </div>
  )
}

function SnapshotViewer({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const [activeSnapshot, setActiveSnapshot] = useState<'before' | 'after'>('after')
  const data = activeSnapshot === 'before' ? sanitizeRecord(before) : sanitizeRecord(after)
  const entries = data ? Object.entries(data).filter(([key]) => !isSensitiveField(key)) : []

  return (
    <section className="rounded-2xl border border-gray-200/70 bg-white/70 shadow-sm dark:border-gray-800/70 dark:bg-[#0d121d]/70">
      <div className="flex flex-col gap-3 border-b border-gray-200/70 px-4 py-3 dark:border-gray-800/70 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Full Snapshot</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sensitive fields are hidden from this view.</p>
        </div>
        <div className="inline-flex w-fit rounded-xl border border-gray-200 bg-white/70 p-1 dark:border-gray-800 dark:bg-gray-900/70">
          {(['before', 'after'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveSnapshot(item)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                activeSnapshot === item
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {entries.length > 0 ? (
        <dl className="grid gap-x-6 gap-y-4 p-4 md:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">{formatFieldLabel(key)}</dt>
              <dd className="mt-1 min-w-0">
                <AuditValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No snapshot data available.</div>
      )}
    </section>
  )
}

function RequestDetails({
  log,
  parsedUserAgent,
}: {
  log: AuditLogEntry
  parsedUserAgent: ReturnType<typeof parseUserAgent>
}) {
  const metadata = sanitizeRecord(log.metadata)
  const metadataEntries = metadata ? Object.entries(metadata).filter(([key]) => !isSensitiveField(key)) : []

  return (
    <details className="rounded-2xl border border-gray-200/70 bg-white/70 shadow-sm dark:border-gray-800/70 dark:bg-[#0d121d]/70">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-gray-900 outline-none transition-colors hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-gray-100 dark:hover:text-blue-300">
        Request Details and Metadata
      </summary>
      <div className="grid gap-4 border-t border-gray-200/70 p-4 dark:border-gray-800/70 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">IP Address</div>
            <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{log.ip_address || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Browser</div>
            <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{parsedUserAgent.browser}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Operating System</div>
            <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{parsedUserAgent.os}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">User Agent</div>
            <div className="mt-1 break-words rounded-xl bg-gray-50/80 p-3 font-mono text-xs text-gray-700 dark:bg-gray-900/70 dark:text-gray-200">
              {log.user_agent || '—'}
            </div>
          </div>
          {metadataEntries.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Metadata</div>
              <dl className="mt-2 space-y-2">
                {metadataEntries.map(([key, value]) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[140px_1fr]">
                    <dt className="text-xs font-bold text-gray-500 dark:text-gray-400">{formatFieldLabel(key)}</dt>
                    <dd className="break-words text-sm font-semibold text-gray-800 dark:text-gray-100">{formatPrimitive(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </details>
  )
}

function AuditLogDetailDialog({
  log,
  onOpenChange,
}: {
  log: AuditLogEntry | null
  onOpenChange: (open: boolean) => void
}) {
  const fields = log?.changed_fields ?? []
  const actionStyle = log ? getActionStyle(log.action) : getActionStyle('')
  const parsedUserAgent = parseUserAgent(log?.user_agent)
  const [activeTab, setActiveTab] = useState<AuditDetailTab>('summary')

  return (
    <Dialog open={Boolean(log)} onOpenChange={onOpenChange}>
      <DialogContent className={`${DIALOG_CONTENT_CLASS_4XL} max-h-[90dvh] overflow-y-auto scroll-hidden`}>
        {log && (
          <div className="mx-auto w-full max-w-5xl space-y-3 p-4 sm:p-5">
            <DialogHeader className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-gray-200/70 bg-white/95 px-4 pb-2 pt-3 backdrop-blur-md dark:border-gray-800/70 dark:bg-[#0b0f19]/95 sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-4">
              <DialogTitle className="sr-only">Admin audit log detail</DialogTitle>
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit rounded-xl"
                    onClick={() => onOpenChange(false)}
                  >
                    Back to list
                  </Button>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <AdminStatusBadge tone={actionStyle.tone}>{log.action}</AdminStatusBadge>
                    <AdminStatusBadge tone={log.actor_role === 'global_admin' ? 'info' : 'neutral'}>
                      {log.actor_role === 'global_admin' ? 'Global Admin' : 'Admin'}
                    </AdminStatusBadge>
                    <AdminStatusBadge tone="muted">{formatFieldLabel(log.entity_type)}</AdminStatusBadge>
                  </div>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <DialogDescription className="flex min-w-0 flex-wrap items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <span>{log.actor_snapshot}</span>
                    <span className="text-gray-400">changed</span>
                    <span className="font-mono text-gray-900 dark:text-gray-100" title={log.entity_id || undefined}>{shortenValue(log.entity_id)}</span>
                  </DialogDescription>
                  <span className="shrink-0 text-xs font-bold text-gray-500 dark:text-gray-400" title={log.created_at}>
                    {formatJakartaDate(log.created_at)}
                  </span>
                </div>

                <div>
                  <AppTabs
                    items={AUDIT_DETAIL_TABS}
                    value={activeTab}
                    onValueChange={setActiveTab}
                    variant="panel"
                    stretch
                    ariaLabel="Audit log detail tabs"
                  />
                </div>
              </div>
            </DialogHeader>

            {activeTab === 'summary' && <AuditSummary log={log} parsedUserAgent={parsedUserAgent} />}
            {activeTab === 'changes' && <ChangesDetails log={log} fields={fields} />}
            {activeTab === 'data' && <DataDetails log={log} />}
            {activeTab === 'metadata' && <MetadataDetails log={log} parsedUserAgent={parsedUserAgent} />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
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
