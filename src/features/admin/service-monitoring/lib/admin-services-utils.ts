import type { Challenge, Event } from '@/shared/types'
import { parseNxctlService } from '@/features/challenges/lib/nxctl-services'
import type {
  AdminLiveServiceRow,
  AdminNxctlStatusDetail,
  AdminPlatformChallengeEntry,
  AdminPlatformChallengeGroup,
  AdminPlatformChallengeKeyGroup,
  AdminServiceComparisonStatus,
  AdminServiceEndpoint,
  AdminServiceRow,
  AdminServicesFilters,
  AdminServicesSummaryCounts,
  AdminServiceSource,
  AdminServiceStatus,
} from '../types'

const CHALLENGE_KEY_HEADER = 'X-NXCTL-Challenge-Key'

const COMPARISON_SEVERITY: Record<AdminServiceComparisonStatus, number> = {
  invalid: 60,
  disabled_running: 50,
  running_unregistered: 45,
  missing_from_platform: 43,
  configured_not_running: 40,
  key_missing: 35,
  unknown: 20,
  valid: 0,
}

export function buildNxctlHeaders(serviceKey?: string, json = false, accessToken?: string | null) {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (serviceKey) headers[CHALLENGE_KEY_HEADER] = serviceKey
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return headers
}

export function buildNxctlStatusHeaders(rows: AdminServiceRow[]): Record<string, string> {
  const keys = Array.from(new Set(
    rows
      .map((row) => row.service.key.trim())
      .filter(Boolean)
  ))

  if (keys.length === 0) return {}
  return { [CHALLENGE_KEY_HEADER]: keys.join(',') }
}

export function buildNxctlStatusUrl(rows: AdminServiceRow[]) {
  const params = new URLSearchParams({ action: 'status' })
  const names = Array.from(new Set(
    rows
      .map((row) => row.service.name.trim())
      .filter(Boolean)
  ))

  if (names.length > 0) params.set('filter', names.join(','))
  return `/api/nxctl?${params.toString()}`
}

export function buildLiveServicesUrl(rows: AdminServiceRow[]) {
  const params = new URLSearchParams({ action: 'live-services' })
  const names = Array.from(new Set(
    rows
      .map((row) => row.service.name.trim())
      .filter(Boolean)
  ))

  if (names.length > 0) params.set('filter', names.join(','))
  return `/api/nxctl?${params.toString()}`
}

export function buildServiceRows(challenges: Challenge[], events: Event[]): AdminServiceRow[] {
  const eventById = new Map(events.map((event) => [String(event.id), event]))

  return challenges.flatMap((challenge) => {
    const rawServices = Array.isArray(challenge.services) ? challenge.services : []

    return rawServices
      .map(parseNxctlService)
      .filter((service) => service.name.trim() !== '')
      .map((service, index) => ({
        id: `${challenge.id}:${service.name}:${index}`,
        service,
        challenge,
        event: challenge.event_id ? eventById.get(String(challenge.event_id)) ?? null : null,
        details: null,
        error: null,
        fetchedAt: null,
      }))
  })
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return ''
}

function firstBoolean(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', 'yes', '1', 'enabled'].includes(normalized)) return true
      if (['false', 'no', '0', 'disabled'].includes(normalized)) return false
    }
  }

  return null
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase()
}

function getNxctlStatusName(item: any) {
  return String(item?.name || item?.challenge?.name || '').trim()
}

