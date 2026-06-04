import React from 'react'
import AdminChallengeScopeTabs from './AdminChallengeScopeTabs'
import AdminChallengeFilters from './AdminChallengeFilters'
import { AdminFilterBar } from '@/features/admin/ui'
import type { AdminChallengeEventId, AdminChallengeFilterState, Event } from '../types'

interface AdminChallengesToolbarProps {
  filters: AdminChallengeFilterState
  onFiltersChange: React.Dispatch<React.SetStateAction<AdminChallengeFilterState>>
  categories: string[]
  difficulties: string[]
  events: Event[]
  selectedEventId: AdminChallengeEventId
  onEventChange: (eventId: AdminChallengeEventId) => void
  isGlobalAdmin: boolean
  onClear: () => void
  actions?: React.ReactNode
  status?: React.ReactNode
}

export default function AdminChallengesToolbar({
  filters,
  onFiltersChange,
  categories,
  difficulties,
  events,
  selectedEventId,
  onEventChange,
  isGlobalAdmin,
  onClear,
  actions,
  status,
}: AdminChallengesToolbarProps) {
  return (
    <AdminFilterBar className="flex flex-col gap-4 border-b border-gray-200/80 dark:border-gray-700/80">
      <div className="flex flex-col gap-4">
        {/* Row 1: Scope tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/40 dark:border-gray-800/40 pb-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Filter Scope</span>
            <AdminChallengeScopeTabs
              value={filters.scope}
              onChange={(val) => onFiltersChange((prev) => ({ ...prev, scope: val }))}
            />
          </div>
          <div className="flex items-center gap-3">
            {status}
            {actions}
          </div>
        </div>

        {/* Row 2: Search and Select dropdowns */}
        <AdminChallengeFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          categories={categories}
          difficulties={difficulties}
          events={events}
          selectedEventId={selectedEventId}
          onEventChange={onEventChange}
          isGlobalAdmin={isGlobalAdmin}
          onClear={onClear}
        />
      </div>
    </AdminFilterBar>
  )
}
