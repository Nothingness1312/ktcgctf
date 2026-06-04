"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Search } from 'lucide-react'
import { ImageWithFallback } from '@/shared/components'
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
import { AdminPageSurface, AdminFilterBar, AdminTableSurface, AdminEmptyState } from '@/features/admin/ui'
import type { AdminUserRow, UserSocialLinks } from '../types'

type UsersTableCardProps = {
  users: AdminUserRow[]
}

type RoleFilter = 'all' | 'admin' | 'user'
type SortMode = 'newest' | 'oldest' | 'username_asc' | 'updated_desc' | 'role'

type SocialItem = {
  key: string
  label: string
  value: string
  href: string | null
}

const PAGE_SIZE_OPTIONS = [25, 50, 100]

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

function compareDateDesc(a?: string, b?: string) {
  return new Date(b || 0).getTime() - new Date(a || 0).getTime()
}

function compareDateAsc(a?: string, b?: string) {
  return new Date(a || 0).getTime() - new Date(b || 0).getTime()
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

export default function UsersTableCard({ users }: UsersTableCardProps) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null)

  const resetPage = () => setPage(1)

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return users
      .filter((listedUser) => {
        if (roleFilter === 'admin' && !listedUser.is_admin) return false
        if (roleFilter === 'user' && listedUser.is_admin) return false
        if (!keyword) return true

        return (
          listedUser.username.toLowerCase().includes(keyword) ||
          listedUser.id.toLowerCase().includes(keyword) ||
          (listedUser.bio || '').toLowerCase().includes(keyword)
        )
      })
      .sort((a, b) => {
        if (sortMode === 'newest') return compareDateDesc(a.created_at, b.created_at)
        if (sortMode === 'oldest') return compareDateAsc(a.created_at, b.created_at)
        if (sortMode === 'updated_desc') return compareDateDesc(a.updated_at, b.updated_at)
        if (sortMode === 'role') {
          if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1
          return a.username.localeCompare(b.username)
        }
        return a.username.localeCompare(b.username)
      })
  }, [query, roleFilter, sortMode, users])

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const startIndex = (safePage - 1) * pageSize
  const visibleUsers = filteredUsers.slice(startIndex, startIndex + pageSize)
  const firstResult = filteredUsers.length === 0 ? 0 : startIndex + 1
  const lastResult = Math.min(startIndex + pageSize, filteredUsers.length)
  const adminCount = users.filter((listedUser) => listedUser.is_admin).length

  const handleCopyUserId = async (id: string) => {
    if (!navigator.clipboard) return

    await navigator.clipboard.writeText(id)
    setCopiedUserId(id)
    window.setTimeout(() => {
      setCopiedUserId((currentId) => (currentId === id ? null : currentId))
    }, 1200)
  }

  return (
    <AdminPageSurface>
      <AdminFilterBar>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  resetPage()
                }}
                placeholder="Search username, ID, bio..."
                className="rounded-xl pl-9"
              />
            </div>

            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as RoleFilter)
                resetPage()
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortMode}
              onValueChange={(value) => {
                setSortMode(value as SortMode)
                resetPage()
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="username_asc">Username</SelectItem>
                <SelectItem value="updated_desc">Recently updated</SelectItem>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                resetPage()
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AdminFilterBar>

        {filteredUsers.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState
              title="No users match the current filters"
              description="Try adjusting your search, role filter, or sort."
            />
          </div>
        ) : (
          <>
            <AdminTableSurface>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200/80 hover:bg-transparent dark:border-gray-800">
                    <TableHead className="pl-6">User</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Social</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUsers.map((listedUser) => {
                    const socialItems = getSocialItems(listedUser.sosmed)
                    const profileHref = listedUser.username
                      ? `/user/${encodeURIComponent(listedUser.username)}`
                      : null

                    return (
                      <TableRow
                        key={listedUser.id}
                        className="border-b border-gray-100/80 transition-colors duration-150 ease-in-out last:border-b-0 hover:bg-blue-50/40 dark:border-gray-800/70 dark:hover:bg-blue-900/10"
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
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground" title={listedUser.id}>
                              {truncateUserId(listedUser.id)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyUserId(listedUser.id)}
                              aria-label="Copy user ID"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-blue-600 dark:hover:text-blue-300"
                            >
                              {copiedUserId === listedUser.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              listedUser.is_admin
                                ? 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                                : 'border-gray-300/80 bg-gray-100/60 text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300'
                            }
                          >
                            {listedUser.is_admin ? 'Admin' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {socialItems.length > 0 ? (
                            <div className="flex max-w-[260px] flex-wrap gap-1.5">
                              {socialItems.slice(0, 3).map((item) => (
                                item.href ? (
                                  <a
                                    key={item.key}
                                    href={item.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/15 dark:text-blue-300"
                                    title={item.value}
                                  >
                                    {item.label}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span
                                    key={item.key}
                                    className="inline-flex rounded-lg border border-gray-300/70 bg-gray-100/60 px-2 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300"
                                    title={item.value}
                                  >
                                    {item.label}
                                  </span>
                                )
                              ))}
                              {socialItems.length > 3 && (
                                <span className="inline-flex rounded-lg border border-gray-300/70 bg-gray-100/60 px-2 py-1 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400">
                                  +{socialItems.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
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
                Showing {firstResult}-{lastResult} of {filteredUsers.length}
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
          </>
        )}
      </AdminPageSurface>
  )
}
