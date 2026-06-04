import React from 'react'
import AdminChallengeScopeTabs from './AdminChallengeScopeTabs'
import AdminChallengeFilters from './AdminChallengeFilters'
import type { AdminChallengeFilterState } from '../types'

interface AdminChallengesToolbarProps {
  filters: AdminChallengeFilterState
  onFiltersChange: React.Dispatch<React.SetStateAction<AdminChallengeFilterState>>
  categories: string[]
  difficulties: string[]
  onClear: () => void
  actions?: React.ReactNode
  status?: React.ReactNode
}

export default function AdminChallengesToolbar({
  filters,
  onFiltersChange,
  categories,
  difficulties,
  onClear,
  actions,
  status,
}: AdminChallengesToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5">
        {/* Row 1: Scope tabs & Add Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100/50 dark:border-gray-800/30">
          <div className="flex items-center">
            <AdminChallengeScopeTabs
              value={filters.scope}
              onChange={(val) => onFiltersChange((prev) => ({ ...prev, scope: val }))}
            />
          </div>
          <div className="flex items-center gap-2">
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
          onClear={onClear}
        />
      </div>
    </div>
  )
}
