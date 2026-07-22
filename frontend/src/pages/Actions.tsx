import { useQuery } from '@tanstack/react-query'
import type { ActionStat } from '../types'

interface Props { orgId: string }

export default function ActionsPage({ orgId }: Props) {
  const { data = [] } = useQuery<ActionStat[]>({
    queryKey: ['actions', orgId],
    queryFn:  () => fetch('/api/analytics/actions?days=7', { headers: { 'x-org-id': orgId } }).then(r => r.json()),
    enabled:  !!orgId,
    refetchInterval: 30_000,
  })

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Action Analytics — last 7 days</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              {['Action', 'Invocations', 'Successes', 'Failures', 'Success Rate'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map(a => (
              <tr key={a.action_name} className="hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-300">{a.action_name}</td>
                <td className="px-4 py-3">{a.invocations}</td>
                <td className="px-4 py-3 text-green-400">{a.successes}</td>
                <td className="px-4 py-3 text-red-400">{a.failures}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${a.success_rate}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{a.success_rate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
