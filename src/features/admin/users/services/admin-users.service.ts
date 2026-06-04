import { supabase } from '@/lib/supabase/client'
import type { AdminUserRow, UserSocialLinks } from '../types'

function normalizeSocialLinks(value: unknown): UserSocialLinks {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeAdminUser(row: any): AdminUserRow {
  return {
    id: String(row.id),
    username: String(row.username ?? ''),
    email: row.email ? String(row.email) : null,
    is_admin: !!row.is_admin,
    bio: row.bio ? String(row.bio) : null,
    sosmed: normalizeSocialLinks(row.sosmed),
    profile_picture_url: row.profile_picture_url ? String(row.profile_picture_url) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

export async function getAdminUsers(params?: {
  search?: string
  role?: 'all' | 'admin' | 'user'
  sortBy?: 'newest' | 'oldest' | 'username_asc' | 'updated_desc' | 'role'
  limit?: number
  offset?: number
}): Promise<{ users: AdminUserRow[]; totalCount: number }> {
  try {
    const { data, error } = await supabase.rpc('get_admin_users_paginated', {
      p_search: params?.search || null,
      p_role: params?.role || 'all',
      p_sort_by: params?.sortBy || 'newest',
      p_limit: params?.limit || 100,
      p_offset: params?.offset || 0,
    })

    if (error) {
      console.error('Error fetching admin users RPC:', error)
      return { users: [], totalCount: 0 }
    }

    const totalCount = data && data[0] ? Number(data[0].total_count) : 0

    return {
      users: (data || []).map(normalizeAdminUser),
      totalCount,
    }
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return { users: [], totalCount: 0 }
  }
}
