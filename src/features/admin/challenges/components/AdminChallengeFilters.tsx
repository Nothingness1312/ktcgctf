import React from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/shared/ui'
import { AdminFilterInput, AdminFilterSelect, AdminFilterToolbar } from '@/features/admin/ui'
import type { AdminChallengeFilterState } from '../types'

interface AdminChallengeFiltersProps {
  filters: AdminChallengeFilterState
  onFiltersChange: React.Dispatch<React.SetStateAction<AdminChallengeFilterState>>
  categories: string[]
  difficulties: string[]
  onClear: () => void
}

export default function AdminChallengeFilters({
  filters,
  onFiltersChange,
  categories,
  difficulties,
  onClear,
}: AdminChallengeFiltersProps) {
  const isDirty =
    filters.search ||
    filters.scope !== 'all' ||
    filters.category !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.visibility !== 'all' ||
    filters.service !== 'all' ||
    filters.sortBy !== 'points_desc'

  return (
    <AdminFilterToolbar
      actions={isDirty ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-9 shrink-0 rounded-xl px-3 text-xs font-semibold text-gray-500 hover:text-red-600"
        >
          Clear
        </Button>
      ) : null}
    >
      <AdminFilterInput
        type="text"
        value={filters.search}
        onChange={(e) => onFiltersChange((prev) => ({ ...prev, search: e.target.value }))}
        placeholder="Search challenge by name or description..."
      />

      <AdminFilterSelect
        value={filters.category}
        onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, category: val }))}
        placeholder="Category"
        options={[
          { value: 'all', label: 'All Categories' },
          ...categories.map((cat) => ({ value: cat, label: cat })),
        ]}
      />

      <AdminFilterSelect
        value={filters.difficulty}
        onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, difficulty: val }))}
        placeholder="Difficulty"
        options={[
          { value: 'all', label: 'All Difficulties' },
          ...difficulties.map((diff) => ({ value: diff, label: diff, className: 'capitalize' })),
        ]}
      />

      <AdminFilterSelect
        value={filters.visibility}
        onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, visibility: val as AdminChallengeFilterState['visibility'] }))}
        placeholder="Visibility"
        options={[
          { value: 'all', label: 'All Visibility' },
          { value: 'active', label: 'Active / Visible' },
          { value: 'inactive', label: 'Inactive / Hidden' },
          { value: 'maintenance', label: 'Maintenance' },
        ]}
      />

      <AdminFilterSelect
        value={filters.service}
        onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, service: val as AdminChallengeFilterState['service'] }))}
        placeholder="Services"
        options={[
          { value: 'all', label: 'All Services' },
          { value: 'services', label: 'Services' },
          { value: 'placeholder', label: 'Placeholder' },
          { value: 'tasks', label: 'Tasks' },
        ]}
      />

      <AdminFilterSelect
        value={filters.sortBy || 'points_desc'}
        onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, sortBy: val }))}
        placeholder="Sort by"
        triggerClassName="sm:w-[150px]"
        icon={<ArrowUpDown className="mr-1 h-3 w-3 shrink-0" />}
        options={[
          { value: 'points_desc', label: 'Points desc' },
          { value: 'points_asc', label: 'Points asc' },
          { value: 'difficulty_asc', label: 'Difficulty asc' },
          { value: 'difficulty_desc', label: 'Difficulty desc' },
          { value: 'title_asc', label: 'Name A-Z' },
          { value: 'title_desc', label: 'Name Z-A' },
        ]}
      />
    </AdminFilterToolbar>
  )
}
