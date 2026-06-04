import { RefreshCcw } from 'lucide-react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { AdminFilterBar } from '@/features/admin/ui'
import type { AdminServicesFilters } from '../types'

type AdminServicesToolbarProps = {
  filters: AdminServicesFilters
  keyOptions: string[]
  isRefreshing: boolean
  statusLoading: boolean
  onFiltersChange: (filters: AdminServicesFilters) => void
  onRefresh: () => void
}

export default function AdminServicesToolbar({
  filters,
  keyOptions,
  isRefreshing,
  statusLoading,
  onFiltersChange,
  onRefresh,
}: AdminServicesToolbarProps) {
  const updateFilter = <K extends keyof AdminServicesFilters>(
    key: K,
    value: AdminServicesFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <AdminFilterBar className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/50 dark:border-gray-800/60">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select value={filters.validity} onValueChange={(value) => updateFilter('validity', value as AdminServicesFilters['validity'])}>
          <SelectTrigger className="min-w-[170px] rounded-xl">
            <SelectValue placeholder="Validity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            <SelectItem value="valid">Valid services</SelectItem>
            <SelectItem value="invalid">Invalid services</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.key} onValueChange={(value) => updateFilter('key', value)}>
          <SelectTrigger className="min-w-[190px] rounded-xl">
            <SelectValue placeholder="Key" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All keys</SelectItem>
            <SelectItem value="no_key">No key</SelectItem>
            {keyOptions.map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onRefresh}
        disabled={isRefreshing || statusLoading}
        className="rounded-xl"
      >
        <RefreshCcw className={(isRefreshing || statusLoading) ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        Refresh
      </Button>
    </AdminFilterBar>
  )
}
