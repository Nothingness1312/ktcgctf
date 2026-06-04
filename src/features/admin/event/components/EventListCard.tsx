import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/shared/ui'
import { ADMIN_ROW_CLASS, AdminDataSurface, AdminEmptyState, AdminListSurface } from '@/features/admin/ui'
import type { Event } from '../types'

interface EventListCardProps {
  events: Event[]
  onEdit: (evt: Event) => void
  onDelete: (evt: Event) => void
}

const EventListCard: React.FC<EventListCardProps> = ({ events, onEdit, onDelete }) => {
  return (
    <AdminDataSurface
      empty={events.length === 0 ? (
        <AdminEmptyState
          title="No events yet"
          description="Create your first event to get started."
        />
      ) : null}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <AdminListSurface>
          {events.map((evt) => (
            <div
              key={evt.id}
              className={`${ADMIN_ROW_CLASS} flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-gray-900 dark:text-white">
                  {evt.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {evt.description || 'No description'}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-500">
                  <span>Start: {evt.start_time ? new Date(evt.start_time).toLocaleString() : '-'}</span>
                  <span className="text-gray-300 dark:text-gray-700">|</span>
                  <span>End: {evt.end_time ? new Date(evt.end_time).toLocaleString() : '-'}</span>
                  {evt.always_show_challenges && (
                    <>
                      <span className="text-gray-300 dark:text-gray-700">|</span>
                      <span className="font-bold text-blue-500/80 dark:text-blue-400/80">
                        Always show challenges
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(evt)} className="rounded-xl">
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(evt)} className="rounded-xl">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </AdminListSurface>
      </motion.div>
    </AdminDataSurface>
  )
}

export default EventListCard
