import { Activity, AlertTriangle, Server, ShieldCheck } from 'lucide-react'
import { AdminStatCard } from '@/features/admin/ui'
import type { AdminServicesSummaryCounts } from '../types'

type AdminServicesSummaryProps = {
  summary: AdminServicesSummaryCounts
}

export default function AdminServicesSummary({ summary }: AdminServicesSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        label="Platform Services"
        value={summary.platformGroups}
        description={`${summary.platformEntries} service config entries`}
        icon={Server}
      />
      <AdminStatCard
        label="Valid"
        value={summary.valid}
        description="No issue detected"
        icon={ShieldCheck}
        iconClassName="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
      />
      <AdminStatCard
        label="Invalid"
        value={summary.invalid}
        description="Needs admin review"
        icon={AlertTriangle}
        iconClassName="bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300"
      />
      <AdminStatCard
        label="Actual Services"
        value={summary.liveServices}
        description="Runtime status rows"
        icon={Activity}
        iconClassName="bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
      />
    </div>
  )
}
