import { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { adminAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    setLoading(true);
    adminAPI.salesReport({ period })
      .then(r => setReport(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-full text-sm capitalize font-medium transition-colors ${period === p ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: `₹${(report?.total_revenue || 0).toLocaleString()}`, color: 'text-green-600' },
          { label: 'Total Orders', value: report?.total_orders || 0, color: 'text-blue-600' },
          { label: 'Avg Order Value', value: `₹${(report?.avg_order_value || 0).toLocaleString()}`, color: 'text-purple-600' },
          { label: 'Items Sold', value: report?.total_items_sold || 0, color: 'text-primary-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold mb-4">Top Selling Products</h2>
          {report?.top_products?.length > 0 ? (
            <div className="space-y-3">
              {report.top_products.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-bold">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.quantity_sold} sold</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">₹{(p.revenue || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No data available</p>}
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold mb-4">Revenue by Category</h2>
          {report?.category_revenue?.length > 0 ? (
            <div className="space-y-3">
              {report.category_revenue.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.order_count} orders</p>
                  </div>
                  <span className="text-sm font-medium">₹{(c.revenue || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No data available</p>}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold mb-4">Order Status Breakdown</h2>
          {report?.order_status_breakdown?.length > 0 ? (
            <div className="space-y-2">
              {report.order_status_breakdown.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${s.status === 'delivered' ? 'bg-green-500' :
                      s.status === 'cancelled' ? 'bg-red-500' :
                        s.status === 'shipped' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`} />
                    <span className="text-sm capitalize">{s.status}</span>
                  </div>
                  <span className="text-sm font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No data available</p>}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold mb-4">Payment Methods</h2>
          {report?.payment_methods?.length > 0 ? (
            <div className="space-y-2">
              {report.payment_methods.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{p.method}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">{p.count} orders</span>
                    <span className="text-xs text-gray-400 ml-2">₹{(p.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No data available</p>}
        </div>
      </div>
    </div>
  );
}
