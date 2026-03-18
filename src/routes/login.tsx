import { createFileRoute, redirect } from "@tanstack/react-router"
import { startTransition, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { getSession } from "@/lib/auth.functions"

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/",
  }),
  beforeLoad: async () => {
    const session = await getSession()

    if (session) {
      throw redirect({
        to: "/",
      })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const search = Route.useSearch()
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [error, setError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setIsSubmitting(true)

    startTransition(async () => {
      try {
        const result = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password: currentPassword,
        })

        if (result.error) {
          setError(result.error.message)
          return
        }

        const destination = search.redirect.startsWith("/") ? search.redirect : "/"
        window.location.assign(destination)
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : String(submitError))
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(222,116,41,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(18,61,74,0.24),_transparent_28%),linear-gradient(180deg,_rgba(252,248,241,0.98),_rgba(244,238,229,0.96))] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-xl items-center">
        <Card className="w-full border border-foreground/10 bg-background/90 backdrop-blur-sm">
          <CardHeader className="gap-3 border-b border-border/70">
            <CardTitle className="text-3xl tracking-[-0.04em]">Sign in to Upserter</CardTitle>
            <CardDescription>
              Access to pipeline runs and audit data is limited to provisioned users.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Password"
                required
              />

              {error ? (
                <div className="border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
