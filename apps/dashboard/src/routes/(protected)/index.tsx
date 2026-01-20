import type { Treaty } from '@elysiajs/eden'
import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ListFilterIcon, PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TaskCard } from '#dashboard/components/task-card'
import { TaskEditor } from '#dashboard/components/task-editor'
import { Button } from '#dashboard/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#dashboard/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#dashboard/components/ui/empty'
import { Spinner } from '#dashboard/components/ui/spinner'
import { api, unwrap } from '#dashboard/libs/api'

export const Route = createFileRoute('/(protected)/')({ component: RouteComponent })

type Task = Treaty.Data<typeof api.tasks.get>['data'][number]

function RouteComponent() {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['tasks'],
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      api.tasks
        .get({
          query: {
            limit: 10,
            cursor: pageParam ?? undefined,
          },
        })
        .then(unwrap),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.meta?.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
  })

  const tasks = useMemo(() => data?.pages.flatMap((p) => p?.data ?? []) ?? [], [data])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        id: 'enabled',
        accessorKey: 'enabled',
        filterFn: (row, id, value) => row.getValue<boolean>(id) === value,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: tasks,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const visibleTasks = table.getRowModel().rows.map((row) => row.original)

  const sentinelRef = useRef<HTMLHRElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (!e?.isIntersecting) return
        if (!hasNextPage || isFetchingNextPage) return
        fetchNextPage()
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0,
      },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const statusValue = useMemo(() => {
    const statusFilter = columnFilters.find((filter) => filter.id === 'enabled')
    if (statusFilter?.value === true) return 'enabled'
    if (statusFilter?.value === false) return 'disabled'
    return 'all'
  }, [columnFilters])

  const handleStatusChange = (value: string) => {
    setColumnFilters((prev) => {
      const next = prev.filter((filter) => filter.id !== 'enabled')
      if (value === 'enabled') {
        next.push({ id: 'enabled', value: true })
      } else if (value === 'disabled') {
        next.push({ id: 'enabled', value: false })
      }
      return next
    })
  }

  const isEmpty = !isLoading && !isError && tasks.length === 0
  const isFilteredEmpty = !isLoading && !isError && tasks.length > 0 && visibleTasks.length === 0
  const hasVisibleTasks = !isLoading && !isError && visibleTasks.length > 0
  const showActions = !isLoading && !isError && tasks.length > 0

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <h3 className="text-muted-foreground text-sm tracking-widest leading-8">Tasks</h3>
        {showActions && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="gap-2">
                    <ListFilterIcon className="size-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={statusValue} onValueChange={handleStatusChange}>
                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="enabled">Enabled</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="disabled">Disabled</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <TaskEditor
              mode="create"
              trigger={
                <Button className="gap-2">
                  <PlusIcon className="size-4" />
                  New Task
                </Button>
              }
            />
          </div>
        )}
      </section>

      {(isLoading || isError || isEmpty) && (
        <Empty>
          <EmptyHeader>
            {isLoading && (
              <EmptyMedia className="text-muted-foreground">
                <Spinner className="size-8" />
              </EmptyMedia>
            )}
            {isError && (
              <>
                <EmptyTitle>Unable to load tasks</EmptyTitle>
                <EmptyDescription className="text-destructive">Failed to load tasks.</EmptyDescription>
              </>
            )}
            {isEmpty && (
              <>
                <EmptyTitle>No tasks yet</EmptyTitle>
                <EmptyDescription>Get started by creating your first job.</EmptyDescription>
                <TaskEditor mode="create" trigger={<Button>Create Task</Button>} />
              </>
            )}
          </EmptyHeader>
        </Empty>
      )}

      {isFilteredEmpty && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No matching tasks</EmptyTitle>
            <EmptyDescription>Try disabling filters or creating a new task.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {hasVisibleTasks && (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {visibleTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          <hr ref={sentinelRef} className="[all:unset]" />
          {isFetchingNextPage && <Spinner className="mx-auto" />}
        </>
      )}
    </>
  )
}
