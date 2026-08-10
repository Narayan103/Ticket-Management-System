import { Button } from "@/components/ui/button"

function ErrorFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">
        Something went wrong. The error has been reported.
      </p>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </div>
  )
}

export default ErrorFallback
