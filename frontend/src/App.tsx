import { Routes, Route } from 'react-router-dom'
import { useOrg } from './hooks/useOrg'
import Sidebar from './components/Sidebar'
import OverviewPage       from './pages/Overview'
import ConversationsPage  from './pages/Conversations'
import ActionsPage        from './pages/Actions'
import OrgsPage           from './pages/Orgs'

export default function App() {
  const { orgs, activeOrg, switchOrg } = useOrg()

  return (
    <div className="flex min-h-screen">
      <Sidebar orgs={orgs} activeOrg={activeOrg} onSwitchOrg={switchOrg} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/"              element={<OverviewPage      orgId={activeOrg} />} />
          <Route path="/conversations" element={<ConversationsPage orgId={activeOrg} />} />
          <Route path="/actions"       element={<ActionsPage       orgId={activeOrg} />} />
          <Route path="/orgs"          element={<OrgsPage />} />
        </Routes>
      </main>
    </div>
  )
}