export function normalizeNxctlStatusDetail(item: any): AdminNxctlStatusDetail {
  const restart = item?.runtime?.restart || item?.restart || null
  const restartEnabled = firstBoolean(
    restart?.enabled,
    item?.runtime?.can_restart,
    item?.challenge?.can_restart,
    item?.can_restart
  )
  const restartCooldown = firstNumber(
    restart?.cooldown_remaining_seconds,
    item?.runtime?.restart_cooldown,
    item?.restart_cooldown
  )
  const remainingSeconds = firstNumber(
    item?.runtime?.remaining_seconds,
    item?.remaining_seconds
  )
  const port = firstNumber(
    item?.port,
    item?.challenge?.port
  )
  const extendCooldown = firstNumber(
    item?.runtime?.extend_cooldown,
    item?.extend_cooldown
  )

  return {
    challenge: {
      name: getNxctlStatusName(item),
      type: item?.type || item?.challenge?.type || null,
      port,
      ports: Array.isArray(item?.ports) ? item.ports : Array.isArray(item?.challenge?.ports) ? item.challenge.ports : [],
      can_restart: restartEnabled,
    },
    runtime: {
      status: String(item?.runtime?.status || item?.status || 'unknown'),
      container_id: item?.runtime?.container_id || item?.container_id || null,
      remaining_seconds: remainingSeconds,
      can_restart: restartEnabled,
      restart_cooldown: restartCooldown ?? 0,
      restart,
      extend_cooldown: extendCooldown ?? 0,
      extend: item?.runtime?.extend || item?.extend || null,
    },
    exports: Array.isArray(item?.exports) ? item.exports : [],
    raw: item,
  }
}

export function normalizeNxctlStatusList(data: unknown) {
  if (!Array.isArray(data)) return []
  return data.map(normalizeNxctlStatusDetail)
}

export function getNxctlStatusMap(data: unknown) {
  const statusByName = new Map<string, AdminNxctlStatusDetail>()
  const rows = Array.isArray(data) ? data.map(normalizeNxctlStatusDetail) : []

  rows.forEach((item) => {
    const name = item.challenge.name
    if (name) statusByName.set(name, item)
  })

  return statusByName
}

