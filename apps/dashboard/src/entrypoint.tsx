import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { Toaster } from '#dashboard/components/ui/sonner'
import { routeTree } from './routes/-tree'

const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultViewTransition: true,
})

const queryClient = new QueryClient()

export function Entrypoint() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Router',
            render: <TanStackRouterDevtoolsPanel router={router} />,
          },
          {
            name: 'Query',
            render: <ReactQueryDevtoolsPanel client={queryClient} />,
          },
        ]}
      />
    </>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
