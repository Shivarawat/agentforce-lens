import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import StatCard from '../components/StatCard'
import type { Overview, VolumePoint } from '../types'

interface Props { orgId: string }

function orgHeaders(orgId: string) {
  return { 'x-org-id': orgId }
}

export default function OverviewPage({ orgId }: Props) {
  const { data: overview } = useQuery<Overview>({
    queryKey:  ['overview', orgId],
    queryFn:   () => fetch('/api/analytics/overview?days=7', { headers: orgHeaders(orgId) }).then(r => r.json()),
    enabled:   !!orgId,
    refetchInterval: 30_000,
  })

  const { data: volume = [] } = useQuery<VolumePoint[]>({
    queryKey:  ['volume', orgId],
    queryFn:   () => fetch('/api/analytics/volume?days=7', { headers: orgHeaders(orgId) }).then(r => r.json()),
    enabled:   !!orgId,
    refetchInterval: 30_000,
  })

  const chartData = volume.map(v => ({
    day:       new Date(v.day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    Total:     Number(v.total),
    Escalated: Number(v.escalated),
  }))

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Overview — last 7 days</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Conversations"  value={overview?.total_conversations ?? '—'} />
        <StatCard label="Resolved"             value={overview?.resolved_count ?? '—'} />
        <StatCard
          label="Escalated"
          value={overview?.escalated_count ?? '—'}
          highlight={Number(overview?.escalation_rate) >= 20}
        />
        <StatCard
          label="Escalation Rate"
          value={overview ? `${overview.escalation_rate}%` : '—'}
          sub="threshold: 20%"
          highlight={Number(overview?.escalation_rate) >= 20}
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-sm text-gray-400 mb-4">Conversation Volume</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
            <Legend />
            <Bar dataKey="Total"     fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Escalated" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
