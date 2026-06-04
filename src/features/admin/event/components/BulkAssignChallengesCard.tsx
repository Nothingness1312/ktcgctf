import React from 'react'
import ChallengeFilterBar from '@/features/challenges/components/ChallengeFilterBar'
import { Button, Label } from '@/shared/ui'
import { ADMIN_NATIVE_SELECT_CLASS } from '@/features/admin/ui/form-field-styles'
import { AdminDataSurface, AdminEmptyState } from '@/features/admin/ui'
import { DEFAULT_EVENT_FILTERS } from '../lib'
import type { ChallengeLite, Event, FilterState } from '../types'

interface BulkAssignChallengesCardProps {
  events: Event[]
  filters: FilterState
  onFilterChange: React.Dispatch<React.SetStateAction<FilterState>>
  categories: string[]
  difficulties: string[]
  onSelectAllFiltered: () => void
  onClearSelection: () => void
  bulkEventId: string
  onBulkEventChange: (eventId: string) => void
  onBulkAssign: () => void
  onBulkRemove: () => void
  bulkSubmitting: boolean
  filteredChallenges: ChallengeLite[]
  selectedIds: string[]
  onToggleSelect: (challengeId: string) => void
}

const BulkAssignChallengesCard: React.FC<BulkAssignChallengesCardProps> = ({
  events,
  filters,
  onFilterChange,
  categories,
  difficulties,
  onSelectAllFiltered,
  onClearSelection,
  bulkEventId,
  onBulkEventChange,
  onBulkAssign,
  onBulkRemove,
  bulkSubmitting,
  filteredChallenges,
  selectedIds,
  onToggleSelect,
}) => {
  return (
    <AdminDataSurface className="p-6" contentClassName="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800/60 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Bulk Assign Challenges</h2>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
            Select multiple challenges, then assign or remove event.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onSelectAllFiltered} className="rounded-xl">
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="rounded-xl">
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Target Event</Label>
            <select
              value={bulkEventId}
              onChange={(event) => onBulkEventChange(event.target.value)}
              className={`mt-1.5 ${ADMIN_NATIVE_SELECT_CLASS}`}
            >
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={onBulkAssign} disabled={bulkSubmitting} className="min-w-[96px] rounded-xl">Assign</Button>
            <Button variant="secondary" onClick={onBulkRemove} disabled={bulkSubmitting} className="min-w-[120px] rounded-xl">Remove Event</Button>
          </div>
        </div>

        <div>
          <ChallengeFilterBar
            filters={filters}
            categories={categories}
            difficulties={difficulties}
            onFilterChange={onFilterChange}
            onClear={() => onFilterChange(DEFAULT_EVENT_FILTERS)}
            showStatusFilter={false}
          />
        </div>

        <div className="max-h-[360px] overflow-auto divide-y divide-gray-150 dark:divide-gray-800/85 rounded-xl bg-gray-50/25 dark:bg-black/10">
          {filteredChallenges.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No challenges found"
                description="Try adjusting your filters or search terms."
              />
            </div>
          ) : (
            filteredChallenges.map((challenge) => (
              <label key={challenge.id} className="flex items-center gap-3 px-3.5 py-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(challenge.id)}
                  onChange={() => onToggleSelect(challenge.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{challenge.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {challenge.category || 'Uncategorized'} {'\u2022'} {challenge.difficulty || 'Unknown'} {'\u2022'} {challenge.event_id ? 'Event' : 'Main'}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-500/80">Selected: {selectedIds.length}</div>
      </div>
    </AdminDataSurface>
  )
}

export default BulkAssignChallengesCard
