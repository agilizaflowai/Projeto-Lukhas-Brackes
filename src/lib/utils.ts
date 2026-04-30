import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Dispara o webhook do n8n que envia a mensagem aprovada via Instagram DM.
// Nunca joga: falha de envio não deve reverter a aprovação no banco.
export async function sendApprovedMessage(messageId: string): Promise<boolean> {
  try {
    const response = await fetch('https://n8n-gend.srv1431760.hstgr.cloud/webhook/send-approved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId }),
    })
    const result = await response.json().catch(() => null)
    if (!result?.success) {
      console.error('Erro ao enviar DM aprovada:', result?.error || 'resposta inválida')
      return false
    }
    return true
  } catch (err) {
    console.error('Erro no webhook send-approved:', err)
    return false
  }
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

// Sample usado no preview de templates de follow-up.
// Quando passamos um lead real do banco usamos os dados dele;
// quando n\u00e3o, mostramos placeholders neutros entre colchetes
// (sem inventar nomes/dados fake).
export interface FollowUpSample {
  name?: string | null
  goal?: string | null
  life_context?: string | null
  fitness_level?: string | null
  gender?: string | null
  instagram_username?: string | null
  follow_up_count?: number | null
  days_since_last_message?: number | null
}

export function previewFollowUpTemplate(template: string, sampleLead?: FollowUpSample): string {
  const firstName = sampleLead?.name?.split(' ')[0]
  const defaults: Record<string, string> = {
    '{nome}': sampleLead?.name || '[nome]',
    '{primeiro_nome}': firstName || '[primeiro_nome]',
    '{objetivo}': sampleLead?.goal ? (GOAL_LABELS[sampleLead.goal] || sampleLead.goal) : '[objetivo]',
    '{contexto}': sampleLead?.life_context || '[contexto]',
    '{nivel}': sampleLead?.fitness_level ? (FITNESS_LABELS[sampleLead.fitness_level] || sampleLead.fitness_level) : '[n\u00edvel]',
    '{genero}': sampleLead?.gender === 'F' ? 'ela' : sampleLead?.gender === 'M' ? 'ele' : '[ele/ela]',
    '{dias_sem_resposta}': sampleLead?.days_since_last_message != null ? String(sampleLead.days_since_last_message) : '[dias_sem_resposta]',
    '{follow_up_count}': sampleLead?.follow_up_count != null ? String(sampleLead.follow_up_count) : '[follow_up_count]',
    '{username}': sampleLead?.instagram_username || '[username]',
  }

  let result = template
  for (const [placeholder, value] of Object.entries(defaults)) {
    result = result.replaceAll(placeholder, value)
  }
  return result
}
