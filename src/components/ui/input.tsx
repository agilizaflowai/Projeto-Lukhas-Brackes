import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[#EFEFEF] bg-[#F7F8F9] px-4 py-2 text-sm text-[#191c1b] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#9CA3AF] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E645]/30 focus-visible:border-[#C8E645] disabled:cursor-not-allowed disabled:opacity-50",
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