function stringifyNxctlDetail(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return String(value)

  const detail = value as Record<string, unknown>
  const code = typeof detail.error === 'string' ? detail.error : ''
  const message = typeof detail.message === 'string' ? detail.message : ''

  if (code === 'challenge_not_found_or_not_authorized') {
    return 'Challenge not found, disabled, or missing/invalid challenge key.'
  }

  if (code === 'challenge_not_found') return 'Challenge not found in NXCTL.'
  if (code === 'invalid_or_missing_api_token') return 'NXCTL API token is missing or invalid.'
  if (code === 'invalid_or_missing_admin_secret') return 'NXCTL admin secret is missing or invalid.'
  if (code === 'api_admin_secret_not_configured') return 'NXCTL admin secret is not configured.'
  if (code === 'restart_disabled') return 'Restart is disabled for this challenge.'
  if (message) return message
  if (code) return code

  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

export function getNxctlErrorMessage(data: any) {
  return (
    stringifyNxctlDetail(data?.detail) ||
    stringifyNxctlDetail(data?.error) ||
    stringifyNxctlDetail(data?.message) ||
    'Unknown NXCTL error'
  )
}

export function getRemainingSecondsFromDetail(
  detail: AdminNxctlStatusDetail | null | undefined,
  fetchedAt: number | null | undefined,
  now = Date.now()
) {
  const value = detail?.runtime.remaining_seconds
  if (value === null || value === undefined || !fetchedAt) return null

  const elapsed = Math.max(0, (now - fetchedAt) / 1000)
  return Math.max(0, value - elapsed)
}

export function getRuntimeStatusFromDetail(
  detail: AdminNxctlStatusDetail | null | undefined,
  error?: string | null,
  fetchedAt?: number | null,
  now = Date.now()
): AdminServiceStatus {
  if (error) return 'error'

  const runtimeStatus = detail?.runtime.status?.toLowerCase()
  if (!runtimeStatus) return 'unknown'

  if (runtimeStatus === 'running') {
    const remaining = getRemainingSecondsFromDetail(detail, fetchedAt, now)
    if (remaining !== null && remaining <= 0) return 'expired'
    if ((detail.challenge.port === null || detail.challenge.port === 0) && detail.exports.length === 0) {
      return 'container_only'
    }
    return 'running'
  }

  if (['down', 'stopped', 'exited', 'created', 'not_running'].includes(runtimeStatus)) {
    return 'stopped'
  }

  if (['error', 'unhealthy', 'failed'].includes(runtimeStatus)) return 'error'
  return 'unknown'
}

export function getRemainingSeconds(row: AdminServiceRow, now = Date.now()) {
  return getRemainingSecondsFromDetail(row.details, row.fetchedAt, now)
}

export function getServiceStatus(row: AdminServiceRow, now = Date.now()): AdminServiceStatus {
  return getRuntimeStatusFromDetail(row.details, row.error, row.fetchedAt, now)
}

export function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return '-'
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safeSeconds / 3600)
  const m = Math.floor((safeSeconds % 3600) / 60)
  const sec = safeSeconds % 60
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export function formatDateTime(value?: string | number | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getExportEndpoint(item: any) {
  return String(item?.endpoint || item?.url || '').trim()
}

function isHttpEndpoint(endpoint: string) {
  return /^https?:\/\//i.test(endpoint)
}

function parseTcpEndpoint(endpoint: string) {
  const match = endpoint.match(/^tcp:\/\/([^/:]+):(\d+)/i)
  if (match) return { host: match[1], port: match[2] }

  const fallbackMatch = endpoint.match(/^([^/:]+):(\d+)$/i)
  return fallbackMatch ? { host: fallbackMatch[1], port: fallbackMatch[2] } : null
}

function toTcpCommand(endpoint: string) {
  const parsed = parseTcpEndpoint(endpoint)
  return parsed ? `nc ${parsed.host} ${parsed.port}` : endpoint
}

function toSshCommand(endpoint: string, user?: string) {
  const parsed = parseTcpEndpoint(endpoint)
  if (!parsed) return endpoint

  return `ssh ${user?.trim() || 'username'}@${parsed.host} -p ${parsed.port}`
}

function toSshCopyCommand(endpoint: string, user?: string) {
  const command = toSshCommand(endpoint, user)
  return command.startsWith('ssh ')
    ? command.replace(/^ssh\s+/, 'ssh -o StrictHostKeyChecking=no ')
    : command
}

export function getServiceEndpoints(row: AdminServiceRow): AdminServiceEndpoint[] {
  const exports = row.details?.exports || []
  const serviceType = String(row.details?.challenge.type || '').toLowerCase()

  return exports
    .map((item: any, index) => {
      const endpoint = getExportEndpoint(item)
      if (!endpoint) return null

      const endpointType = String(item?.type || serviceType || '').toLowerCase()
      const isHttp = isHttpEndpoint(endpoint)
      const isReturnedTcp =
        endpointType === 'tcp' ||
        endpoint.toLowerCase().startsWith('tcp://') ||
        (!isHttp && parseTcpEndpoint(endpoint) !== null)
      const isSsh = isReturnedTcp && row.service.options.type === 'ssh'
      const label = isSsh
        ? toSshCommand(endpoint, row.service.options.user)
        : isReturnedTcp
          ? toTcpCommand(endpoint)
          : endpoint

      return {
        key: `${row.id}:${index}`,
        endpoint,
        label,
        copyText: isSsh ? toSshCopyCommand(endpoint, row.service.options.user) : label,
        type: endpointType || (isHttp ? 'http' : isReturnedTcp ? 'tcp' : 'unknown'),
        provider: item?.provider ? String(item.provider) : '',
        isHttp,
      }
    })
    .filter((item): item is AdminServiceEndpoint => Boolean(item))
}

export function getLiveServiceEndpoints(row: AdminLiveServiceRow): (AdminServiceEndpoint & { isSsh: boolean; password?: string })[] {
  const exports = row.details?.exports || []
  const serviceType = String(row.details?.challenge.type || '').toLowerCase()
  const serviceRow = row.matchedServiceRows[0]
  const serviceOptions = serviceRow?.service.options || {}

  return exports
    .map((item: any, index) => {
      const endpoint = getExportEndpoint(item)
      if (!endpoint) return null

      const endpointType = String(item?.type || serviceType || '').toLowerCase()
      const isHttp = isHttpEndpoint(endpoint)
      const isReturnedTcp =
        endpointType === 'tcp' ||
        endpoint.toLowerCase().startsWith('tcp://') ||
        (!isHttp && parseTcpEndpoint(endpoint) !== null)
      const isSsh = isReturnedTcp && serviceOptions.type === 'ssh'
      const label = isSsh
        ? toSshCommand(endpoint, serviceOptions.user)
        : isReturnedTcp
          ? toTcpCommand(endpoint)
          : endpoint

      return {
        key: `${row.id}:${index}`,
        endpoint,
        label,
        copyText: isSsh ? toSshCopyCommand(endpoint, serviceOptions.user) : label,
        type: endpointType || (isHttp ? 'http' : isReturnedTcp ? 'tcp' : 'unknown'),
        provider: item?.provider ? String(item.provider) : '',
        isHttp,
        isSsh,
        password: isSsh ? serviceOptions.pass || '' : '',
      }
    })
    .filter((item): item is any => Boolean(item))
}


export function getServiceType(row: AdminServiceRow) {
  if (row.service.options.type) return row.service.options.type
  const endpoints = getServiceEndpoints(row)
  const firstEndpointType = endpoints[0]?.type
  return firstEndpointType || row.details?.challenge.type || 'unknown'
}

export function getUniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b))
}

