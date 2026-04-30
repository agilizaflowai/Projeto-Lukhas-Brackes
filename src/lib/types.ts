export type LeadStage =
  | 'novo'
  | 'lead_frio'
  | 'rapport'
  | 'social_selling'
  | 'spin'
  | 'call_agendada'
  | 'fechado'
  | 'perdido'
  | 'follow_up'

export type AssignedTo = 'ia' | 'lukhas' | 'assistente'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'pending' | 'approved' | 'sent' | 'rejected'
export type CallResult = 'fechou' | 'nao_fechou' | 'reagendar' | 'no_show'
export type UserRole = 'admin' | 'operator'
export type TaskStatus = 'pending' | 'done' | 'skipped'

export interface Lead {
  id: string
  instagram_username: string
  instagram_scoped_id: string | null
  name: string | null
  profile_pic_url: string | null
  bio: string | null
  bio_link: string | null
  follower_count: number | null
  follows_lukhas: boolean
  lukhas_follows: boolean
  gender: string | null
  fitness_level: string | null
  goal: string | null
  life_context: string | null
  tags: string[]
  stage: LeadStage
  stage_changed_at: string | null
  source: string | null
  source_post_id: string | null
  assigned_to: AssignedTo
  last_interaction_at: string | null
  next_follow_up_at: string | null
  follow_up_count: number
  is_active: boolean
  is_blocked?: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  lead_id: string
  direction: MessageDirection
  channel: string
  content: string
  content_type: string
  sent_by: string
  approved: boolean
  approved_by: string | null
  status: MessageStatus
  ig_message_id: string | null
  created_at: string
}

export interface Testimonial {
  id: string
  student_name: string
  student_instagram: string | null
  content: string
  media_url: string | null
  media_type: string | null
  student_gender: string | null
  student_fitness_level: string | null
  student_goal: string | null
  student_context: string | null
  result_summary: string | null
  source: string | null
  tags: string[]
  is_active: boolean
  created_at: string
}

export interface Call {
  id: string
  lead_id: string
  scheduled_at: string | null
  happened_at: string | null
  duration_minutes: number | null
  transcript: string | null
  ai_analysis: {
    score: number
    strengths: string[]
    improvements: string[]
    objections: string[]
    lost_moment: string | null
    summary: string
  } | null
  result: CallResult | null
  notes: string | null
  recording_url: string | null
  created_at: string
  lead?: Lead
}

export interface AIConfig {
  id: string
  config_type: string
  config_key: string
  config_value: string
  is_active: boolean
  created_at: string
}

export interface FollowUpRule {
  id: string
  trigger_condition: string
  days_after: number
  message_template: string
  use_testimonial: boolean
  testimonial_match_fields: string[]
  is_active: boolean
  priority: number
}

export interface FollowUpHistory {
  id: string
  lead_id: string
  rule_id: string
  testimonial_id: string | null
  message_sent: string
  sent_at: string
}

export interface ActivityLog {
  id: string
  lead_id: string
  action: string
  details: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}

export interface Task {
  id: string
  lead_id: string
  type: string
  title: string
  description: string | null
  suggested_text: string | null
  status: TaskStatus
  due_at: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  lead?: Lead
}

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  avatar: string | null
  created_at: string
}
