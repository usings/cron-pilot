import type { Treaty } from '@elysiajs/eden'
import type { ReactElement } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { z } from 'zod'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '#dashboard/components/ui/accordion'
import { Button } from '#dashboard/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#dashboard/components/ui/field'
import { Input } from '#dashboard/components/ui/input'
import {
  createSheetHandle,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#dashboard/components/ui/sheet'
import { Spinner } from '#dashboard/components/ui/spinner'
import { Switch } from '#dashboard/components/ui/switch'
import { Textarea } from '#dashboard/components/ui/textarea'
import { useBreakpoint } from '#dashboard/hooks/breakpoints'
import { api, unwrap } from '#dashboard/libs/api'

type Task = Treaty.Data<typeof api.tasks.get>['data'][number]
type TaskCreatePayload = Parameters<typeof api.tasks.post>[0]
type TaskIdClient = ReturnType<typeof api.tasks>
type TaskPatchPayload = Parameters<TaskIdClient['patch']>[0]

type TaskEditorProps =
  | {
      mode: 'create'
      trigger?: ReactElement
      handle?: ReturnType<typeof createSheetHandle>
    }
  | {
      mode: 'update'
      task: Task
      trigger?: ReactElement
      handle?: ReturnType<typeof createSheetHandle>
    }

export function TaskEditor(props: TaskEditorProps) {
  const queryClient = useQueryClient()
  const isUpdate = props.mode === 'update'
  const task = isUpdate ? props.task : undefined
  const internalHandle = useMemo(() => createSheetHandle(), [])
  const handle = props.handle || internalHandle

  const createMutation = useMutation({
    mutationFn: async (payload: TaskCreatePayload) => api.tasks.post(payload).then(unwrap),
    onSuccess: async () => {
      handle.close()
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: Task['id']; payload: TaskPatchPayload }) =>
      api.tasks({ id }).patch(payload).then(unwrap),
    onSuccess: async (_, variables) => {
      handle.close()
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      await queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
      await queryClient.invalidateQueries({ queryKey: ['task', variables.id, 'metrics'] })
    },
  })

  const form = useForm({
    defaultValues: {
      name: task?.name ?? '',
      cron: task?.cron ?? '',
      command: task?.command ?? '',
      enabled: task?.enabled ?? true,
      description: task?.description ?? '',
      icon: task?.icon ?? '',
      envs: stringifyEnvInput(task?.envs),
    },
    validators: {
      onSubmit: taskFormSchema,
    },
    onSubmit: async ({ value }) => {
      const envsInput = value.envs?.trim() ?? ''
      const envsValue = envsInput ? parseEnvInput(envsInput) : isUpdate && task?.envs ? {} : undefined
      const payload = {
        name: value.name,
        cron: value.cron,
        command: value.command,
        description: value.description?.trim() || undefined,
        icon: value.icon?.trim() || undefined,
        envs: envsValue,
      }

      if (isUpdate && task) {
        const updatePayload: TaskPatchPayload = {
          ...payload,
          enabled: value.enabled,
        }
        await updateMutation.mutateAsync({ id: task.id, payload: updatePayload })
        return
      }

      const createPayload: TaskCreatePayload = {
        ...payload,
        enabled: value.enabled,
      }
      await createMutation.mutateAsync(createPayload)
    },
  })

  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'

  return (
    <Sheet
      handle={handle}
      onOpenChange={(open) => {
        if (!open) {
          form.reset()
        }
      }}
    >
      {props.trigger && <SheetTrigger render={props.trigger} />}
      <SheetContent side={isMobile ? 'top' : 'right'}>
        <SheetHeader>
          <SheetTitle>{isUpdate ? 'Update Scheduled Task' : 'Create Scheduled Task'}</SheetTitle>
          <SheetDescription>
            {isUpdate
              ? 'Modify the configuration of this scheduled task.'
              : 'Define the configuration for a new scheduled task.'}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col px-4 pb-2"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <div className="flex-1 overflow-y-auto">
            <Accordion defaultValue={['general']} multiple={!isMobile}>
              <AccordionItem value="general">
                <AccordionTrigger className="text-muted-foreground uppercase tracking-widest">General</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <FieldGroup>
                    <form.Field name="cron">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name} required>
                            Cron
                          </FieldLabel>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="0 6 * * *"
                          />
                          <FieldDescription className="text-[10px] leading-4 whitespace-pre text-muted-foreground/90 hidden group-has-[[data-slot=input]:focus]/field:block">
                            {cronHint}
                          </FieldDescription>
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="command">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name} required>
                            Command
                          </FieldLabel>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="bun run /data/scripts/backup.ts"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="name">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name} required>
                            Name
                          </FieldLabel>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="daily backup"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="enabled">
                      {(field) => (
                        <Field orientation="horizontal" className="flex justify-between">
                          <div className="flex flex-col gap-2">
                            <FieldLabel htmlFor={field.name}>Enabled</FieldLabel>
                            <FieldDescription>Disabled tasks will not be scheduled or run.</FieldDescription>
                          </div>
                          <Switch
                            id={field.name}
                            checked={field.state.value}
                            onCheckedChange={(checked) => field.handleChange(checked)}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </FieldGroup>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-muted-foreground uppercase tracking-widest">
                  Advanced
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <FieldGroup>
                    <form.Field name="icon">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>Icon</FieldLabel>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="https://example.com/icon.png"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="description">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                          <Textarea
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="notes about this task's purpose"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="envs">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>Environment variables</FieldLabel>
                          <Textarea
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder={`API_KEY=demo\nMODE=prod`}
                            rows={4}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                  </FieldGroup>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-destructive mt-3 text-xs">
              {isUpdate ? 'Update failed. Try again.' : 'Create failed. Try again.'}
            </p>
          )}
          <SheetFooter className="px-0 flex-row gap-2">
            <SheetClose render={<Button type="button" variant="outline" className="w-1/3" />}>Cancel</SheetClose>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting} className="flex-1">
                  {isSubmitting ? <Spinner /> : isUpdate ? 'Update' : 'Create'}
                </Button>
              )}
            </form.Subscribe>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

const taskFormSchema = z.object({
  name: z.string().min(1, 'task name is required.'),
  cron: z.string().min(1, 'cron expression is required.'),
  command: z.string().min(1, 'command is required.'),
  enabled: z.boolean(),
  description: z.string(),
  icon: z.string(),
  envs: z.string().refine(
    (value) => {
      if (!value?.trim()) return true
      try {
        parseEnvInput(value)
        return true
      } catch {
        return false
      }
    },
    {
      message: 'Use KEY=VALUE lines for envs.',
    },
  ),
})

const cronHint = `Format:
*  *  *  *  *  *
┬  ┬  ┬  ┬  ┬  ┬
│  │  │  │  │  │
│  │  │  │  │  └───── day of week (0-7, 1L-7L)
│  │  │  │  └──────── month (1-12, JAN-DEC)
│  │  │  └─────────── day of month (1-31, L)
│  │  └────────────── hour (0-23)
│  └───────────────── minute (0-59)
└──────────────────── second (0-59, optional)`

function parseEnvInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const entries = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.split('=')
      if (!key || rest.length === 0) {
        throw new Error('Invalid env entry')
      }
      return [key.trim(), rest.join('=').trim()] as const
    })

  return Object.fromEntries(entries)
}

function stringifyEnvInput(envs: Record<string, string> | null | undefined) {
  if (!envs) return ''
  return Object.entries(envs)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}
