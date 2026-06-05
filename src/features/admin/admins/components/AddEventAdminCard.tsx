import React from 'react'
import {
  Button,
  Label,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { AdminDataSurface } from '@/features/admin/ui'
import {
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_CLASS,
  ADMIN_FORM_HELPER_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_SELECT_CONTENT_CLASS,
  ADMIN_SELECT_TRIGGER_CLASS,
} from '@/features/admin/ui/form-field-styles'
import type { Event, UserLite } from '../types'

interface AddEventAdminCardProps {
  events: Event[]
  usernameQuery: string
  userResults: UserLite[]
  selectedUser: UserLite | null
  selectedEventId: string
  selectedEventName: string | null
  submitting: boolean
  canSubmit: boolean
  onUsernameChange: (value: string) => void
  onUserSelect: (user: UserLite) => void
  onEventChange: (eventId: string) => void
  onSubmit: () => void
  onReset: () => void
}

const AddEventAdminCard: React.FC<AddEventAdminCardProps> = ({
  events,
  usernameQuery,
  userResults,
  selectedUser,
  selectedEventId,
  selectedEventName,
  submitting,
  canSubmit,
  onUsernameChange,
  onUserSelect,
  onEventChange,
  onSubmit,
  onReset,
}) => {
  return (
    <AdminDataSurface className="p-6" contentClassName="space-y-4">
      <div className="border-b border-gray-150 dark:border-gray-800/60 pb-4 mb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Event Admin</h2>
      </div>

      <div className={ADMIN_FORM_GRID_CLASS}>
        <div className={ADMIN_FORM_FIELD_CLASS}>
          <Label>Search Username</Label>
          <div className="relative">
            <SearchInput
              value={usernameQuery}
              onChange={onUsernameChange}
              placeholder="Type username..."
              containerClassName="max-w-none"
              inputClassName={ADMIN_INPUT_CLASS}
            />

            {userResults.length > 0 && !selectedUser && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden">
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onUserSelect(u)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{u.username}</span>
                      {u.is_admin ? <span className="text-xs text-muted-foreground">global admin</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={ADMIN_FORM_HELPER_CLASS}>Choose a user, then select an event.</div>
        </div>

        <div className={ADMIN_FORM_FIELD_CLASS}>
          <Label>Event</Label>
          <Select value={selectedEventId} onValueChange={onEventChange}>
            <SelectTrigger className={ADMIN_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Pick an event" />
            </SelectTrigger>
            <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedEventName ? (
            <div className={ADMIN_FORM_HELPER_CLASS}>
              Selected: <span className="font-medium">{selectedEventName}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={onSubmit} disabled={!canSubmit} className="rounded-xl">
          {submitting ? 'Adding...' : 'Add'}
        </Button>
        <Button variant="ghost" onClick={onReset} disabled={submitting} className="rounded-xl">
          Reset
        </Button>
      </div>
    </AdminDataSurface>
  )
}

export default AddEventAdminCard
