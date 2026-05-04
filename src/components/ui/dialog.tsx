'use client'

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => onOpenChange(false)} />
      {/* pointer-events-none faz esse wrapper não capturar cliques — eles passam pro overlay abaixo (que fecha o dialog).
          O DialogContent reativa pointer-events-auto, então só o conteúdo visível captura interação. */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        {children}
      </div>
    </div>,
    document.body
  )
}

function DialogContent({ className, children, onClose, ...props }: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div className={cn("pointer-events-auto relative z-[101] w-full max-w-lg max-h-[calc(100dvh-32px)] sm:max-h-[calc(100dvh-48px)] overflow-y-auto rounded-[16px] sm:rounded-[20px] border border-[#EFEFEF] bg-white p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-dialog-in", className)} {...props}>
      {onClose && (
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full w-8 h-8 flex items-center justify-center text-[#9CA3AF] hover:bg-[#F7F8F9] hover:text-[#414844] transition-all duration-150 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-bold text-[#0F172A] leading-none tracking-tight", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[#9CA3AF]", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)} {...props} />
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
