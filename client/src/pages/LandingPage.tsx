import { Navigate, Link } from 'react-router-dom'
import { RadarIcon, SparklesIcon } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

function LandingPage() {
  const { data: session, isPending } = useSession()

  if (!isPending && session) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2 font-heading font-semibold text-foreground">
          <RadarIcon className="size-5" aria-hidden />
          Sahyog
        </span>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/login" />}>
          Login
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="relative flex size-28 items-center justify-center">
          <div
            className="absolute inset-0 animate-radar-sweep rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--primary) 45%, transparent) 45deg, transparent 100deg)',
            }}
            aria-hidden
          />
          <div className="absolute inset-3 rounded-full border border-primary/30" aria-hidden />
          <RadarIcon className="size-10 text-primary" aria-hidden />
        </div>

        <p className="mt-8 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Support ops — AI-assisted
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold text-foreground sm:text-5xl">Sahyog</h1>
        <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
          Every ticket triaged, tracked, and resolved from one console — with AI classification and
          suggested replies to keep your agents moving fast.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link to="/login" />}>
            <SparklesIcon />
            Get Started
          </Button>
        </div>
      </div>
    </main>
  )
}

export default LandingPage
