import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Conversation, Turn } from '../types'

interface Props { orgId: string }

export default function ConversationsPage({ orgId }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus]     = useState('')

  const { data } = useQuery<{ conversations: Conversation[]; total: number }>({
    queryKey: ['conversations', orgId, status],
    queryFn:  () => fetch(
      `/api/conversations?limit=20${status ? `&status=${status}` : ''}`,
      { headers: { 'x-org-id': orgId } }
    ).then(r => r.json()),
    enabled: !!orgId,
  })

  const { data: replay } = useQuery<{ turns: Turn[] }>({
    queryKey: ['turns', orgId, selected],
    queryFn:  () => fetch(
      `/api/conversations/${selected}/turns`,
      { headers: { 'x-org-id': orgId } }
    ).then(r => r.json()),
    enabled: !!selected,
  })

  return (
    <div className="p-8 flex gap-6">
      {/* List */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Conversations</h1>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="bg-gray-800 text-sm rounded px-2 py-1.5 border border-gray-700"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>

        <div className="space-y-2">
          {data?.conversations.map(c => (
            <button
              key={c.session_id}
              onClick={() => setSelected(c.session_id)}
              className={`w-full text-left rounded-xl border p-4 transition-colors ${
                selected === c.session_id
                  ? 'border-blue-600 bg-blue-950'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-gray-400">{c.session_id.slice(0, 20)}…</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.escalated
                    ? 'bg-red-900 text-red-300'
                    : c.status === 'resolved'
                    ? 'bg-green-900 text-green-300'
                    : 'bg-blue-900 text-blue-300'
                }`}>
                  {c.escalated ? 'escalated' : c.status}
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>{c.channel}</span>
                <span>{c.turn_count} turns</span>
                <span>{new Date(c.started_at).toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Replay panel */}
      {selected && (
        <div className="w-96 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3 overflow-y-auto max-h-[80vh]">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold">Conversation Replay</h2>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xs">✕ close</button>
          </div>

          {replay?.turns.map(t => (
            <div key={t.id} className="space-y-1 border-b border-gray-800 pb-3">
              <p className="text-xs text-gray-500">Turn {t.turn_index + 1}</p>

              {t.user_message && (
                <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm">{t.user_message}</div>
              )}
              {t.bot_response && (
                <div className="bg-blue-950 rounded-lg px-3 py-2 text-sm text-blue-100">{t.bot_response}</div>
              )}

              {t.action_name && (
                <div className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                  t.action_success ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'
                }`}>
                  <span>Action: {t.action_name}</span>
                  <span>{t.action_success ? '✓' : '✗'}</span>
                </div>
              )}
              {t.topic_name && (
                <p className="text-xs text-gray-500">Topic: {t.topic_name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
