import { Link as RouterLink, type LinkProps } from "react-router-dom"

import { cn } from "@/lib/utils"

function Link({ className, ...props }: LinkProps) {
  return (
    <RouterLink
      data-slot="link"
      className={cn("text-foreground hover:underline", className)}
      {...props}
    />
  )
}

export { Link }
