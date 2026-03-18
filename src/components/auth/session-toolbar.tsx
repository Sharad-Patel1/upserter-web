import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

interface SessionToolbarProps {
  email: string
}

export function SessionToolbar({ email }: SessionToolbarProps) {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await authClient.signOut()
      navigate({
        to: "/login",
        search: {
          redirect: "/",
        },
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Badge variant="outline" className="border-foreground/10 bg-background/70 px-3 py-1">
        {email}
      </Badge>
      <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  )
}
