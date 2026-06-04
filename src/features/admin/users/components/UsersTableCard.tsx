"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink } from 'lucide-react'
import { ImageWithFallback } from '@/shared/components'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
import {
  ADMIN_ROW_CLASS,
  AdminDataSurface,
  AdminEmptyState,
  AdminFilterInput,
  AdminFilterSelect,
  AdminFilterToolbar,
  AdminStatusBadge,
  AdminTableSurface,
} from '@/features/admin/ui'
import type { AdminUserRow, UserSocialLinks } from '../types'

type UsersTableCardProps = {
  users: AdminUserRow[]
  totalCount: number
  isDataLoading: boolean
  query: string
  setQuery: (q: string) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  roleFilter: 'all' | 'admin' | 'user'
  setRoleFilter: (role: 'all' | 'admin' | 'user') => void
  sortMode: 'newest' | 'oldest' | 'username_asc' | 'updated_desc' | 'role'
  setSortMode: (sort: 'newest' | 'oldest' | 'username_asc' | 'updated_desc' | 'role') => void
  pageSize: number
  setPageSize: (size: number) => void
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
}

type RoleFilter = 'all' | 'admin' | 'user'
type SortMode = 'newest' | 'oldest' | 'username_asc' | 'updated_desc' | 'role'

type SocialItem = {
  key: string
  label: string
  value: string
  href: string | null
}

const PAGE_SIZE_OPTIONS = [100, 500, 1000]

function formatDate(value?: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncateUserId(id: string) {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-6)}`
}

function isHttpUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://')
}

function getSocialItems(sosmed: UserSocialLinks): SocialItem[] {
  if (!sosmed) return []

  return Object.entries(sosmed)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, rawValue]) => {
      const value = String(rawValue).trim()
      const label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())

      return {
        key,
        label,
        value,
        href: isHttpUrl(value) ? value : null,
      }
    })
}

export default function UsersTableCard({
  users,
  totalCount,
  isDataLoading,
  query,
  setQuery,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  sortMode,
  setSortMode,
  pageSize,
  setPageSize,
  page,
  setPage,
}: UsersTableCardProps) {
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null)

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, pageCount)
  const firstResult = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1
  const lastResult = Math.min(safePage * pageSize, totalCount)
  
  const handleCopyUserId = async (id: string) => {
    if (!navigator.clipboard) return

    await navigator.clipboard.writeText(id)
    setCopiedUserId(id)
    window.setTimeout(() => {
      setCopiedUserId((currentId) => (currentId === id ? null : currentId))
    }, 1200)
  }

  return (
    <AdminDataSurface
      empty={users.length === 0 ? (
        <AdminEmptyState
          title="No users match the current filters"
          description="Try adjusting your search, role filter, or sort."
        />
      ) : null}
    >
            <AdminTableSurface>
              <Table>
                <TableHeader className="border-b border-gray-200/70 dark:border-gray-800/70">
                  <TableRow>
                    <TableHead className="pl-6 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">User</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Role</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Created</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Updated</TableHead>
                    <TableHead className="pr-6 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((listedUser) => {
                    const profileHref = listedUser.username
                      ? `/user/${encodeURIComponent(listedUser.username)}`
                      : null

                    return (
                      <TableRow
                        key={listedUser.id}
                        className={ADMIN_ROW_CLASS}
                      >
                        <TableCell className="pl-6">
                          <div className="flex min-w-[180px] items-center gap-3">
                            <ImageWithFallback
                              src={listedUser.profile_picture_url}
                              alt={listedUser.username}
                              size={38}
                              className="shrink-0 rounded-full ring-1 ring-blue-500/15"
                              fallbackBg="bg-blue-500/10 dark:bg-blue-500/15"
                            />
                            <div className="min-w-0">
                              {profileHref ? (
                                <Link
                                  href={profileHref}
                                  className="block truncate font-semibold text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-300"
                                >
                                  {listedUser.username}
                                </Link>
                              ) : (
                                <span className="block truncate font-semibold text-gray-900 dark:text-gray-100">
                                  Unknown user
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Profile record
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge tone={listedUser.is_admin ? 'info' : 'neutral'}>
                            {listedUser.is_admin ? 'Admin' : 'User'}
                          </AdminStatusBadge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {listedUser.email || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDate(listedUser.created_at)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDate(listedUser.updated_at)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {profileHref ? (
                            <Button asChild variant="outline" size="sm" className="rounded-xl">
                              <Link href={profileHref}>
                                <ExternalLink className="h-4 w-4" />
                                View
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="rounded-xl" disabled>
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </AdminTableSurface>

            <div className="mx-6 my-4 flex flex-col gap-3 border-t border-gray-200/80 pt-4 text-sm text-muted-foreground dark:border-gray-800/80 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {firstResult}-{lastResult} of {totalCount}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={safePage <= 1}
                  aria-label="Previous page"
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
                  aria-label="Next page"
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
