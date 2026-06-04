import React, { type ReactNode } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import EmptyState from '@/shared/components/EmptyState'
import { SegmentedTabs } from '@/shared/components'
import {
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'

export const ADMIN_STICKY_TOOLBAR_CLASS =
  'sticky top-14 z-30 -mx-4 border-b border-gray-200/60 bg-white/95 px-4 py-2.5 backdrop-blur-md dark:border-gray-800/60 dark:bg-[#0b0f19]/95 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'

export const ADMIN_CONTROL_CLASS =
  'h-9 rounded-xl text-xs font-semibold'

export const ADMIN_ROW_CLASS =
  'border-b border-gray-100/80 transition-colors duration-150 ease-in-out last:border-b-0 hover:bg-blue-50/40 dark:border-gray-800/70 dark:hover:bg-blue-900/10'

interface AdminPageSurfaceProps {
  children: ReactNode
  className?: string
}

export function AdminPageSurface({ children, className }: AdminPageSurfaceProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  )
}

interface AdminStickyToolbarProps {
  tabs?: ReactNode
  filters?: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
}

export function AdminStickyToolbar({
  tabs,
  filters,
  actions,
  className,
  contentClassName,
}: AdminStickyToolbarProps) {
  return (
    <div className={cn(ADMIN_STICKY_TOOLBAR_CLASS, className)}>
      <div className={cn('flex flex-col gap-2.5', contentClassName)}>
        {(tabs || actions) && (
          <div className={cn(
            'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
            filters && 'border-b border-gray-100/60 pb-2 dark:border-gray-800/40'
          )}>
            {tabs && <div className="min-w-0">{tabs}</div>}
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        )}
        {filters}
      </div>
    </div>
  )
}

type AdminTabItem<T extends string> = {
  value: T
  label: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}

interface AdminTabsProps<T extends string> {
  items: AdminTabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  stretch?: boolean
}

export function AdminTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  stretch,
}: AdminTabsProps<T>) {
  return (
    <SegmentedTabs
      items={items}
      value={value}
      onChange={onChange}
      variant="panel"
      className={className}
      stretch={stretch}
    />
  )
}

interface AdminListSurfaceProps {
  children: ReactNode
  className?: string
}

export function AdminListSurface({ children, className }: AdminListSurfaceProps) {
  return (
    <div className={cn("divide-y divide-gray-150 dark:divide-gray-850", className)}>
      {children}
    </div>
  )
}

interface AdminTableSurfaceProps {
  children: ReactNode
  className?: string
}

export function AdminTableSurface({ children, className }: AdminTableSurfaceProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      {children}
    </div>
  )
}

interface AdminDataSurfaceProps {
  children: ReactNode
  toolbar?: ReactNode
  empty?: ReactNode
  className?: string
  contentClassName?: string
}

export function AdminDataSurface({
  children,
  toolbar,
  empty,
  className,
  contentClassName,
}: AdminDataSurfaceProps) {
  return (
    <AdminPageSurface className={className}>
      {toolbar}
      {empty ? (
        <div className="p-5 sm:p-6">{empty}</div>
      ) : (
        <div className={contentClassName}>{children}</div>
      )}
    </AdminPageSurface>
  )
}

interface AdminSectionProps {
  title?: ReactNode
  description?: string
  children: ReactNode
  className?: string
}

export function AdminSection({ title, description, children, className }: AdminSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {description}
            </p>
          )}
        </div>
      )}
      <div>
        {children}
      </div>
    </div>
  )
}

interface AdminFilterToolbarProps {
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function AdminFilterToolbar({ children, actions, className }: AdminFilterToolbarProps) {
  return (
    <div className={cn('flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs">
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  )
}

interface AdminFilterInputProps extends React.ComponentProps<typeof Input> {
  icon?: ReactNode
  wrapperClassName?: string
}

export function AdminFilterInput({
  icon,
  wrapperClassName,
  className,
  ...props
}: AdminFilterInputProps) {
  const iconNode = icon === undefined
    ? <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    : icon

  return (
    <div className={cn('relative w-full max-w-md', wrapperClassName)}>
      {iconNode && (
        <div className="pointer-events-none absolute left-3 top-2.5">
          {iconNode}
        </div>
      )}
      <Input
        className={cn(ADMIN_CONTROL_CLASS, iconNode && 'pl-9', className)}
        {...props}
      />
    </div>
  )
}

type AdminFilterSelectOption = {
  value: string
  label: ReactNode
  className?: string
}

interface AdminFilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  options: AdminFilterSelectOption[]
  triggerClassName?: string
  contentClassName?: string
  className?: string
  icon?: ReactNode
}

export function AdminFilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
  triggerClassName,
  contentClassName,
  className,
  icon,
}: AdminFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn('w-full sm:w-[130px]', ADMIN_CONTROL_CLASS, triggerClassName, className)}>
        {icon}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className={option.className}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const ADMIN_STATUS_BADGE_CLASS = {
  neutral: 'border-gray-300/80 bg-gray-100/60 text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300',
  muted: 'border-gray-300/80 bg-gray-100/60 text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400',
  info: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  danger: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
} as const

export type AdminStatusBadgeTone = keyof typeof ADMIN_STATUS_BADGE_CLASS

interface AdminStatusBadgeProps extends React.ComponentProps<typeof Badge> {
  tone?: AdminStatusBadgeTone
}

export function AdminStatusBadge({
  tone = 'neutral',
  className,
  variant = 'outline',
  ...props
}: AdminStatusBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn(ADMIN_STATUS_BADGE_CLASS[tone], className)}
      {...props}
    />
  )
}

interface AdminErrorStateProps {
  title?: string
  description?: React.ReactNode
  action?: React.ReactNode
}

export function AdminErrorState({
  title = "Something went wrong",
  description = "There was an error loading the data. Please try again.",
  action,
}: AdminErrorStateProps) {
  return (
    <div className="py-10 border border-dashed border-red-200/40 dark:border-red-900/40 rounded-2xl bg-red-50/10 dark:bg-red-950/5 flex items-center justify-center">
      <EmptyState
        icon={<AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />}
        title={title}
        description={description}
        containerHeight="py-2"
        action={action}
      />
    </div>
  )
}
