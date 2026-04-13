import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, AlertCircle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { plansAPI } from '../api'
import { PageHeader, LoadingSpinner, EmptyState, Modal } from '../components/UI'

// ─── Feature registry grouped for the checkbox grid ────────────────────────
const FEATURE_GROUPS = [
  {
    group: 'CORE',
    keys: ['dashboard:view', 'products:view', 'products:manage', 'categories:manage', 'inventory:view', 'inventory:manage'],
  },
  {
    group: 'PURCHASES',
    keys: ['purchases:view', 'purchases:manage', 'grn:view', 'grn:manage', 'suppliers:view', 'suppliers:manage'],
  },
  {
    group: 'B2B SALES',
    keys: ['sales_orders:view', 'sales_orders:manage', 'sales_invoices:view', 'sales_invoices:manage', 'sales_quotations:view', 'sales_quotations:manage'],
  },
  {
    group: 'E-COMMERCE',
    keys: ['store:view', 'cart:manage', 'orders:view', 'orders:manage'],
  },
  {
    group: 'ADVANCED',
    keys: ['reports:view', 'coupons:manage', 'banners:manage', 'reviews:manage'],
  },
  {
    group: 'ENTERPRISE',
    keys: ['b2b_customers:view', 'b2b_customers:manage', 'staff:manage', 'warehouses:manage'],
  },
]

const ALL_KEYS = FEATURE_GROUPS.flatMap((g) => g.keys)

function shortKey(key) {
  return key.split(':').map((p) => p.replace(/_/g, ' ')).join(' → ')
}

// ─── Feature Checkbox Grid ─────────────────────────────────────────────────
function FeatureGrid({ selected, onChange }) {
  const toggle = (key) => {
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    )
  }
  const selectGroup = (keys) => {
    const merged = Array.from(new Set([...selected, ...keys]))
    onChange(merged)
  }
  const deselectGroup = (keys) => {
    onChange(selected.filter((k) => !keys.includes(k)))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => onChange([...ALL_KEYS])}>
          Select all
        </button>
        <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => onChange([])}>
          Clear all
        </button>
      </div>
      {FEATURE_GROUPS.map(({ group, keys }) => (
        <div key={group} className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group}</span>
            <div className="flex gap-2">
              <button type="button" className="text-xs text-amber-600 hover:underline" onClick={() => selectGroup(keys)}>
                All
              </button>
              <button type="button" className="text-xs text-slate-400 hover:underline" onClick={() => deselectGroup(keys)}>
                None
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            {keys.map((key) => (
              <div key={key} className="feature-cell">
                <input
                  type="checkbox"
                  id={`feat-${key}`}
                  checked={selected.includes(key)}
                  onChange={() => toggle(key)}
                />
                <label htmlFor={`feat-${key}`} className="text-xs text-slate-600 select-none cursor-pointer capitalize">
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

// ─── Plan Form Modal ───────────────────────────────────────────────────────
function PlanModal({ open, onClose, initial, onSaved }) {
  const isEdit = !!initial?.id
  const empty = {
    name: '', slug: '', price_monthly: '', price_yearly: '',
    max_users: '', max_products: '', is_active: true, sort_order: 0, features: [],
  }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              ...initial,
              price_monthly: initial.price_monthly ?? '',
              price_yearly: initial.price_yearly ?? '',
              max_users: initial.max_users ?? '',
              max_products: initial.max_products ?? '',
              features: Array.isArray(initial.features) ? initial.features : [],
            }
          : empty
      )
    }
  }, [open, initial])  // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const autoSlug = (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    set('name', name)
    if (!isEdit) set('slug', slug)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        price_monthly: form.price_monthly === '' ? null : Number(form.price_monthly),
        price_yearly: form.price_yearly === '' ? null : Number(form.price_yearly),
        max_users: form.max_users === '' ? null : Number(form.max_users),
        max_products: form.max_products === '' ? null : Number(form.max_products),
        sort_order: Number(form.sort_order) || 0,
        features: form.features,
      }
      if (isEdit) {
        await plansAPI.update(initial.id, payload)
      } else {
        await plansAPI.create(payload)
      }
      toast.success(isEdit ? 'Plan updated' : 'Plan created')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Plan' : 'Create Plan'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name + Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => autoSlug(e.target.value)} placeholder="Starter" />
          </div>
          <div>
            <label className="label">Slug *</label>
            <input className="input" required value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="starter" />
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Monthly price (₹)</label>
            <input className="input" type="number" min="0" value={form.price_monthly} onChange={(e) => set('price_monthly', e.target.value)} placeholder="999" />
          </div>
          <div>
            <label className="label">Yearly price (₹)</label>
            <input className="input" type="number" min="0" value={form.price_yearly} onChange={(e) => set('price_yearly', e.target.value)} placeholder="9999" />
          </div>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Max users</label>
            <input className="input" type="number" min="1" value={form.max_users} onChange={(e) => set('max_users', e.target.value)} placeholder="5" />
          </div>
          <div>
            <label className="label">Max products</label>
            <input className="input" type="number" min="1" value={form.max_products} onChange={(e) => set('max_products', e.target.value)} placeholder="500" />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input className="input" type="number" min="0" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
          </div>
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          <span className="text-sm text-slate-700">Active (visible to tenants)</span>
        </label>

        {/* Features */}
        <div>
          <label className="label mb-2">Features ({form.features.length} selected)</label>
          <FeatureGrid selected={form.features} onChange={(f) => set('features', f)} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-console" disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : isEdit ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState({ open: false, plan: null })
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    plansAPI
      .list()
      .then((res) => setPlans(res.data))
      .catch((err) => setError(err.response?.data?.detail ?? 'Failed to load plans'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return
    setDeleting(plan.id)
    try {
      await plansAPI.delete(plan.id)
      toast.success('Plan deleted')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Failed to delete plan')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader title="Plans" subtitle="Subscription plans offered to LedgerCart clients">
        <button className="btn-console" onClick={() => setModal({ open: true, plan: null })}>
          <Plus className="h-4 w-4" /> New plan
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 p-6">
            <AlertCircle className="h-5 w-5" /> {error}
          </div>
        ) : plans.length === 0 ? (
          <EmptyState icon={Package} title="No plans yet" description="Create your first subscription plan to get started." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-right px-4 py-3">Monthly</th>
                <th className="text-right px-4 py-3">Yearly</th>
                <th className="text-right px-4 py-3">Users</th>
                <th className="text-right px-4 py-3">Products</th>
                <th className="text-center px-4 py-3">Features</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{plan.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{plan.slug}</td>
                  <td className="px-4 py-3 text-right">
                    {plan.price_monthly != null ? `₹${Number(plan.price_monthly).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {plan.price_yearly != null ? `₹${Number(plan.price_yearly).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">{plan.max_users ?? '∞'}</td>
                  <td className="px-4 py-3 text-right">{plan.max_products ?? '∞'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge bg-slate-100 text-slate-600">
                      {Array.isArray(plan.features) ? plan.features.length : 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${plan.is_active ? 'badge-active' : 'bg-slate-100 text-slate-500'}`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Edit plan"
                        onClick={() => setModal({ open: true, plan })}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete plan"
                        disabled={deleting === plan.id}
                        onClick={() => handleDelete(plan)}
                      >
                        {deleting === plan.id ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PlanModal
        open={modal.open}
        onClose={() => setModal({ open: false, plan: null })}
        initial={modal.plan}
        onSaved={load}
      />
    </>
  )
}
