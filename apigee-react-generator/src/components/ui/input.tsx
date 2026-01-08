import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-faint)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:border-[var(--accent-500)] focus-visible:ring-2 focus-visible:ring-[var(--accent-100)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
