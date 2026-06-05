import React from 'react'
import { Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { CheckCircle2, Wrench } from 'lucide-react'
import { ChallengeFormData, Event } from '../../types'
import APP from '@/config'
import {
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_SELECT_CONTENT_CLASS,
  ADMIN_SELECT_TRIGGER_CLASS,
} from '@/features/admin/ui/form-field-styles'
import { ChallengeFormToggle } from './ChallengeFormToggle'

interface BasicDetailsSectionProps {
  formData: ChallengeFormData
  onChange: (data: ChallengeFormData) => void
  events?: Event[]
  categories: string[]
  hideMainEventOption?: boolean
}

export const BasicDetailsSection: React.FC<BasicDetailsSectionProps> = ({
  formData,
  onChange,
  events,
  categories,
  hideMainEventOption
}) => {
  return (
    <div className={ADMIN_FORM_GRID_CLASS}>
      {/* Top row: Switches */}
      <div className="md:col-span-2 flex flex-wrap items-center gap-4">
        <ChallengeFormToggle
          checked={formData.is_active !== false}
          label="Active"
          icon={CheckCircle2}
          activeClassName="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300"
          onChange={v => onChange({ ...formData, is_active: v })}
        />
        <ChallengeFormToggle
          checked={!!formData.is_maintenance}
          label="Maintenance"
          icon={Wrench}
          activeClassName="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300"
          onChange={v => onChange({ ...formData, is_maintenance: v })}
        />
      </div>

      {/* Row 1: Title & Category */}
      <div className={ADMIN_FORM_FIELD_CLASS}>
        <Label>Title</Label>
        <Input
          required
          value={formData.title}
          onChange={e => onChange({ ...formData, title: e.target.value })}
          className={ADMIN_INPUT_CLASS}
        />
      </div>
      <div className={ADMIN_FORM_FIELD_CLASS}>
        <Label>Category</Label>
        <Select value={formData.category} onValueChange={v => onChange({ ...formData, category: v })}>
          <SelectTrigger className={ADMIN_SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
          <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Event & Difficulty */}
      {events && (
        <div className={ADMIN_FORM_FIELD_CLASS}>
          <Label>Event</Label>
          <Select
            value={formData.event_id ?? '__main__'}
            onValueChange={v => onChange({ ...formData, event_id: v === '__main__' ? null : v })}
          >
            <SelectTrigger className={ADMIN_SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
            <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
              {!hideMainEventOption && (
                <SelectItem value="__main__">{String(APP.eventMainLabel || 'Main')}</SelectItem>
              )}
              {events.map((evt: Event) => (
                <SelectItem key={evt.id} value={evt.id}>{String(evt?.name ?? 'Untitled')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className={ADMIN_FORM_FIELD_CLASS}>
        <Label>Difficulty</Label>
        <Select value={formData.difficulty} onValueChange={v => onChange({ ...formData, difficulty: v })}>
          <SelectTrigger className={ADMIN_SELECT_TRIGGER_CLASS}><SelectValue /></SelectTrigger>
          <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
            {Object.keys(APP.difficultyStyles || {}).map(key => {
              const label = key.charAt(0).toUpperCase() + key.slice(1)
              return <SelectItem key={key} value={label}>{label}</SelectItem>
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
