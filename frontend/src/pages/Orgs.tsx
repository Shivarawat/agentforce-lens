import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Org } from '../types'

export default function OrgsPage() {
  const qc = useQueryClient()

  const { data: orgs = [] } = useQuery<Org[]>({
    queryKey: ['orgs'],
    queryFn:  () => fetch('/api/auth/orgs').then(r => r.json()),
  })

  const disconnect = async (orgId: string) => {
    await fetch(`/api/auth/orgs/${orgId}`, { method: 'DELETE' })
    qc.invalidateQueries({ queryKey: ['orgs'] })
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Connected Orgs</h1>
        <a
          href="/api/auth/connect"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Connect Org
        </a>
      </div>

      <div className="space-y-3">
        {orgs.map(o => (
          <div key={o.org_id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">{o.org_name}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{o.org_id}</p>
              <p className="text-xs text-gray-600 mt-1">
                Connected {new Date(o.connected_at).toLocaleDateString()} · {o.environment}
              </p>
            </div>
            <button
              onClick={() => disconnect(o.org_id)}
              className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded transition-colors"
            >
              Disconnect
            </button>
          </div>
        ))}

        {orgs.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            No orgs connected yet. Click "+ Connect Org" to get started.
          </div>
        )}
      </div>
    </div>
  )
}
