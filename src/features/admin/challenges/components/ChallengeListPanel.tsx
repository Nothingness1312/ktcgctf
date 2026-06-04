import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui'
import { AdminDataSurface, AdminEmptyState, AdminListSurface, AdminStickyToolbar } from '@/features/admin/ui'
import AdminChallengesToolbar from './AdminChallengesToolbar'
import ChallengeListItem from './ChallengeListItem'
import type { AdminChallengeEventId, AdminChallengeFilterState, Challenge, Event } from '../types'

interface ChallengeListPanelProps {
  challenges: Challenge[]
  filteredChallenges: Challenge[]
  events: Event[]
  filters: AdminChallengeFilterState
  selectedEventId: AdminChallengeEventId
  isRefreshing: boolean
  isGlobalAdmin: boolean
  onFiltersChange: React.Dispatch<React.SetStateAction<AdminChallengeFilterState>>
  onEventChange: (eventId: AdminChallengeEventId) => void
  onAdd: () => void
  onEdit: (challenge: Challenge) => void
  onDelete: (id: string) => void
  onViewFlag: (id: string) => void
  onToggleActive: (id: string, checked: boolean) => Promise<unknown>
  onToggleMaintenance: (id: string, checked: boolean) => Promise<unknown>
}

const ChallengeListPanel: React.FC<ChallengeListPanelProps> = ({
  challenges,
  filteredChallenges,
  events,
  filters,
  selectedEventId,
  isRefreshing,
  isGlobalAdmin,
  onFiltersChange,
  onEventChange,
  onAdd,
  onEdit,
  onDelete,
  onViewFlag,
  onToggleActive,
  onToggleMaintenance,
}) => {
  const headerActions = (
    <Button onClick={onAdd} size="sm" className="rounded-xl">+ Add Challenge</Button>
  )

  const syncStatus = isRefreshing ? (
    <p className="inline-flex items-center gap-1.5 text-xs text-orange-500">
      <Loader2 className="h-3 w-3 animate-spin" />
      Synchronizing...
    </p>
  ) : null

  return (
    <motion.div className="order-1 xl:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="w-full">
        <AdminDataSurface
          toolbar={(
            <AdminStickyToolbar
              filters={(
                <AdminChallengesToolbar
            filters={filters}
            onFiltersChange={onFiltersChange}
            categories={Array.from(new Set(challenges.map(c => c.category))).filter(Boolean).sort()}
            difficulties={Array.from(new Set(challenges.map(c => c.difficulty))).filter(Boolean).sort()}
            actions={headerActions}
            status={syncStatus}
            onClear={() => onFiltersChange({
              category: "all",
              difficulty: "all",
              search: "",
              scope: "all",
              visibility: "all",
              service: "all",
              sortBy: "points_desc",
            })}
                />
              )}
            />
          )}
          empty={filteredChallenges.length === 0 ? (
            <AdminEmptyState
              title="No challenges found"
              description="Try adjusting your filters or add a new challenge."
            />
          ) : null}
        >
            <AdminListSurface>
              {filteredChallenges.map(challenge => (
                <ChallengeListItem
                  key={challenge.id}
                  challenge={challenge}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewFlag={onViewFlag}
                  onToggleMaintenance={onToggleMaintenance}
                  onToggleActive={onToggleActive}
                />
              ))}
            </AdminListSurface>
        </AdminDataSurface>
      </div>
    </motion.div>
  )
}

export default ChallengeListPanel
