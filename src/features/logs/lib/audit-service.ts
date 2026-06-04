import { supabase } from '@/lib/supabase/client'

export interface AuditLogEntry {
  id: string
  created_at: string
  ip_address: string | null
  username: string | null
  payload: {
    action: string
    actor_username?: string
    traits?: {
      provider?: string
      user_id?: string
      user_email?: string
    }
  }
}

// The generated Supabase types don't include p_action_filters for this RPC.
// Use a typed helper to call it with the correct parameters.
function callAuditRpc(args: { p_limit: number; p_offset: number; p_action_filters: string[] | null }) {
  return (supabase.rpc as any)('get_auth_audit_logs', args) as ReturnType<typeof supabase.rpc>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeAuditLog(row: any): AuditLogEntry {
  const payload = isRecord(row.payload) ? row.payload : {}
  const traits = isRecord(payload.traits) ? payload.traits : undefined

  return {
    id: String(row.id || ''),
    created_at: String(row.created_at || ''),
    ip_address: row.ip_address ?? null,
    username: row.username ?? null,
    payload: {
      action: typeof payload.action === 'string' ? payload.action : '',
      actor_username: typeof payload.actor_username === 'string' ? payload.actor_username : undefined,
      traits: traits
        ? {
            provider: typeof traits.provider === 'string' ? traits.provider : undefined,
            user_id: typeof traits.user_id === 'string' ? traits.user_id : undefined,
            user_email: typeof traits.user_email === 'string' ? traits.user_email : undefined,
          }
        : undefined,
    },
  }
}

export async function getAuditLogs(limit = 1000, actionFilters?: string[]): Promise<AuditLogEntry[]> {
  const batchSize = 1000
  const actionFiltersParam = actionFilters && actionFilters.length > 0 ? actionFilters : null

  if (limit <= batchSize) {
    const { data, error } = await callAuditRpc({
      p_limit: limit,
      p_offset: 0,
      p_action_filters: actionFiltersParam,
    })

    if (error) {
      console.error('Error fetching audit logs RPC:', error)
      return []
    }

    return (data ?? []).map(normalizeAuditLog)
  }

  const batchCount = Math.ceil(limit / batchSize)
  const promises = Array.from({ length: batchCount }, (_, i) =>
    callAuditRpc({
      p_limit: batchSize,
      p_offset: i * batchSize,
      p_action_filters: actionFiltersParam,
    })
  )

  const results = await Promise.all(promises)
  const logs = results.flatMap(({ data }) => data ?? []).map(normalizeAuditLog)

  return logs.slice(0, limit)
}
