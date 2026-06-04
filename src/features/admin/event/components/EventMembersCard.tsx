import React from 'react'
import { Button, Input, Label } from '@/shared/ui'
import { ADMIN_NATIVE_SELECT_CLASS } from '@/features/admin/ui/form-field-styles'
import { AdminDataSurface } from '@/features/admin/ui'
import type { Event, EventMemberRow, UserLite } from '../types'

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
}) => {
  return (
    <AdminDataSurface className="p-6" contentClassName="space-y-6">
      <div className="border-b border-gray-150 dark:border-gray-800/60 pb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Event Members</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Event</Label>
          <select
            value={manageEventId}
            onChange={(e) => onManageEventChange(e.target.value)}
            className={`mt-1.5 ${ADMIN_NATIVE_SELECT_CLASS}`}
          >
            <option value="">Select event</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>{evt.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Quick Assign User</Label>
            <Input
              placeholder="Type username (min 2 chars)..."
              value={assignUserQuery}
              onChange={(e) => onAssignUserQueryChange(e.target.value)}
              className="mt-1.5 rounded-xl"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500/70">
              Search on demand.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onSelectAllCandidates}
                disabled={candidateUsers.length === 0}
                className="rounded-xl"
              >
                Select All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearCandidateSelection}
                disabled={selectedCandidateUserIds.length === 0}
                className="rounded-xl"
              >
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
            <div className="mt-3 divide-y divide-gray-150 dark:divide-gray-800/85 rounded-xl bg-gray-50/25 dark:bg-black/10 overflow-hidden">
              {manageEventId === '' ? (
                <div className="py-4 px-3 text-sm text-gray-500 dark:text-gray-400">Select event first</div>
              ) : assignUserQuery.trim().length < 2 ? (
                <div className="py-4 px-3 text-sm text-gray-500 dark:text-gray-400">Type at least 2 characters to search users</div>
              ) : loadingUserSearch ? (
                <div className="py-4 px-3 text-sm text-gray-500 dark:text-gray-400">Searching users...</div>
              ) : candidateUsers.length === 0 ? (
                <div className="py-4 px-3 text-sm text-gray-500 dark:text-gray-400">No matching users (or all already members)</div>
              ) : (
                candidateUsers.map((user) => (
                  <div key={user.id} className="px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-gray-50/20 dark:hover:bg-gray-900/10 transition-colors">
                    <div className="min-w-0 flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedCandidateUserIds.includes(user.id)}
                        onChange={() => onToggleCandidateSelection(user.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.id}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onQuickAddMember(user.id)}
                      disabled={memberActionUserId === user.id}
                      className="rounded-xl"
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Current Members</Label>
            <Input
              placeholder="Search current member..."
              value={memberQuery}
              onChange={(e) => onMemberQueryChange(e.target.value)}
              className="mt-1.5 rounded-xl"
            />
            <div className="mt-3 divide-y divide-gray-150 dark:divide-gray-800/85 rounded-xl bg-gray-50/25 dark:bg-black/10 max-h-[300px] overflow-auto">
              {loadingEventMembers ? (
                <div className="py-4 px-3 text-sm text-gray-500 dark:text-gray-400">Loading members...</div>
              ) : filteredEventMembers.length === 0 ? (
                <div className="py-4 px-3 text-sm text-gray-500 dark:text-gray-400">No members yet</div>
              ) : (
                filteredEventMembers.map((member) => (
                  <div key={member.user_id} className="px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-gray-50/20 dark:hover:bg-gray-900/10 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{member.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.user_id}</p>
                      <p className="mt-1 font-mono text-[10px] text-gray-500/80 dark:text-gray-500">Joined: {new Date(member.joined_at).toLocaleString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRemoveMember(member.user_id)}
                      disabled={memberActionUserId === member.user_id}
                      className="rounded-xl"
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminDataSurface>
  )
}

export default EventMembersCard
