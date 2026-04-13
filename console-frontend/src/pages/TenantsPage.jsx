import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Pencil, Building2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { tenantsAPI, plansAPI } from '../api'
import { PageHeader, LoadingSpinner, EmptyState, Modal, StatusBadge } from '../components/UI'

const STATUSES = ['trial', 'active', 'suspended', 'cancelled']

// ─── Feature override grid (same key list, compact) ───────────────────────
const FEATURE_GROUPS = [
  { group: 'CORE', keys: ['dashboard:view', 'products:view', 'products:manage', 'categories:manage', 'inventory:view', 'inventory:manage'] },
  { group: 'PURCHASES', keys: ['purchases:view', 'purchases:manage', 'grn:view', 'grn:manage', 'suppliers:view', 'suppliers:manage'] },
  { group: 'B2B SALES', keys: ['sales_orders:view', 'sales_orders:manage', 'sales_invoices:view', 'sales_invoices:manage', 'sales_quotations:view', 'sales_quotations:manage'] },
  { group: 'E-COMMERCE', keys: ['store:view', 'cart:manage', 'orders:view', 'orders:manage'] },
  { group: 'ADVANCED', keys: ['reports:view', 'coupons:manage', 'banners:manage', 'reviews:manage'] },
  { group: 'ENTERPRISE', keys: ['b2b_customers:view', 'b2b_customers:manage', 'staff:manage', 'warehouses:manage'] },
]

function shortKey(key) {
  return key.split(':').map((p) => p.replace(/_/g, ' ')).join(' → ')
}

function FeatureOverrideGrid({ selected, onChange }) {
  const toggle = (key) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])

  return (
    <div className="space-y-3">
      {FEATURE_GROUPS.map(({ group, keys }) => (
        <div key={group} className="border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{group}</p>
          <div className="grid grid-cols-2 gap-x-4">
            {keys.map((key) => (
              <div key={key} className="feature-cell">
                <input type="checkbox" id={`ov-${key}`} checked={selected.includes(key)} onChange={() => toggle(key)} />
                <label htmlFor={`ov-${key}`} className="text-xs text-slate-600 select-none cursor-pointer capitalize">
                  {shortKey(key)}
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Edit Tenant Modal ─────────────────────────────────────────────────────
function TenantEditModal({ open, onClose, tenant, plans, onSaved }) {
  const [form, setForm] = useState({})
  const [customEnabled, setCustomEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && tenant) {
      const customFeatures = Array.isArray(tenant.custom_features) ? tenant.custom_features : []
      setCustomEnabled(customFeatures.length > 0)
      setForm({
        plan_id: tenant.plan_id ?? '',
        subscription_status: tenant.subscription_status ?? 'trial',
        notes: tenant.notes ?? '',
        custom_features: customFeatures,
      })
    }
  }, [open, tenant])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        plan_id: form.plan_id === '' ? null : Number(form.plan_id),
        custom_features: customEnabled ? form.custom_features : [],
      }
      await tenantsAPI.update(tenant.id, payload)
      toast.success('Tenant updated')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Failed to update tenant')
    } finally {
      setSaving(false)
    }
  }

  if (!tenant) return null

  return (
    <Modal open={open} onClose={onClose} title={`Edit Tenant — ${tenant.name}`} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Subscription Status</label>
            <select className="input" value={form.subscription_status} onChange={(e) => set('subscription_status', e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={form.plan_id} onChange={(e) => set('plan_id', e.target.value)}>
              <option value="">— No plan —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes (internal)</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Internal notes about this tenant..."
          />
        </div>

        {/* Custom feature override */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none mb-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400"
              checked={customEnabled}
              onChange={(e) => setCustomEnabled(e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-700">
              Override plan features for this tenant
            </span>
          </label>
          {customEnabled && (
            <FeatureOverrideGrid
              selected={form.custom_features}
              onChange={(f) => set('custom_features', f)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-console" disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const debounceRef = useRef(null)

  const load = useCallback((q = search, planId = filterPlan, status = filterStatus) => {
    const params = {}
    if (q) params.search = q
    if (planId) params.plan_id = planId
    if (status) params.status = status
    tenantsAPI
      .list(params)
      .then((res) => setTenants(res.data))
      .catch((err) => setError(err.response?.data?.detail ?? 'Failed to load tenants'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true)
    Promise.all([
      tenantsAPI.list({}),
      plansAPI.list(),
    ])
      .then(([tRes, pRes]) => {
        setTenants(tRes.data)
        setPlans(pRes.data)
      })
      .catch((err) => setError(err.response?.data?.detail ?? 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(val, filterPlan, filterStatus), 350)
  }

  const handleFilterChange = (planId, status) => {
    setFilterPlan(planId)
    setFilterStatus(status)
    load(search, planId, status)
  }

  return (
    <>
      <PageHeader title="Tenants" subtitle="All LedgerCart client businesses" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filterPlan}
          onChange={(e) => handleFilterChange(e.target.value, filterStatus)}
        >
          <option value="">All plans</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          className="input w-auto"
          value={filterStatus}
          onChange={(e) => handleFilterChange(filterPlan, e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 p-6">
            <AlertCircle className="h-5 w-5" /> {error}
          </div>
        ) : tenants.length === 0 ? (
          <EmptyState icon={Building2} title="No tenants found" description="Tenants will appear here once they sign up." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Tenant</th>
                <th className="text-left px-4 py-3">Subdomain</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="text-right px-4 py-3">Since</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.subdomain}</td>
                  <td className="px-4 py-3 text-slate-600">{t.plan_name ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={t.subscription_status} /></td>
                  <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate" title={t.notes}>
                    {t.notes || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Edit tenant"
                      onClick={() => setEditTarget(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TenantEditModal
        open={!!editTarget}
        tenant={editTarget}
        plans={plans}
        onClose={() => setEditTarget(null)}
        onSaved={() => { load(); setEditTarget(null) }}
      />
    </>
  )
}
