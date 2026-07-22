export interface Org {
  org_id: string
  org_name: string
  environment: string
  connected_at: string
}

export interface Overview {
  total_conversations: string
  escalated_count: string
  resolved_count: string
  avg_turns: string
  escalation_rate: string
}

export interface VolumePoint {
  day: string
  total: number
  escalated: number
}

export interface ActionStat {
  action_name: string
  invocations: number
  successes: number
  failures: number
  success_rate: string
}

export interface Conversation {
  session_id: string
  bot_id: string
  channel: string
  status: string
  turn_count: number
  escalated: boolean
  started_at: string
  ended_at: string | null
}

export interface Turn {
  id: number
  turn_index: number
  user_message: string | null
  bot_response: string | null
  topic_name: string | null
  action_name: string | null
  action_success: boolean | null
  error_message: string | null
  created_at: string
}
