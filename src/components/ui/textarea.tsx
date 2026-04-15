import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-[#EFEFEF] bg-[#F7F8F9] px-4 py-3 text-sm text-[#191c1b] ring-offset-background placeholder:text-[#9CA3AF] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E645]/30 focus-visible:border-[#C8E645] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"
export { Textarea }
