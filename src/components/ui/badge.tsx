import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 border-white px-3 py-1 text-xs font-bold shadow transition-all hover:scale-105 hover:shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
        secondary: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
        destructive: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
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
