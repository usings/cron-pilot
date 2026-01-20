import type { Treaty } from '@elysiajs/eden'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ActivityIcon, ClockIcon, TerminalIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '#dashboard/components/ui/badge'
import { Button } from '#dashboard/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#dashboard/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#dashboard/components/ui/empty'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '#dashboard/components/ui/pagination'
import { Spinner } from '#dashboard/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#dashboard/components/ui/table'
import { api, unwrap } from '#dashboard/libs/api'
import { formatDateTime } from '#dashboard/libs/format'

export const Route = createFileRoute('/(protected)/tasks/$taskId')({
  component: RouteComponent,
  notFoundComponent: () => (
    <Empty className="mx-auto">
      <EmptyHeader>
        <EmptyTitle>Task not found</EmptyTitle>
        <EmptyDescription>The task you are looking for does not exist or has been removed.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton>
          <Link to="/" viewTransition>
            Back to home
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  ),
})

type TaskIdClient = ReturnType<typeof api.tasks>
type TaskExecution = Treaty.Data<TaskIdClient['executions']['get']>['data'][number]

const EXECUTIONS_PAGE_SIZE = 10

function RouteComponent() {
  const { taskId } = Route.useParams()
  const id = Number(taskId)
  const validId = Number.isFinite(id)

  if (!validId) {
    throw notFound({
      routeId: '/(protected)/tasks/$taskId',
    })
  }

  const taskQuery = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.tasks({ id }).get().then(unwrap),
    enabled: validId,
  })

  const metricsQuery = useQuery({
    queryKey: ['task', id, 'metrics'],
    queryFn: () => api.tasks({ id }).metrics.get().then(unwrap),
    enabled: validId,
  })

  const [executionsPage, setExecutionsPage] = useState(1)

  useEffect(() => {
    if (!Number.isFinite(Number(taskId))) return
    setExecutionsPage(1)
  }, [taskId])

  const executionsQuery = useQuery({
    queryKey: ['task', id, 'executions', executionsPage],
    queryFn: async () =>
      api
        .tasks({ id })
        .executions.get({ query: { limit: EXECUTIONS_PAGE_SIZE, page: executionsPage } })
        .then(unwrap),
    enabled: validId && taskQuery.isSuccess && metricsQuery.isSuccess,
  })

  const columns = useMemo<ColumnDef<TaskExecution>[]>(
    () => [
      {
        header: 'ID',
        accessorKey: 'id',
        cell: ({ getValue }) => <span className="text-xs">#{getValue<string>()}</span>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => {
          const status = getValue<TaskExecution['status']>()
          return <Badge variant={status === 'failed' ? 'destructive' : 'secondary'}>{status}</Badge>
        },
      },
      {
        header: 'Started',
        accessorKey: 'startedAt',
        cell: ({ getValue }) => <span>{formatDateTime(getValue<string | null>())}</span>,
      },
      {
        header: 'Finished',
        accessorKey: 'finishedAt',
        cell: ({ getValue }) => <span>{formatDateTime(getValue<string | null>())}</span>,
      },
      {
        header: 'Duration',
        accessorKey: 'durationMs',
        cell: ({ getValue }) => {
          const duration = getValue<number | null>()
          return <span>{duration === null || duration === undefined ? '-' : `${duration} ms`}</span>
        },
      },
      {
        header: 'Exit',
        accessorKey: 'exitCode',
        cell: ({ getValue }) => <span>{getValue<number | null>() ?? '-'}</span>,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: executionsQuery.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const task = taskQuery.data?.data

  if (taskQuery.isError || metricsQuery.isError) {
    throw notFound({
      routeId: '/(protected)/tasks/$taskId',
    })
  } else if (taskQuery.isLoading || metricsQuery.isLoading) {
    return (
      <Empty className="mx-auto w-full max-w-4xl px-6 py-10">
        <EmptyHeader>
          <EmptyMedia className="text-muted-foreground">
            <Spinner className="size-8" />
          </EmptyMedia>
        </EmptyHeader>
      </Empty>
    )
  } else if (task) {
    const metrics = metricsQuery.data?.data
    const executions = executionsQuery.data?.data ?? []

    const hasExecutions = executions.length > 0
    const executionsMeta = executionsQuery.data?.meta
    const totalExecutions = executionsMeta?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(totalExecutions / EXECUTIONS_PAGE_SIZE))
    const canGoPrevious = executionsPage > 1
    const canGoNext = executionsPage < totalPages

    return (
      <>
        <Card style={{ viewTransitionName: `task-${task.id}` }}>
          <CardHeader className="gap-3">
            <CardTitle className="text-xl">{task.name}</CardTitle>
            <CardDescription>{task.description || task.command}</CardDescription>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="gap-1">
                <ClockIcon className="size-3.5" />
                {task.cron}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <TerminalIcon className="size-3.5" />
                {task.command}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{formatDateTime(task.createdAt)}</p>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">Updated</p>
              <p className="font-medium">{formatDateTime(task.updatedAt)}</p>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">Last run</p>
              <p className="font-medium">{formatDateTime(metrics?.lastRunAt)}</p>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">Next run</p>
              <p className="font-medium">{formatDateTime(metrics?.nextRunAt)}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center">
            <div className="flex items-center gap-2 text-xs">
              <ActivityIcon className="size-4 text-muted-foreground" />
              <span>
                Runs {metrics?.totalRuns ?? 0} / Failures {metrics?.failedRuns ?? 0}
              </span>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Environment variables</CardTitle>
            <CardDescription>The task runs with the following environment variables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {task.envs && Object.keys(task.envs).length > 0 ? (
              Object.entries(task.envs).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No environment variables.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Executions</CardTitle>
            <CardDescription>Recent task executions.</CardDescription>
          </CardHeader>
          <CardContent>
            {executionsQuery.isLoading ? (
              <CardDescription>
                <Spinner />
              </CardDescription>
            ) : executionsQuery.isError ? (
              <CardDescription>Failed to load executions.</CardDescription>
            ) : !hasExecutions ? (
              <CardDescription>No executions yet.</CardDescription>
            ) : (
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          {totalExecutions > EXECUTIONS_PAGE_SIZE ? (
            <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {executionsPage} of {totalPages}
              </span>
              <Pagination className="w-fit m-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={!canGoPrevious}
                      className={!canGoPrevious ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(event) => {
                        if (!canGoPrevious) {
                          event.preventDefault()
                          return
                        }
                        event.preventDefault()
                        setExecutionsPage((prev) => Math.max(1, prev - 1))
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={!canGoNext}
                      className={!canGoNext ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(event) => {
                        if (!canGoNext) {
                          event.preventDefault()
                          return
                        }
                        event.preventDefault()
                        setExecutionsPage((prev) => Math.min(totalPages, prev + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardFooter>
          ) : null}
        </Card>
      </>
    )
  }
}
