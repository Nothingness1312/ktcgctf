"use client"

import React, { useState } from 'react'
import { Check, UserPlus, Users, X } from 'lucide-react'
import { Button, SearchInput } from '@/shared/ui'
import {
  AdminDataSurface,
  AdminEmptyState,
  AdminFilterSelect,
  AdminStatusBadge,
  AdminTabs,
} from '@/features/admin/ui'
import type { Event, EventJoinRequestRow, EventMemberRow, UserLite } from '../types'

interface EventMembersCardProps {
  events: Event[]
  manageEventId: string
  onManageEventChange: (eventId: string) => void
  assignUserQuery: string
  onAssignUserQueryChange: (query: string) => void
  loadingUserSearch: boolean
  candidateUsers: UserLite[]
  selectedCandidateUserIds: string[]
  onToggleCandidateSelection: (userId: string) => void
  onSelectAllCandidates: () => void
  onClearCandidateSelection: () => void
  onQuickAddSelectedMembers: () => void
  memberActionUserId: string | null
  onQuickAddMember: (userId: string) => void
  memberQuery: string
  onMemberQueryChange: (query: string) => void
  loadingEventMembers: boolean
  filteredEventMembers: EventMemberRow[]
  onRemoveMember: (userId: string) => void
  joinRequests: EventJoinRequestRow[]
  loadingJoinRequests: boolean
  reviewingRequestId: string | null
  onReviewRequest: (requestId: string, approve: boolean) => void
}

