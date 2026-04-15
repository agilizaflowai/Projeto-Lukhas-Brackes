import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[6px] border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C8E645]/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#1B3A2D] text-white",
        secondary: "border-transparent bg-[#F7F8F9] text-[#414844]",
        destructive: "border-transparent bg-rose-50 text-rose-700",
        outline: "text-[#414844] border-[#EFEFEF]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
