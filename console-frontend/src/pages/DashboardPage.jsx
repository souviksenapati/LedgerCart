import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, TrendingUp, AlertCircle, Package, ArrowRight } from 'lucide-react'
import { dashboardAPI } from '../api'
import { PageHeader, LoadingSpinner, StatusBadge } from '../components/UI'

function StatCard({ label, value, icon: Icon, color = 'amber' }) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    dashboardAPI
      .get()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-4 border border-red-200">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  const { tenant_stats, plan_distribution, recent_tenants, mrr } = data

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of all LedgerCart tenants and subscriptions"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tenants" value={tenant_stats?.total} icon={Building2} color="amber" />
        <StatCard label="Active" value={tenant_stats?.active} icon={Users} color="green" />
        <StatCard label="Trial" value={tenant_stats?.trial} icon={TrendingUp} color="blue" />
        <StatCard label="Suspended" value={tenant_stats?.suspended} icon={AlertCircle} color="red" />
      </div>

      {/* MRR */}
      {mrr !== undefined && (
        <div className="card p-5 mb-8 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              ₹{Number(mrr ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-slate-500">Monthly Recurring Revenue (active plans)</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan distribution */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-500" />
              Plan Distribution
            </h2>
            <Link to="/plans" className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
              Manage plans <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {plan_distribution?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wide">
                  <th className="text-left pb-2">Plan</th>
                  <th className="text-right pb-2">Tenants</th>
                  <th className="text-right pb-2">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan_distribution.map((row) => (
                  <tr key={row.plan_name}>
                    <td className="py-2 font-medium text-slate-700">{row.plan_name}</td>
                    <td className="py-2 text-right text-slate-600">{row.tenant_count}</td>
                    <td className="py-2 text-right text-slate-600">
                      ₹{Number(row.mrr ?? 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No plans yet</p>
          )}
        </div>

        {/* Recent tenants */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              Recent Tenants
            </h2>
            <Link to="/tenants" className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recent_tenants?.length ? (
            <div className="space-y-2">
              {recent_tenants.map((t) => (
                <div key={t.id} className="flex items-start justify-between py-1.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.subdomain} &bull; {t.plan_name ?? 'No plan'}</p>
                  </div>
                  <StatusBadge status={t.subscription_status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No tenants yet</p>
          )}
        </div>
      </div>
    </>
  )
}