type AccessTab = 'members' | 'requests'

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const EventMembersCard: React.FC<EventMembersCardProps> = ({
  events,
  manageEventId,
  onManageEventChange,
  assignUserQuery,
  onAssignUserQueryChange,
  loadingUserSearch,
  candidateUsers,
  selectedCandidateUserIds,
  onToggleCandidateSelection,
  onSelectAllCandidates,
  onClearCandidateSelection,
  onQuickAddSelectedMembers,
  memberActionUserId,
  onQuickAddMember,
  memberQuery,
  onMemberQueryChange,
  loadingEventMembers,
  filteredEventMembers,
  onRemoveMember,
  joinRequests,
  loadingJoinRequests,
  reviewingRequestId,
  onReviewRequest,
}) => {
  const [activeTab, setActiveTab] = useState<AccessTab>('members')

  return (
    <AdminDataSurface className="h-[calc(100dvh-8.5rem)] min-h-[520px]" contentClassName="flex h-full min-h-0 flex-col p-0">
      <div className="shrink-0 border-b border-gray-200/70 bg-white/95 p-3 backdrop-blur-md dark:border-gray-800/70 dark:bg-[#0b0f19]/95">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <AdminFilterSelect
              value={manageEventId || 'none'}
              defaultValue="none"
              onValueChange={(value) => onManageEventChange(value === 'none' ? '' : value)}
              className="w-full sm:w-[260px]"
              options={[
                { value: 'none', label: 'Select event' },
                ...events.map((event) => ({ value: event.id, label: event.name })),
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone={filteredEventMembers.length > 0 ? 'info' : 'muted'}>
                {filteredEventMembers.length} members
              </AdminStatusBadge>
              <AdminStatusBadge tone={joinRequests.length > 0 ? 'warning' : 'muted'}>
                {joinRequests.length} pending
              </AdminStatusBadge>
            </div>
          </div>

          <AdminTabs<AccessTab>
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { value: 'members', label: 'Members', icon: Users },
              { value: 'requests', label: 'Join Requests', icon: UserPlus },
            ]}
            stretch
            className="w-full sm:w-fit"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'members' ? (
          <div className="grid min-h-full gap-0 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section className="border-b border-gray-200/70 p-4 dark:border-gray-800/70 lg:border-b-0 lg:border-r">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Add Members</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Search users and add them to the selected event.</p>
                </div>
                <SearchInput
                  placeholder="Type username..."
                  value={assignUserQuery}
                  onChange={onAssignUserQueryChange}
                  containerClassName="max-w-none"
                  inputClassName="text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={onSelectAllCandidates} disabled={candidateUsers.length === 0} className="rounded-xl">
                    Select All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onClearCandidateSelection} disabled={selectedCandidateUserIds.length === 0} className="rounded-xl">
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={onQuickAddSelectedMembers}
                    disabled={memberActionUserId === '__bulk__' || selectedCandidateUserIds.length === 0}
                    className="rounded-xl"
                  >
                    Add Selected ({selectedCandidateUserIds.length})
                  </Button>
                </div>
              </div>

              <div className="mt-4 divide-y divide-gray-150 overflow-hidden rounded-xl border border-gray-200/70 dark:divide-gray-800/85 dark:border-gray-800/80">
                {manageEventId === '' ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Select event first</div>
                ) : assignUserQuery.trim().length < 2 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Type at least 2 characters to search users</div>
                ) : loadingUserSearch ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Searching users...</div>
                ) : candidateUsers.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No matching users or all are already members</div>
                ) : (
                  candidateUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-900/25">
                      <label className="flex min-w-0 cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedCandidateUserIds.includes(user.id)}
                          onChange={() => onToggleCandidateSelection(user.id)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{user.username}</span>
                          <span className="block truncate font-mono text-[10px] text-gray-500">{user.id}</span>
                        </span>
                      </label>
                      <Button size="sm" onClick={() => onQuickAddMember(user.id)} disabled={memberActionUserId === user.id} className="rounded-xl">
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="min-h-0 p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Current Members</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Users currently registered for this event.</p>
                </div>
                <SearchInput
                  placeholder="Search current member..."
                  value={memberQuery}
                  onChange={onMemberQueryChange}
                  containerClassName="max-w-none sm:w-[260px]"
                  inputClassName="text-sm"
                />
              </div>

              <div className="divide-y divide-gray-150 overflow-hidden rounded-xl border border-gray-200/70 dark:divide-gray-800/85 dark:border-gray-800/80">
                {loadingEventMembers ? (
                  <div className="p-5 text-sm text-gray-500 dark:text-gray-400">Loading members...</div>
                ) : filteredEventMembers.length === 0 ? (
                  <div className="p-6">
                    <AdminEmptyState title="No members yet" description="Search users on the left to add members." />
                  </div>
                ) : (
                  filteredEventMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-900/25">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{member.username}</p>
                        <p className="truncate font-mono text-[10px] text-gray-500">{member.user_id}</p>
                        <p className="mt-1 text-[10px] font-semibold text-gray-500">Joined {formatDate(member.joined_at)}</p>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => onRemoveMember(member.user_id)} disabled={memberActionUserId === member.user_id} className="rounded-xl">
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : (
          <section className="p-4">
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Pending Join Requests</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Approve users to add them as event members, or reject requests that should not join.</p>
            </div>

            <div className="divide-y divide-gray-150 overflow-hidden rounded-xl border border-gray-200/70 dark:divide-gray-800/85 dark:border-gray-800/80">
              {!manageEventId ? (
                <div className="p-6">
                  <AdminEmptyState title="Select an event first" description="Choose an event to review join requests." />
                </div>
              ) : loadingJoinRequests ? (
                <div className="p-5 text-sm text-gray-500 dark:text-gray-400">Loading requests...</div>
              ) : joinRequests.length === 0 ? (
                <div className="p-6">
                  <AdminEmptyState title="No pending requests" description="Pending requests for the selected event will appear here." />
                </div>
              ) : (
                joinRequests.map((request) => (
                  <div key={request.request_id} className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-900/25 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{request.username || request.user_id}</p>
                      <p className="truncate font-mono text-[10px] text-gray-500">{request.user_id}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Requested {formatDate(request.requested_at)}</p>
                      {request.note ? (
                        <p className="mt-2 rounded-xl border border-gray-200/70 bg-gray-50/70 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
                          {request.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => onReviewRequest(request.request_id, true)}
                        disabled={reviewingRequestId === request.request_id}
                        className="gap-1.5 rounded-xl"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReviewRequest(request.request_id, false)}
                        disabled={reviewingRequestId === request.request_id}
                        className="gap-1.5 rounded-xl"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </AdminDataSurface>
  )
}

export default EventMembersCard
