import { NavLink } from 'react-router-dom'
import type { Org } from '../types'

interface Props {
  orgs: Org[]
  activeOrg: string
  onSwitchOrg: (id: string) => void
}

const links = [
  { to: '/',              label: 'Overview'      },
  { to: '/conversations', label: 'Conversations' },
  { to: '/actions',       label: 'Actions'       },
  { to: '/orgs',          label: 'Orgs'          },
]

export default function Sidebar({ orgs, activeOrg, onSwitchOrg }: Props) {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col px-4 py-6 gap-6">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Workspace</p>
        <select
          value={activeOrg}
          onChange={e => onSwitchOrg(e.target.value)}
          className="w-full bg-gray-800 text-sm text-gray-100 rounded px-2 py-1.5 border border-gray-700"
        >
          {orgs.map(o => (
            <option key={o.org_id} value={o.org_id}>{o.org_name}</option>
          ))}
        </select>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <a
          href="/api/auth/connect"
          className="block text-center text-xs bg-blue-700 hover:bg-blue-600 text-white rounded px-3 py-2 transition-colors"
        >
          + Connect Org
        </a>
      </div>
    </aside>
  )
}
