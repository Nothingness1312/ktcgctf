'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import PageBackground from '@/shared/components/PageBackground'
import { THEME_PRIMARY_SELECTION_CLASS } from '@/shared/styles'
import AdminContent from './AdminContent'
import AdminHeader from './AdminHeader'
import AdminSidebar from './AdminSidebar'
import { useAuth } from '@/shared/contexts/AuthContext'
import Loader from '@/shared/components/Loader'
import { AuthService } from '@/features/auth'
import { getVisibleAdminNavItems, isAdminNavItemActive, type AdminNavScope } from './admin-navigation'

type AdminRouteShellProps = {
  children: ReactNode
}

export default function AdminRouteShell({ children }: AdminRouteShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [adminScope, setAdminScope] = useState<AdminNavScope | null>(null)
  const [scopeLoading, setScopeLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadScope = async () => {
      if (authLoading) return
      if (!user) {
        setAdminScope(null)
        setScopeLoading(false)
        return
      }

      setScopeLoading(true)
      const scope = await AuthService.getAdminScope()
      if (!active) return
      setAdminScope(scope)
      setScopeLoading(false)
    }

    void loadScope()

    return () => {
      active = false
    }
  }, [authLoading, user])

  const navItems = useMemo(() => getVisibleAdminNavItems(adminScope), [adminScope])

  useEffect(() => {
    if (authLoading || scopeLoading || !adminScope || adminScope.is_global_admin || adminScope.event_ids.length === 0) {
      return
    }

    const canViewCurrentPath = navItems.some((item) => isAdminNavItemActive(pathname, item))
    if (!canViewCurrentPath) {
      router.replace('/admin/challenges')
    }
  }, [adminScope, authLoading, navItems, pathname, router, scopeLoading])

  if (authLoading || scopeLoading) {
    return (
      <PageBackground
        selectionClassName={THEME_PRIMARY_SELECTION_CLASS}
        contentClassName="relative z-10 min-h-[calc(100lvh-3.5rem)] w-full flex items-center justify-center"
      >
        <Loader size={40} />
      </PageBackground>
    )
  }

  return (
    <PageBackground
      selectionClassName={THEME_PRIMARY_SELECTION_CLASS}
      contentClassName="relative z-10 min-h-[calc(100lvh-3.5rem)] w-full"
    >
      <AdminSidebar pathname={pathname} items={navItems} />

      <div className="min-w-0 lg:pl-60">
        <div className="flex min-h-[calc(100lvh-3.5rem)] min-w-0 flex-col">
          <AdminHeader pathname={pathname} items={navItems} />
          <AdminContent>{children}</AdminContent>
        </div>
      </div>
    </PageBackground>
  )
}
