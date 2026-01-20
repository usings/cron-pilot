import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Bolt, Bug, House, LogOut } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar, AvatarFallback } from '#dashboard/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#dashboard/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#dashboard/components/ui/dropdown-menu'
import { clearAuthToken } from '#dashboard/libs/auth'
import pkg from '../../../package.json'
import { requireAuth } from '../-guards'

export const Route = createFileRoute('/(protected)')({
  beforeLoad: requireAuth({ signinPath: '/signin' }),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { isRouting, pathname } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      isRouting: s.status === 'pending',
    }),
  })
  const { isHome, pageLabel } = useMemo(() => getBreadcrumbFromPath(pathname), [pathname])

  const handleSignOut = async () => {
    clearAuthToken()
    navigate({ to: '/signin' })
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8 min-h-dvh flex flex-col gap-4">
      <header className="border-b py-4 flex items-center justify-between gap-4">
        <h1 className="text-sm uppercase tracking-widest leading-8">Cron Pilot</h1>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarFallback>
                <Bolt className="size-4" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>v{pkg.version}</DropdownMenuLabel>
              <DropdownMenuItem>
                <Bug className="size-4" />
                <a
                  className="text-xs"
                  href="https://github.com/usings/cron-pilot/issues/new/choose"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Report
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {!isHome && !isRouting && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/" viewTransition />}>
                <House className="size-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pageLabel && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <Outlet />
    </main>
  )
}

export function getBreadcrumbFromPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const isHome = segments.length === 0

  let pageLabel = ''
  if (segments[0] === 'tasks') {
    pageLabel = `task #${segments[1]}`
  } else {
    const last = segments.at(-1)
    if (last) {
      pageLabel = last.replace(/[-_]/g, ' ').replace(/^\w/, (char) => char.toUpperCase())
    }
  }

  return { isHome, pageLabel }
}
