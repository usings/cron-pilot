import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Button } from '#dashboard/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#dashboard/components/ui/empty'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
    </>
  ),
  notFoundComponent: () => (
    <Empty className="mx-auto min-h-dvh">
      <EmptyHeader>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>The page you are looking for does not exist.</EmptyDescription>
      </EmptyHeader>
      <Button nativeButton>
        <Link to="/" viewTransition>
          Back to home
        </Link>
      </Button>
    </Empty>
  ),
})