function getPlatformServiceName(item: Record<string, unknown>, name: string) {
  return firstString(
    item.service,
    item.service_name,
    item.challenge,
    item.challenge_name,
    item.child,
    item.target,
    item.instance,
    name
  )
}

export function normalizePlatformChallengeEntries(data: unknown): AdminPlatformChallengeEntry[] {
  if (!Array.isArray(data)) return []

  const entries: AdminPlatformChallengeEntry[] = []

  data.forEach((item, index) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const name = firstString(record.name, record.platform_name, record.challenge_name)
    if (!name) return

    const key = firstString(record.key, record.challenge_key, record.access_key)
    const requiresKey = firstBoolean(record.requires_key, record.requiresKey) ?? Boolean(key)
    const keyAvailable = firstBoolean(record.key_available, record.keyAvailable) ?? (!requiresKey || Boolean(key))
    const enabled = firstBoolean(record.enabled, record.is_enabled, record.active, record.is_active) ?? true
    const serviceName = getPlatformServiceName(record, name)

    entries.push({
      id: `${name}:${key || 'no-key'}:${serviceName}:${index}`,
      name,
      serviceName,
      key,
      requiresKey,
      keyAvailable,
      keySource: firstString(record.key_source, record.keySource, record.source),
      enabled,
      raw: item,
      matchedServiceRows: [],
      challenge: null,
      event: null,
      liveDetails: null,
      comparison: 'unknown',
    })
  })

  return entries
}

function getCandidateNames(...values: string[]) {
  return new Set(values.map(normalizeLookup).filter(Boolean))
}

function matchServiceRows(rows: AdminServiceRow[], names: Set<string>) {
  return rows.filter((row) => {
    return (
      names.has(normalizeLookup(row.service.name)) ||
      names.has(normalizeLookup(row.challenge.title))
    )
  })
}

function platformEntryMatchesService(entry: AdminPlatformChallengeEntry, serviceName: string) {
  const normalizedServiceName = normalizeLookup(serviceName)
  return (
    normalizeLookup(entry.name) === normalizedServiceName ||
    normalizeLookup(entry.serviceName) === normalizedServiceName
  )
}

function platformEntryMatchesServiceKey(entry: AdminPlatformChallengeEntry, row: AdminServiceRow) {
  if (!platformEntryMatchesService(entry, row.service.name)) return false
  return normalizeLookup(entry.key) === normalizeLookup(row.service.key)
}

function matchPlatformEntries(entries: AdminPlatformChallengeEntry[], names: Set<string>) {
  return entries.filter((entry) => {
    return (
      names.has(normalizeLookup(entry.name)) ||
      names.has(normalizeLookup(entry.serviceName))
    )
  })
}

