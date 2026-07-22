import { useState, useEffect } from 'react'
import type { Org } from '../types'

const ORG_KEY = 'lens_active_org'

export function useOrg() {
  const [orgs, setOrgs]       = useState<Org[]>([])
  const [activeOrg, setActive] = useState<string>(localStorage.getItem(ORG_KEY) ?? '')

  useEffect(() => {
    fetch('/api/auth/orgs')
      .then(r => r.json())
      .then((data: Org[]) => {
        setOrgs(data)
        if (!activeOrg && data.length > 0) setActive(data[0].org_id)
      })
  }, [])

  const switchOrg = (orgId: string) => {
    setActive(orgId)
    localStorage.setItem(ORG_KEY, orgId)
  }

  return { orgs, activeOrg, switchOrg }
}
