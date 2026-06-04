import React from 'react'
import { ShieldAlert } from 'lucide-react'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
import { ADMIN_ROW_CLASS, AdminDataSurface, AdminEmptyState, AdminTableSurface } from '@/features/admin/ui'
import type { EventAdminRow } from '../types'

interface EventAdminsCardProps {
  admins: EventAdminRow[]
  onAskRemove: (admin: EventAdminRow) => void
}

const EventAdminsCard: React.FC<EventAdminsCardProps> = ({ admins, onAskRemove }) => {
  return (
    <AdminDataSurface
      toolbar={(
        <div className="flex items-center gap-2 border-b border-gray-150 px-5 py-4 dark:border-gray-800/60">
        <ShieldAlert size={16} className="text-blue-500" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Event Admins</h2>
      </div>
      )}
      empty={admins.length === 0 ? (
        <AdminEmptyState
          title="No event admins assigned yet"
          description="Event-scoped admins will appear here."
        />
      ) : null}
    >
        <AdminTableSurface>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200/80 hover:bg-transparent dark:border-gray-800">
                <TableHead className="px-5">Username</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="w-[120px] text-right px-5">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={`${admin.user_id}:${admin.event_id}`} className={ADMIN_ROW_CLASS}>
                  <TableCell className="font-medium px-5 py-3">{admin.username}</TableCell>
                  <TableCell className="py-3">{admin.event_name}</TableCell>
                  <TableCell className="text-right px-5 py-3">
                    <Button variant="outline" size="sm" onClick={() => onAskRemove(admin)} className="rounded-xl">
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableSurface>
    </AdminDataSurface>
  )
}

export default EventAdminsCard
