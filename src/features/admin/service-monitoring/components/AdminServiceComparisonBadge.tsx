import { Badge } from '@/shared/ui'
import { getComparisonLabel } from '../lib/admin-services-utils'
import type { AdminServiceComparisonStatus } from '../types'

const COMPARISON_CLASS: Record<AdminServiceComparisonStatus, string> = {
  valid: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  invalid: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
  key_missing: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  configured_not_running: 'border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  missing_from_platform: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
  running_unregistered: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
  disabled_running: 'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  unknown: 'border-gray-300/80 bg-gray-100/60 text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300',
}

type AdminServiceComparisonBadgeProps = {
  status: AdminServiceComparisonStatus
}

export default function AdminServiceComparisonBadge({ status }: AdminServiceComparisonBadgeProps) {
  return (
    <Badge variant="outline" className={COMPARISON_CLASS[status]}>
      {getComparisonLabel(status)}
    </Badge>
  )
}
