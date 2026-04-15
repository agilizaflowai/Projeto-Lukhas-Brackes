'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (v: string) => void
}

const TabsContext = React.createContext<TabsContextValue>({ value: '', onValueChange: () => {} })

function Tabs({ defaultValue, value, onValueChange, children, className, ...props }: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
  className?: string
}) {
  const [internal, setInternal] = React.useState(defaultValue || '')
  const current = value ?? internal
  const setCurrent = onValueChange ?? setInternal

  return (
    <TabsContext.Provider value={{ value: current, onValueChange: setCurrent }}>
      <div className={className} {...props}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex h-10 items-center justify-start rounded-full bg-[#F7F8F9] border border-[#EFEFEF] p-1 text-[#9CA3AF] overflow-x-auto max-w-full scrollbar-none", className)} {...props}>
      {children}
    </div>
  )
}

function TabsTrigger({ value, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E645]/30 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        ctx.value === value ? "bg-white text-[#1B3A2D] shadow-sm font-bold" : "text-[#9CA3AF] hover:text-[#414844]"
      )}
      onClick={() => ctx.onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null
  return <div className={cn("mt-4 ring-offset-background focus-visible:outline-none", className)} {...props}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
