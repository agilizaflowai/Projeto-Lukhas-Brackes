import * as React from "react"
import { cn } from "@/lib/utils"

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        "flex h-10 w-full md:w-auto rounded-xl border border-[#EFEFEF] bg-[#F7F8F9] px-4 py-2 text-sm text-[#191c1b] ring-offset-background cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E645]/30 focus-visible:border-[#C8E645] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = "Select"
export { Select }
