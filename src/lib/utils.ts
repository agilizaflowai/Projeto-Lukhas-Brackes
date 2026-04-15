import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function isReadable(s: string | null | undefined): boolean {
  if (!s) return false
  if (s.startsWith('ig_')) return false
  if (/^\d{8,}$/.test(s)) return false
  return true
}

export function isValidInstagramUsername(username: string | null | undefined): boolean {
  return isReadable(username) && (username?.length ?? 0) >= 2
}

export function getInstagramUrl(username: string | null | undefined): string | null {
  if (!isValidInstagramUsername(username)) return null
  return `https://instagram.com/${username}`
}

export function getLeadDisplayName(lead: { name?: string | null; instagram_username?: string | null }): string {
  if (isReadable(lead.name)) return lead.name!
  if (isReadable(lead.instagram_username)) return `@${lead.instagram_username}`
  const shortId = (lead.instagram_username || '').slice(-4)
  return `Lead #${shortId || '???'}`
}

export function getLeadDisplayUsername(lead: { name?: string | null; instagram_username?: string | null }): string | null {
  if (!isReadable(lead.instagram_username)) return null
  if (isReadable(lead.name)) return `@${lead.instagram_username}`
  return null
}

const GOAL_LABELS: Record<string, string> = {
  emagrecer: 'emagrecer',
  hipertrofia: 'ganhar massa',
  saude: 'melhorar a saúde',
  performance: 'melhorar performance',
}

const FITNESS_LABELS: Record<string, string> = {
  sedentario: 'sedentária',
  iniciante: 'iniciante',
  intermediario: 'intermediária',
  avancado: 'avançada',
}

export function previewFollowUpTemplate(template: string, sampleLead?: { name?: string | null; goal?: string | null; life_context?: string | null; fitness_level?: string | null; gender?: string | null; instagram_username?: string | null }): string {
  const defaults: Record<string, string> = {
    '{nome}': sampleLead?.name || 'Maria',
    '{primeiro_nome}': sampleLead?.name?.split(' ')[0] || 'Maria',
    '{objetivo}': sampleLead?.goal ? (GOAL_LABELS[sampleLead.goal] || sampleLead.goal) : 'emagrecer',
    '{contexto}': sampleLead?.life_context || 'mãe de 2 filhos',
    '{nivel}': sampleLead?.fitness_level ? (FITNESS_LABELS[sampleLead.fitness_level] || sampleLead.fitness_level) : 'iniciante',
    '{genero}': sampleLead?.gender === 'F' ? 'ela' : 'ele',
    '{dias_sem_resposta}': '5',
    '{follow_up_count}': '2',
    '{username}': sampleLead?.instagram_username || 'maria.fitness',
  }

  let result = template
  for (const [placeholder, value] of Object.entries(defaults)) {
    result = result.replaceAll(placeholder, value)
  }
  return result
}