function matchLiveDetail(details: AdminNxctlStatusDetail[], names: Set<string>) {
  return details.find((detail) => names.has(normalizeLookup(detail.challenge.name))) || null
}

function dedupeServiceRows(rows: AdminServiceRow[]) {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

function getPlatformEntryComparison(
  entry: AdminPlatformChallengeEntry,
  liveDetails: AdminNxctlStatusDetail | null,
  liveFetchedAt: number | null,
  now = Date.now()
): AdminServiceComparisonStatus {
  if (entry.requiresKey && !entry.keyAvailable) return 'key_missing'

  const runtimeStatus = getRuntimeStatusFromDetail(liveDetails, null, liveFetchedAt, now)
  const isRunning = runtimeStatus === 'running'

  if (!entry.enabled && isRunning) return 'disabled_running'
  if (!entry.enabled && !isRunning) return 'valid'
  if (entry.enabled && isRunning) return 'valid'
  if (entry.enabled && runtimeStatus === 'unknown') return 'configured_not_running'
  if (entry.enabled && runtimeStatus !== 'running') return 'configured_not_running'

  return 'unknown'
}

function getLiveComparison(
  rowStatus: AdminServiceStatus,
  platformEntries: AdminPlatformChallengeEntry[]
): AdminServiceComparisonStatus {
  if (platformEntries.length === 0) {
    return rowStatus === 'running' || rowStatus === 'container_only' ? 'running_unregistered' : 'missing_from_platform'
  }
  if (platformEntries.some((entry) => entry.requiresKey && !entry.keyAvailable)) return 'key_missing'
  if (platformEntries.every((entry) => !entry.enabled)) {
    return rowStatus === 'running' || rowStatus === 'container_only' ? 'disabled_running' : 'valid'
  }
  if (rowStatus === 'running' || rowStatus === 'container_only') return 'valid'
  if (rowStatus === 'unknown') return 'unknown'
  return 'configured_not_running'
}

function getWorstComparison(statuses: AdminServiceComparisonStatus[]) {
  return statuses.reduce<AdminServiceComparisonStatus>((worst, status) => {
    return COMPARISON_SEVERITY[status] > COMPARISON_SEVERITY[worst] ? status : worst
  }, 'valid')
}

function getMixedBoolean(values: boolean[]) {
  const unique = Array.from(new Set(values))
  return unique.length === 1 ? unique[0] : null
}

function groupEntriesByKey(entries: AdminPlatformChallengeEntry[]): AdminPlatformChallengeKeyGroup[] {
  const groups = new Map<string, AdminPlatformChallengeEntry[]>()
  entries.forEach((entry) => {
    const key = entry.key || 'No key'
    groups.set(key, [...(groups.get(key) || []), entry])
  })

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, keyEntries]) => ({
      key,
      entries: keyEntries.sort((a, b) => a.serviceName.localeCompare(b.serviceName)),
    }))
}

