import type { Treaty } from '@elysiajs/eden'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Anchor, EllipsisVerticalIcon, SquarePen, Trash } from 'lucide-react'
import { useMemo } from 'react'
import { TaskEditor } from '#dashboard/components/task-editor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  createAlertDiglogHandle,
} from '#dashboard/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '#dashboard/components/ui/avatar'
import { Badge } from '#dashboard/components/ui/badge'
import { Button } from '#dashboard/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#dashboard/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#dashboard/components/ui/dropdown-menu'
import { Spinner } from '#dashboard/components/ui/spinner'
import { api, unwrap } from '#dashboard/libs/api'
import { createSheetHandle } from './ui/sheet'

interface TaskCardProps {
  task: Treaty.Data<typeof api.tasks.get>['data'][number]
}

export function TaskCard({ task }: TaskCardProps) {
  const queryClient = useQueryClient()
  const editFormHandle = useMemo(() => createSheetHandle(), [])
  const deleteDialogHandle = useMemo(() => createAlertDiglogHandle(), [])
  const deleteMutation = useMutation({
    mutationFn: async () => api.tasks({ id: task.id }).delete().then(unwrap),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      await queryClient.invalidateQueries({ queryKey: ['task', task.id] })
      await queryClient.invalidateQueries({ queryKey: ['task', task.id, 'metrics'] })
    },
  })

  return (
    <>
      <Link to="/tasks/$taskId" viewTransition params={{ taskId: String(task.id) }}>
        <Card size="sm" style={{ viewTransitionName: `task-${task.id}` }}>
          <CardHeader className="flex flex-row items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base flex-1 min-w-0">
              <Avatar size="sm">
                {task.icon ? <AvatarImage src={task.icon} alt={`${task.name} icon`} /> : null}
                <AvatarFallback>
                  <Anchor className="size-3.5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>

              <span className="truncate">{task.name}</span>
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Task actions"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <EllipsisVerticalIcon className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => editFormHandle.open(null)}>
                  <SquarePen />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => deleteDialogHandle.open(null)}>
                  <Trash />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs line-clamp-3 h-[4em]">
              {task.description || task.command}
            </CardDescription>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t-0">
            <Badge variant={task.enabled ? 'secondary' : 'destructive'}>{task.enabled ? 'Enabled' : 'Disabled'}</Badge>
          </CardFooter>
        </Card>
      </Link>

      <AlertDialog handle={deleteDialogHandle}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the task and its schedule.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Spinner className="size-4" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TaskEditor mode="update" task={task} handle={editFormHandle} />
    </>
  )
}
