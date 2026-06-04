import { RefreshCcw, Power, PowerOff, Loader2 } from 'lucide-react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import type { AdminServicesFilters, AdminServiceTab } from '../types'

type AdminServicesToolbarProps = {
  filters: AdminServicesFilters
  keyOptions: string[]
  isRefreshing: boolean
  statusLoading: boolean
  onFiltersChange: (filters: AdminServicesFilters) => void
  onRefresh: () => void
  activeTab: AdminServiceTab
  isGlobalAdmin: boolean
  globalActionLoading: 'up' | 'down' | null
  onGlobalAction: (action: 'up' | 'down') => void
}

export default function AdminServicesToolbar({
  filters,
  keyOptions,
  isRefreshing,
  statusLoading,
  onFiltersChange,
  onRefresh,
  activeTab,
  isGlobalAdmin,
  globalActionLoading,
  onGlobalAction,
}: AdminServicesToolbarProps) {
  const updateFilter = <K extends keyof AdminServicesFilters>(
    key: K,
    value: AdminServicesFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleGlobalAction = (action: 'up' | 'down') => {
    const actionLabel = action === 'up' ? 'START ALL' : 'STOP ALL'
    const isConfirmed = window.confirm(`WARNING: Are you sure you want to ${actionLabel} NXCTL services?`)
    if (isConfirmed) {
      onGlobalAction(action)
    }
  }

  const showValidity = activeTab === 'platform'

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full pt-0.5">
      <div className={`flex flex-wrap items-center gap-2 text-xs`}>
        {showValidity && (
          <Select value={filters.validity} onValueChange={(value) => updateFilter('validity', value as AdminServicesFilters['validity'])}>
            <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl bg-white/30 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 font-semibold text-gray-700 dark:text-gray-200 hover:border-blue-500/40">
              <SelectValue placeholder="Validity" />
            </SelectTrigger>
            <SelectContent className="bg-white/95 dark:bg-[#111622]/95 border border-gray-200/80 dark:border-gray-800/90 rounded-xl shadow-lg backdrop-blur-xl">
              <SelectItem value="all">All services</SelectItem>
              <SelectItem value="valid">Valid services</SelectItem>
              <SelectItem value="invalid">Invalid services</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={filters.key} onValueChange={(value) => updateFilter('key', value)}>
          <SelectTrigger className="w-[190px] h-9 text-xs rounded-xl bg-white/30 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 font-semibold text-gray-700 dark:text-gray-200 hover:border-blue-500/40">
            <SelectValue placeholder="Key" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-[#111622]/95 border border-gray-200/80 dark:border-gray-800/90 rounded-xl shadow-lg backdrop-blur-xl max-h-[300px] overflow-y-auto">
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

      <div className="flex flex-wrap items-center gap-2 sm:justify-end text-xs">
        {activeTab === 'live' && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl h-9 font-semibold text-gray-700 dark:text-gray-200 border-gray-200/50 dark:border-gray-800/50 hover:border-blue-500/40"
              onClick={() => handleGlobalAction('up')}
              disabled={!isGlobalAdmin || globalActionLoading !== null}
              title={isGlobalAdmin ? 'Start all NXCTL services' : 'Only global admins can start all services'}
            >
              {globalActionLoading === 'up' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
              Up all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl h-9 hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-300 font-semibold text-gray-700 dark:text-gray-200 border-gray-200/50 dark:border-gray-800/50"
              onClick={() => handleGlobalAction('down')}
              disabled={!isGlobalAdmin || globalActionLoading !== null}
              title={isGlobalAdmin ? 'Stop all NXCTL services' : 'Only global admins can stop all services'}
            >
              {globalActionLoading === 'down' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
              Down all
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing || statusLoading}
          className="rounded-xl h-9 font-semibold text-gray-700 dark:text-gray-200 border-gray-200/50 dark:border-gray-800/50 hover:border-blue-500/40"
        >
          <RefreshCcw className={(isRefreshing || statusLoading) ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </div>
    </div>
  )
}
