import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent-500)] text-white",
        secondary:
          "border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
        destructive:
          "border-transparent bg-[var(--error-light)] text-[var(--error-text)]",
        outline: "border-[var(--border-default)] text-[var(--text-secondary)]",
        success:
          "border-transparent bg-[var(--success-light)] text-[var(--success-text)]",
        warning:
          "border-transparent bg-[var(--warning-light)] text-[var(--warning-text)]",
        info:
          "border-transparent bg-[var(--info-light)] text-[var(--info-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