export function buildPlatformChallengeGroups(
  entries: AdminPlatformChallengeEntry[],
  serviceRows: AdminServiceRow[],
  liveDetails: AdminNxctlStatusDetail[],
  liveFetchedAt: number | null,
  now = Date.now()
): AdminPlatformChallengeGroup[] {
  const serviceRowsByConfig = new Map<string, AdminServiceRow[]>()

  serviceRows.forEach((row) => {
    const serviceName = row.service.name.trim()
    if (!serviceName) return

    const configKey = `${normalizeLookup(serviceName)}:${normalizeLookup(row.service.key)}`
    serviceRowsByConfig.set(configKey, [...(serviceRowsByConfig.get(configKey) || []), row])
  })

  const enrichedEntries: AdminPlatformChallengeEntry[] = Array.from(serviceRowsByConfig.values()).map((rows, index) => {
    const firstRow = rows[0]
    const serviceName = firstRow.service.name.trim()
    const serviceKey = firstRow.service.key.trim()
    const exactPlatformEntry = entries.find((entry) => platformEntryMatchesServiceKey(entry, firstRow))
    const relatedPlatformEntries = entries.filter((entry) => platformEntryMatchesService(entry, serviceName))
    const relatedKeys = relatedPlatformEntries
      .map((entry) => entry.key)
      .filter(Boolean)
    const liveDetail = matchLiveDetail(liveDetails, getCandidateNames(serviceName))

    if (exactPlatformEntry) {
      return {
        ...exactPlatformEntry,
        matchedServiceRows: rows,
        challenge: firstRow.challenge,
        event: firstRow.event,
        liveDetails: liveDetail,
        comparison: getPlatformEntryComparison(exactPlatformEntry, liveDetail, liveFetchedAt, now),
      }
    }

    return {
      id: `supabase:${serviceName}:${serviceKey || 'no-key'}:${index}`,
      name: serviceName,
      serviceName,
      key: serviceKey,
      requiresKey: Boolean(serviceKey),
      keyAvailable: Boolean(serviceKey),
      keySource: relatedKeys.length > 0
        ? `Supabase challenge.services; NXCTL keys: ${relatedKeys.join(', ')}`
        : 'Supabase challenge.services',
      enabled: true,
      raw: null,
      matchedServiceRows: rows,
      challenge: firstRow.challenge,
      event: firstRow.event,
      liveDetails: liveDetail,
      comparison: liveDetail ? 'missing_from_platform' : 'configured_not_running',
    }
  })

  const groupsByName = new Map<string, AdminPlatformChallengeEntry[]>()
  enrichedEntries.forEach((entry) => {
    const groupKey = normalizeLookup(entry.name)
    groupsByName.set(groupKey, [...(groupsByName.get(groupKey) || []), entry])
  })

  return Array.from(groupsByName.values())
    .map((groupEntries) => {
      const name = groupEntries[0]?.name || 'Unknown challenge'
      const matchedServiceRows = dedupeServiceRows(groupEntries.flatMap((entry) => entry.matchedServiceRows))
      const keyValues = getUniqueOptions(groupEntries.map((entry) => entry.key))
      const serviceValues = getUniqueOptions(groupEntries.map((entry) => entry.serviceName || entry.name))
      const liveCount = groupEntries.filter((entry) => Boolean(entry.liveDetails)).length
      const keyMissingCount = groupEntries.filter((entry) => entry.requiresKey && !entry.keyAvailable).length
      const comparison = getWorstComparison(groupEntries.map((entry) => entry.comparison))

      return {
        id: normalizeLookup(name),
        name,
        entries: groupEntries.sort((a, b) => a.serviceName.localeCompare(b.serviceName)),
        keyGroups: groupEntriesByKey(groupEntries),
        matchedServiceRows,
        challenge: matchedServiceRows[0]?.challenge || null,
        event: matchedServiceRows[0]?.event || null,
        keyCount: keyValues.length,
        serviceCount: serviceValues.length,
        liveCount,
        enabled: getMixedBoolean(groupEntries.map((entry) => entry.enabled)),
        requiresKey: groupEntries.some((entry) => entry.requiresKey),
        keyAvailable: getMixedBoolean(groupEntries.map((entry) => entry.keyAvailable)),
        keyMissingCount,
        comparison,
        source: liveCount > 0 ? 'both' : 'platform' as AdminServiceSource,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function buildLiveServiceRows(
  liveDetails: AdminNxctlStatusDetail[],
  serviceRows: AdminServiceRow[],
  platformEntries: AdminPlatformChallengeEntry[],
  liveFetchedAt: number | null,
  now = Date.now()
): AdminLiveServiceRow[] {
  const detailsByName = new Map<string, AdminNxctlStatusDetail>()
  liveDetails.forEach((detail) => {
    const key = normalizeLookup(detail.challenge.name)
    if (key && !detailsByName.has(key)) detailsByName.set(key, detail)
  })

  return Array.from(detailsByName.values())
    .map((detail) => {
      const name = detail.challenge.name || 'Unknown service'
      const names = getCandidateNames(name)
      const matchedServiceRows = matchServiceRows(serviceRows, names)
      const matchedPlatformEntries = matchPlatformEntries(platformEntries, names)
      const status = getRuntimeStatusFromDetail(detail, null, liveFetchedAt, now)

      return {
        id: normalizeLookup(name),
        name,
        serviceName: name,
        details: detail,
        status,
        fetchedAt: liveFetchedAt,
        platformEntries: matchedPlatformEntries,
        matchedServiceRows,
        challenge: matchedServiceRows[0]?.challenge || matchedPlatformEntries[0]?.challenge || null,
        event: matchedServiceRows[0]?.event || matchedPlatformEntries[0]?.event || null,
        comparison: getLiveComparison(status, matchedPlatformEntries),
        source: matchedPlatformEntries.length > 0 ? 'both' : 'live' as AdminServiceSource,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getComparisonLabel(status: AdminServiceComparisonStatus) {
  const labels: Record<AdminServiceComparisonStatus, string> = {
    valid: 'Valid',
    invalid: 'Invalid',
    key_missing: 'Key missing',
    configured_not_running: 'Configured but not running',
    missing_from_platform: 'Missing from platform config',
    running_unregistered: 'Running but not registered',
    disabled_running: 'Disabled but running',
    unknown: 'Unknown',
  }

  return labels[status]
}

function isInvalidComparison(status: AdminServiceComparisonStatus) {
  return [
    'invalid',
    'key_missing',
    'configured_not_running',
    'missing_from_platform',
    'running_unregistered',
    'disabled_running',
  ].includes(status)
}

function matchesValidity(status: AdminServiceComparisonStatus, filter: AdminServicesFilters['validity']) {
  if (filter === 'all') return true
  if (filter === 'valid') return status === 'valid'
  if (filter === 'invalid') return isInvalidComparison(status)
  return status === filter
}

function isPlatformEntryKeyInvalid(entry: AdminPlatformChallengeEntry) {
  if (!entry.liveDetails) return false
  return (
    !entry.key ||
    entry.comparison === 'missing_from_platform' ||
    (entry.requiresKey && !entry.keyAvailable)
  )
}

function isPlatformGroupInvalid(group: AdminPlatformChallengeGroup) {
  return group.entries.some((entry) => {
    const hasChallengeIssue = entry.matchedServiceRows.length === 0
    const hasServiceIssue = !entry.enabled || !entry.liveDetails
    return hasChallengeIssue || hasServiceIssue || isPlatformEntryKeyInvalid(entry)
  })
}

function matchesPlatformGroupValidity(
  group: AdminPlatformChallengeGroup,
  filter: AdminServicesFilters['validity']
) {
  if (filter === 'all') return true
  if (filter === 'valid') return group.liveCount > 0
  if (filter === 'invalid') return group.liveCount === 0
  if (filter === 'key_missing') return group.entries.some(isPlatformEntryKeyInvalid)
  if (filter === 'configured_not_running') return group.entries.some((entry) => !entry.liveDetails)
  if (filter === 'missing_from_platform') {
    return group.entries.some((entry) => Boolean(entry.liveDetails) && entry.comparison === 'missing_from_platform')
  }
  return matchesValidity(group.comparison, filter)
}

function matchesSourceFilter(hasPlatform: boolean, hasLive: boolean, filter: AdminServicesFilters['source']) {
  if (filter === 'all') return true
  if (filter === 'platform') return hasPlatform
  if (filter === 'live') return hasLive
  return hasPlatform && hasLive
}

function valuesMatchKeyword(values: Array<string | null | undefined>, keyword: string) {
  if (!keyword) return true
  return values.some((value) => String(value || '').toLowerCase().includes(keyword))
}

function matchesPlatformFilters(entries: AdminPlatformChallengeEntry[], filters: AdminServicesFilters) {
  if (filters.key === 'no_key' && entries.some((entry) => !!entry.key && entry.key.trim() !== '')) return false
  if (filters.key !== 'all' && filters.key !== 'no_key' && !entries.some((entry) => entry.key === filters.key)) return false
  if (filters.enabled === 'enabled' && !entries.some((entry) => entry.enabled)) return false
  if (filters.enabled === 'disabled' && !entries.some((entry) => !entry.enabled)) return false
  if (filters.requiresKey === 'required' && !entries.some((entry) => entry.requiresKey)) return false
  if (filters.requiresKey === 'not_required' && !entries.some((entry) => !entry.requiresKey)) return false
  if (filters.keyAvailable === 'available' && !entries.some((entry) => entry.keyAvailable)) return false
  if (filters.keyAvailable === 'missing' && !entries.some((entry) => !entry.keyAvailable)) return false
  return true
}

export function getFilteredPlatformGroups(
  groups: AdminPlatformChallengeGroup[],
  filters: AdminServicesFilters,
  now = Date.now()
) {
  const keyword = filters.search.trim().toLowerCase()

  return groups.filter((group) => {
    if (!matchesPlatformGroupValidity(group, filters.validity)) return false
    if (!matchesSourceFilter(true, group.liveCount > 0, filters.source)) return false
    if (!matchesPlatformFilters(group.entries, filters)) return false

    if (filters.runtimeStatus !== 'all') {
      const hasRuntimeStatus = group.entries.some((entry) => {
        return getRuntimeStatusFromDetail(entry.liveDetails, null, undefined, now) === filters.runtimeStatus
      })
      if (!hasRuntimeStatus) return false
    }

    return valuesMatchKeyword([
      group.name,
      group.challenge?.title,
      group.event?.name,
      ...group.entries.map((entry) => entry.serviceName),
      ...group.entries.map((entry) => entry.key),
      ...group.entries.map((entry) => entry.keySource),
    ], keyword)
  })
}

export function getFilteredLiveRows(
  rows: AdminLiveServiceRow[],
  filters: AdminServicesFilters
) {
  const keyword = filters.search.trim().toLowerCase()

  return rows.filter((row) => {
    const hasPlatform = row.platformEntries.length > 0
    if (filters.validity === 'valid' && !hasPlatform) return false
    if (filters.validity === 'invalid' && hasPlatform) return false
    if (!['all', 'valid', 'invalid'].includes(filters.validity) && !matchesValidity(row.comparison, filters.validity)) return false
    if (!matchesSourceFilter(hasPlatform, true, filters.source)) return false
    if (filters.runtimeStatus !== 'all' && row.status !== filters.runtimeStatus) return false

    if (hasPlatform) {
      if (!matchesPlatformFilters(row.platformEntries, filters)) return false
    } else if (
      filters.key !== 'all' ||
      filters.enabled !== 'all' ||
      filters.requiresKey !== 'all' ||
      filters.keyAvailable !== 'all'
    ) {
      return false
    }

    return valuesMatchKeyword([
      row.name,
      row.challenge?.title,
      row.event?.name,
      row.details.runtime.container_id,
      row.details.challenge.type,
      ...row.platformEntries.map((entry) => entry.key),
      ...row.platformEntries.map((entry) => entry.keySource),
      ...row.matchedServiceRows.map((serviceRow) => serviceRow.service.key),
    ], keyword)
  })
}

export function getServicesSummary(
  groups: AdminPlatformChallengeGroup[],
  liveRows: AdminLiveServiceRow[]
): AdminServicesSummaryCounts {
  const invalidPlatformGroups = groups.filter(isPlatformGroupInvalid)

  return {
    platformGroups: groups.length,
    platformEntries: groups.reduce((count, group) => count + group.entries.length, 0),
    liveServices: liveRows.length,
    valid: groups.length - invalidPlatformGroups.length,
    invalid: invalidPlatformGroups.length,
    configuredNotRunning: groups.filter((group) => group.comparison === 'configured_not_running').length,
    runningUnregistered: liveRows.filter((row) => row.comparison === 'running_unregistered').length,
  }
}
