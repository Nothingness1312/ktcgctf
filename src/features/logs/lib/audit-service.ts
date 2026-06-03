import { supabase } from '@/lib/supabase/client'

export interface AuditLogEntry {
  id: string
  created_at: string
  ip_address: string | null
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

/**
 * Fetch audit logs via RPC (auto pagination, adaptive limit)
 */
export async function getAuditLogs(limit = 1000): Promise<AuditLogEntry[]> {
  const batchSize = 1000

  if (limit <= batchSize) {
    const { data, error } = await supabase.rpc('get_auth_audit_logs', {
      p_limit: limit,
      p_offset: 0,
    })

    if (error) {
      console.error('Error fetching audit logs RPC:', error)
      return []
    }

    return (data ?? []).map(normalizeAuditLog)
  }

  const batchCount = Math.ceil(limit / batchSize)
  const promises = Array.from({ length: batchCount }, (_, i) =>
    supabase.rpc('get_auth_audit_logs', {
      p_limit: batchSize,
      p_offset: i * batchSize,
    })
  )

  const results = await Promise.all(promises)
  const logs = results.flatMap(({ data }) => data ?? []).map(normalizeAuditLog)

  return logs.slice(0, limit)
}
