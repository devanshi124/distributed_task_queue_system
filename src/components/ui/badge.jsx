import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        pending: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        running: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        failed: 'border-red-500/30 bg-red-500/10 text-red-400',
        retrying: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
        cancelled: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
        high: 'border-red-500/30 bg-red-500/10 text-red-400',
        medium: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
        low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
