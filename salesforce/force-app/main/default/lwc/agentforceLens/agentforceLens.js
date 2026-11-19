import { LightningElement, api, track } from 'lwc'

export default class AgentforceLens extends LightningElement {
  @api backendUrl = 'http://localhost:4000'
  @api orgId = ''
  @api dashboardUrl = 'http://localhost:5173'

  @track overview = null
  @track isLoading = true
  @track hasError = false

  connectedCallback() {
    this.fetchOverview()
    // Refresh every 30 seconds
    this._interval = setInterval(() => this.fetchOverview(), 30_000)
  }

  disconnectedCallback() {
    clearInterval(this._interval)
  }

  async fetchOverview() {
    if (!this.orgId) return
    try {
      const res = await fetch(
        `${this.backendUrl}/api/analytics/overview?days=7`,
        { headers: { 'x-org-id': this.orgId } }
      )
      if (!res.ok) throw new Error('Bad response')
      this.overview   = await res.json()
      this.hasError   = false
    } catch {
      this.hasError = true
    } finally {
      this.isLoading = false
    }
  }

  get escalationRateDisplay() {
    return this.overview ? `${this.overview.escalation_rate}%` : '—'
  }
}
