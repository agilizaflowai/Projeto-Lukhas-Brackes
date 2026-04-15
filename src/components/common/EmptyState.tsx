'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F7F8F9] border border-[#EFEFEF] mb-4">
        <Icon className="w-7 h-7 text-[#9CA3AF]" />
      </div>
      <p className="text-sm font-semibold text-[#414844] mb-1">{title}</p>
      <p className="text-xs text-[#9CA3AF] mb-4 text-center max-w-xs">{description}</p>
      {action}
    </motion.div>
  )
}
