'use client'

import NumberFlow from '@number-flow/react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  color?: 'primary' | 'accent' | 'neutral'
  glow?: boolean
}

const SPARK_HEIGHTS = [35, 60, 25, 75, 50, 85, 55]

const ICON_STYLES = {
  primary: { container: 'bg-emerald-500/10', icon: 'text-emerald-400' },
  accent:  { container: 'bg-pink-500/10',    icon: 'text-pink-400' },
  neutral: { container: 'bg-slate-500/10',   icon: 'text-slate-400' },
}

const VALUE_COLORS = {
  primary: 'text-emerald-400',
  accent:  'text-pink-400',
  neutral: 'text-foreground',
}

const SPARK_COLORS = {
  primary: 'bg-emerald-400/25',
  accent:  'bg-pink-400/25',
  neutral: 'bg-slate-400/25',
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
  glow,
}: MetricCardProps) {
  const isNumber = typeof value === 'number'
  const iconStyle = ICON_STYLES[color]
  const valueColor = VALUE_COLORS[color]
  const sparkColor = SPARK_COLORS[color]

  return (
    <div
      className={cn(
        // Base
        'relative overflow-hidden rounded-xl border border-[#1a1f3e] bg-[#0f1225]',
        // Padding (16px vertical, 20px horizontal — design spec)
        'p-4 px-5',
        // Hover
        'hover:-translate-y-[3px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)] hover:border-[#2a2f5e]',
        // Transition
        'transition-all duration-[250ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]',
        // Glow no primeiro card
        glow && 'card-glow'
      )}
    >
      {/* Header: info + icon */}
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          {/* Label — caption style: 11px uppercase tracking-widest */}
          <p className="uppercase tracking-[0.1em] text-[11px] font-medium text-muted-foreground leading-none">
            {title}
          </p>

          {/* Número — protagonista: 32px Outfit bold */}
          <div
            className={cn('text-[32px] font-bold leading-none tracking-tight', valueColor)}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {isNumber ? (
              <NumberFlow value={value} />
            ) : (
              value
            )}
          </div>

          {/* Subtítulo — 13px complementar */}
          {subtitle && (
            <p className={cn(
              'text-[13px] leading-tight',
              trend === 'up' && 'text-emerald-400',
              trend === 'down' && 'text-red-400',
              (!trend || trend === 'neutral') && 'text-muted-foreground'
            )}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Icon container — 44x44 rounded-xl com bg opacity */}
        <div className={cn(
          'flex items-center justify-center w-11 h-11 rounded-xl shrink-0',
          iconStyle.container
        )}>
          <Icon className={cn('w-[22px] h-[22px]', iconStyle.icon)} />
        </div>
      </div>

      {/* Sparkline — barras com stagger animation */}
      <div className="absolute bottom-3 right-4 flex items-end gap-[3px] h-6">
        {SPARK_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={cn('w-[5px] rounded-sm', sparkColor)}
            style={{
              height: `${h}%`,
              animation: `grow-up 400ms ease-out ${i * 60}ms both`,
              transformOrigin: 'bottom',
            }}
          />
        ))}
      </div>
    </div>
  )
}
