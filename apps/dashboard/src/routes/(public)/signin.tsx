import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { z } from 'zod'
import { Button } from '#dashboard/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#dashboard/components/ui/card'
import { FieldError } from '#dashboard/components/ui/field'
import { Input } from '#dashboard/components/ui/input'
import { Label } from '#dashboard/components/ui/label'
import { Spinner } from '#dashboard/components/ui/spinner'
import { api, unwrap } from '#dashboard/libs/api'
import { setAuthToken } from '#dashboard/libs/auth'
import { requireGuest, sanitizeRedirectTarget } from '../-guards'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

const signinSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
})

export const Route = createFileRoute('/(public)/signin')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: requireGuest({ defaultTo: '/' }),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  const redirectTarget = useMemo(() => sanitizeRedirectTarget(search.redirect), [search.redirect])

  const signinMutation = useMutation({
    mutationFn: (value: { username: string; password: string }) => api.auth.signin.post(value).then(unwrap),
    onSuccess: ({ data }) => {
      setAuthToken(data.token)
      navigate({ to: redirectTarget, replace: true })
    },
  })

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
    validators: {
      onSubmit: signinSchema,
    },
    onSubmit: async ({ value }) => {
      await signinMutation.mutateAsync(value)
    },
  })

  return (
    <div className="min-h-dvh px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in with your account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <form.Field name="username">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Username</Label>
                  <Input
                    id={field.name}
                    autoComplete="username"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Enter username"
                    required
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>
            <form.Field name="password">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Password</Label>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Enter password"
                    required
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>
            {signinMutation.isError && <p className="text-destructive text-xs">Please check your credentials.</p>}
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? <Spinner className="size-4" /> : 'Sign in'}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
        <CardFooter className="text-muted-foreground text-xs">Have fun!</CardFooter>
      </Card>
    </div>
  )
}
