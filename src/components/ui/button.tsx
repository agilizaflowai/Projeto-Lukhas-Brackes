import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E645]/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-[#1B3A2D] text-white hover:bg-[#1B3A2D]/90 shadow-[0_2px_8px_rgba(27,58,45,0.2)]",
        destructive: "bg-[#BA1A1A] text-white hover:bg-[#BA1A1A]/90",
        outline: "border border-[#EFEFEF] bg-white text-[#414844] hover:bg-[#F7F8F9] hover:border-[#E5E7EB]",
        secondary: "bg-[#F7F8F9] text-[#414844] hover:bg-[#E7E9E6]",
        ghost: "text-[#414844] hover:bg-[#F7F8F9]",
        link: "text-[#1B3A2D] underline-offset-4 hover:underline",
        accent: "bg-[#C8E645] text-[#1B3A2D] font-bold hover:bg-[#b8d635] shadow-[0_2px_8px_rgba(200,230,69,0.35)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
