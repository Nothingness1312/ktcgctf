import React from 'react'
import { ArrowUpDown, Search } from 'lucide-react'
import {
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
} from '@/shared/ui'
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full pt-0.5">
      {/* Search Input on the Left */}
      <div className="flex items-center gap-2 w-full max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search challenge by name or description..."
            className="pl-9 h-9 w-full rounded-xl bg-transparent"
          />
        </div>
        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs h-9 font-semibold text-gray-500 hover:text-red-600 rounded-xl px-3 shrink-0"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Select Dropdowns on the Right */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end text-xs">
        {/* Category Filter */}
        <Select
          value={filters.category}
          onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, category: val }))}
        >
          <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl bg-white/30 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 font-semibold text-gray-700 dark:text-gray-200 hover:border-blue-500/40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-[#111622]/95 border border-gray-200/80 dark:border-gray-800/90 rounded-xl shadow-lg backdrop-blur-xl max-h-[300px] overflow-y-auto">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Difficulty Filter */}
        <Select
          value={filters.difficulty}
          onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, difficulty: val }))}
        >
          <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl bg-white/30 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 font-semibold text-gray-700 dark:text-gray-200 hover:border-blue-500/40">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-[#111622]/95 border border-gray-200/80 dark:border-gray-800/90 rounded-xl shadow-lg backdrop-blur-xl">
            <SelectItem value="all">All Difficulties</SelectItem>
            {difficulties.map((diff) => (
              <SelectItem key={diff} value={diff} className="capitalize">{diff}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Visibility Filter */}
        <Select
          value={filters.visibility}
          onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, visibility: val as any }))}
        >
          <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl bg-white/30 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 font-semibold text-gray-700 dark:text-gray-200 hover:border-blue-500/40">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-[#111622]/95 border border-gray-200/80 dark:border-gray-800/90 rounded-xl shadow-lg backdrop-blur-xl">
            <SelectItem value="all">All Visibility</SelectItem>
            <SelectItem value="active">Active / Visible</SelectItem>
            <SelectItem value="inactive">Inactive / Hidden</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        {/* Service Filter */}
        <Select
          value={filters.service}
          onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, service: val as any }))}
        >
          <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl bg-white/30 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 font-semibold text-gray-700 dark:text-gray-200 hover:border-blue-500/40">
            <SelectValue placeholder="Services" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-[#111622]/95 border border-gray-200/80 dark:border-gray-800/90 rounded-xl shadow-lg backdrop-blur-xl">
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="services">Services</SelectItem>
            <SelectItem value="placeholder">Placeholder</SelectItem>
            <SelectItem value="tasks">Tasks</SelectItem>
          </SelectContent>
        </Select>
        {/* Sort By */}
        <Select
          value={filters.sortBy || 'points_desc'}
          onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, sortBy: val }))}
        >
          <SelectTrigger className="w-[150px] h-9 text-xs rounded-xl bg-white/30 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 font-semibold text-gray-700 dark:text-gray-200 hover:border-blue-500/40">
            <ArrowUpDown className="h-3 w-3 mr-1 shrink-0" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-[#111622]/95 border border-gray-200/80 dark:border-gray-800/90 rounded-xl shadow-lg backdrop-blur-xl">
            <SelectItem value="points_desc">Points ↓</SelectItem>
            <SelectItem value="points_asc">Points ↑</SelectItem>
            <SelectItem value="difficulty_asc">Difficulty ↑</SelectItem>
            <SelectItem value="difficulty_desc">Difficulty ↓</SelectItem>
            <SelectItem value="title_asc">Name A-Z</SelectItem>
            <SelectItem value="title_desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
